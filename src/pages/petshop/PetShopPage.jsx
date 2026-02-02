// src/pages/petshop/PetShopPage.jsx
import { useMemo, useState } from "react";
import { useApiResource } from "../../hooks/useApiResource";
import { apiRequest } from "../../services/apiClient";
import Modal from "../../components/ui/Modal";
import "../../styles/petshop.css";

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatCurrency(value) {
  if (value === null || value === undefined || value === "") return "-";
  return `$${Number(value).toLocaleString("es-AR")}`;
}

function formatDateDisplay(value) {
  if (!value) return "-";
  const raw = String(value).split("T")[0];
  const [yyyy, mm, dd] = raw.split("-");
  if (!yyyy || !mm || !dd) return value;
  return `${dd}-${mm}-${yyyy}`;
}

function toNumber(value, fallback = 0) {
  const num = Number(value);
  if (Number.isNaN(num)) return fallback;
  return num;
}

export default function PetShopPage() {
  const [activeTab, setActiveTab] = useState("sales");

  const { items: paymentMethods } = useApiResource("/v2/payment-methods");

  const {
    items: products,
    loading: productsLoading,
    error: productsError,
    createItem: createProduct,
    updateItem: updateProduct,
    deleteItem: deleteProduct,
    refresh: refreshProducts,
  } = useApiResource("/v2/petshop/products");

  const [productForm, setProductForm] = useState({
    name: "",
    sku: "",
    cost: "",
    price: "",
    stock: "",
    stock_min: "",
  });
  const [editingProductId, setEditingProductId] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isEditingProductModal, setIsEditingProductModal] = useState(false);
  const [productModalForm, setProductModalForm] = useState({
    name: "",
    sku: "",
    cost: "",
    price: "",
    stock: "",
    stock_min: "",
  });

  const [salesFilters, setSalesFilters] = useState(() => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    return {
      from: `${yyyy}-${mm}-01`,
      to: now.toISOString().slice(0, 10),
    };
  });
  const {
    items: sales,
    loading: salesLoading,
    error: salesError,
    refresh: refreshSales,
  } = useApiResource("/v2/petshop/sales", salesFilters);

  const [saleForm, setSaleForm] = useState({
    date: todayISO(),
    payment_method_id: "",
    notes: "",
  });
  const [saleItems, setSaleItems] = useState([
    { product_id: "", quantity: 1, unit_price: "" },
  ]);
  const [saleSubmitting, setSaleSubmitting] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);

  const [stockFilters, setStockFilters] = useState(() => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    return {
      from: `${yyyy}-${mm}-01`,
      to: now.toISOString().slice(0, 10),
    };
  });
  const {
    items: stockMovements,
    loading: stockLoading,
    error: stockError,
    createItem: createStockMovement,
    refresh: refreshStock,
  } = useApiResource("/v2/petshop/stock-movements", stockFilters);
  const [stockForm, setStockForm] = useState({
    date: todayISO(),
    product_id: "",
    type: "in",
    quantity: "",
    note: "",
  });
  const [stockSubmitting, setStockSubmitting] = useState(false);

  const saleTotal = useMemo(
    () =>
      saleItems.reduce(
        (sum, item) => sum + toNumber(item.quantity) * toNumber(item.unit_price),
        0
      ),
    [saleItems]
  );

  const salesCount = sales.length;
  const salesRevenue = sales.reduce((sum, sale) => sum + toNumber(sale.total), 0);

  const lowStockProducts = products.filter(
    (product) => toNumber(product.stock) <= toNumber(product.stock_min)
  );

  function resetProductForm() {
    setProductForm({
      name: "",
      sku: "",
      cost: "",
      price: "",
      stock: "",
      stock_min: "",
    });
    setEditingProductId(null);
  }

  function openProductModal(product) {
    setSelectedProduct(product);
    setProductModalForm({
      name: product.name || "",
      sku: product.sku || "",
      cost: product.cost !== null && product.cost !== undefined ? String(product.cost) : "",
      price:
        product.price !== null && product.price !== undefined ? String(product.price) : "",
      stock:
        product.stock !== null && product.stock !== undefined ? String(product.stock) : "",
      stock_min:
        product.stock_min !== null && product.stock_min !== undefined
          ? String(product.stock_min)
          : "",
    });
    setIsEditingProductModal(false);
  }

  async function handleProductSubmit(e) {
    e.preventDefault();
    if (!productForm.name.trim()) {
      alert("Ingresá el nombre del producto.");
      return;
    }
    if (!productForm.price) {
      alert("Ingresá el precio de venta.");
      return;
    }

    const payload = {
      name: productForm.name.trim(),
      sku: productForm.sku.trim() || null,
      cost: toNumber(productForm.cost, 0),
      price: toNumber(productForm.price, 0),
      stock: toNumber(productForm.stock, 0),
      stock_min: toNumber(productForm.stock_min, 0),
    };

    try {
      if (editingProductId) {
        await updateProduct(editingProductId, payload);
      } else {
        await createProduct(payload);
      }
      resetProductForm();
      await refreshProducts();
    } catch (err) {
      alert(err.message || "No se pudo guardar el producto.");
    }
  }

  async function handleProductDelete(productId) {
    const ok = window.confirm("¿Eliminar este producto?");
    if (!ok) return;
    try {
      await deleteProduct(productId);
      await refreshProducts();
    } catch (err) {
      alert(err.message || "No se pudo eliminar el producto.");
    }
  }

  async function handleProductModalSave() {
    if (!selectedProduct) return;
    if (!productModalForm.name.trim()) {
      alert("Ingresá el nombre del producto.");
      return;
    }
    if (!productModalForm.price) {
      alert("Ingresá el precio de venta.");
      return;
    }
    const payload = {
      name: productModalForm.name.trim(),
      sku: productModalForm.sku.trim() || null,
      cost: toNumber(productModalForm.cost, 0),
      price: toNumber(productModalForm.price, 0),
      stock: toNumber(productModalForm.stock, 0),
      stock_min: toNumber(productModalForm.stock_min, 0),
    };
    try {
      await updateProduct(selectedProduct.id, payload);
      await refreshProducts();
      setSelectedProduct((prev) => (prev ? { ...prev, ...payload } : prev));
      setIsEditingProductModal(false);
    } catch (err) {
      alert(err.message || "No se pudo actualizar el producto.");
    }
  }

  function startEditProduct(product) {
    setProductForm({
      name: product.name || "",
      sku: product.sku || "",
      cost: product.cost !== null && product.cost !== undefined ? String(product.cost) : "",
      price:
        product.price !== null && product.price !== undefined ? String(product.price) : "",
      stock:
        product.stock !== null && product.stock !== undefined ? String(product.stock) : "",
      stock_min:
        product.stock_min !== null && product.stock_min !== undefined
          ? String(product.stock_min)
          : "",
    });
    setEditingProductId(product.id);
  }

  function updateSaleItem(index, next) {
    setSaleItems((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, ...next } : item))
    );
  }

  function handleSaleItemProduct(index, productId) {
    const product = products.find((p) => String(p.id) === String(productId));
    updateSaleItem(index, {
      product_id: productId,
      unit_price:
        product && product.price !== null && product.price !== undefined
          ? String(product.price)
          : "",
    });
  }

  async function handleSaleSubmit(e) {
    e.preventDefault();
    if (!saleForm.payment_method_id) {
      alert("Seleccioná un método de pago.");
      return;
    }
    if (!saleItems.length) {
      alert("Agregá al menos un producto.");
      return;
    }
    const invalid = saleItems.some(
      (item) => !item.product_id || toNumber(item.quantity) <= 0
    );
    if (invalid) {
      alert("Completá producto y cantidad en cada ítem.");
      return;
    }
    setSaleSubmitting(true);
    try {
      const payload = {
        date: saleForm.date,
        payment_method_id: saleForm.payment_method_id,
        notes: saleForm.notes.trim(),
        total: saleTotal,
        items: saleItems.map((item) => ({
          product_id: item.product_id,
          quantity: toNumber(item.quantity, 1),
          unit_price: toNumber(item.unit_price, 0),
        })),
      };
      await apiRequest("/v2/petshop/sales", { method: "POST", body: payload });
      setSaleForm({
        date: todayISO(),
        payment_method_id: "",
        notes: "",
      });
      setSaleItems([{ product_id: "", quantity: 1, unit_price: "" }]);
      await refreshSales();
      await refreshProducts();
    } catch (err) {
      alert(err.message || "No se pudo registrar la venta.");
    } finally {
      setSaleSubmitting(false);
    }
  }

  async function handleStockSubmit(e) {
    e.preventDefault();
    if (!stockForm.product_id) {
      alert("Seleccioná un producto.");
      return;
    }
    if (!stockForm.quantity || toNumber(stockForm.quantity) <= 0) {
      alert("Ingresá una cantidad válida.");
      return;
    }
    setStockSubmitting(true);
    try {
      const payload = {
        date: stockForm.date,
        product_id: stockForm.product_id,
        type: stockForm.type,
        quantity: toNumber(stockForm.quantity),
        note: stockForm.note.trim() || null,
      };
      await createStockMovement(payload);
      setStockForm({
        date: todayISO(),
        product_id: "",
        type: "in",
        quantity: "",
        note: "",
      });
      await refreshStock();
      await refreshProducts();
    } catch (err) {
      alert(err.message || "No se pudo registrar el movimiento.");
    } finally {
      setStockSubmitting(false);
    }
  }

  function formatProductName(productId) {
    const product = products.find((p) => String(p.id) === String(productId));
    return product?.name || "-";
  }

  function formatPaymentMethod(id) {
    const method = paymentMethods.find((m) => String(m.id) === String(id));
    return method?.name || "-";
  }

  function getSaleTitle(sale) {
    if (!sale.items?.length) return "Venta";
    const first = formatProductName(sale.items[0].product_id);
    if (sale.items.length === 1) return first;
    return `${first} +${sale.items.length - 1}`;
  }

  function getSaleQuantity(sale) {
    return sale.items?.reduce((sum, item) => sum + toNumber(item.quantity, 0), 0) || 0;
  }

  return (
    <div className="page-content petshop-page">
      <header className="page-header">
        <div>
          <h1 className="page-title">PetShop</h1>
          <p className="page-subtitle">
            Ventas, productos y control de stock del local.
          </p>
        </div>
      </header>

      <div className="card petshop-tabs">
        <div className="services-tabs">
          <button
            type="button"
            className={activeTab === "sales" ? "tab tab--active" : "tab"}
            onClick={() => setActiveTab("sales")}
          >
            Ventas
          </button>
          <button
            type="button"
            className={activeTab === "products" ? "tab tab--active" : "tab"}
            onClick={() => setActiveTab("products")}
          >
            Productos
          </button>
          <button
            type="button"
            className={activeTab === "stock" ? "tab tab--active" : "tab"}
            onClick={() => setActiveTab("stock")}
          >
            Stock
          </button>
        </div>
      </div>

      {activeTab === "sales" ? (
        <>
          <div className="petshop-summary">
            <div className="petshop-kpi card">
              <span>Ventas en período</span>
              <strong>{salesCount}</strong>
            </div>
            <div className="petshop-kpi card">
              <span>Total vendido</span>
              <strong>{formatCurrency(salesRevenue)}</strong>
            </div>
            <div className="petshop-kpi card">
              <span>Stock crítico</span>
              <strong>{lowStockProducts.length}</strong>
            </div>
          </div>

          <form className="form-card" onSubmit={handleSaleSubmit}>
            <h2 className="card-title">Nueva venta</h2>
            <p className="card-subtitle">
              Registrá ventas de productos físicos y ajustá el stock.
            </p>
            <div className="form-grid">
              <div className="form-field">
                <label htmlFor="sale_date">Fecha</label>
                <input
                  id="sale_date"
                  type="date"
                  value={saleForm.date}
                  onChange={(e) =>
                    setSaleForm((prev) => ({ ...prev, date: e.target.value }))
                  }
                />
              </div>
              <div className="form-field">
                <label htmlFor="sale_payment">Método de pago</label>
                <select
                  id="sale_payment"
                  value={saleForm.payment_method_id}
                  onChange={(e) =>
                    setSaleForm((prev) => ({
                      ...prev,
                      payment_method_id: e.target.value,
                    }))
                  }
                  required
                >
                  <option value="">Seleccioná</option>
                  {paymentMethods.map((method) => (
                    <option key={method.id} value={method.id}>
                      {method.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-field form-field--full">
                <label htmlFor="sale_notes">Notas</label>
                <textarea
                  id="sale_notes"
                  rows={3}
                  value={saleForm.notes}
                  onChange={(e) =>
                    setSaleForm((prev) => ({ ...prev, notes: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="petshop-items">
              <div className="petshop-items__header">
                <span>Productos</span>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() =>
                    setSaleItems((prev) => [
                      ...prev,
                      { product_id: "", quantity: 1, unit_price: "" },
                    ])
                  }
                >
                  + Agregar item
                </button>
              </div>
              {saleItems.map((item, index) => (
                <div key={`${index}-${item.product_id}`} className="petshop-item-row">
                  <select
                    value={item.product_id}
                    onChange={(e) => handleSaleItemProduct(index, e.target.value)}
                  >
                    <option value="">Producto</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) =>
                      updateSaleItem(index, { quantity: e.target.value })
                    }
                  />
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={item.unit_price}
                    onChange={(e) =>
                      updateSaleItem(index, { unit_price: e.target.value })
                    }
                  />
                  <span className="petshop-item-row__total">
                    {formatCurrency(
                      toNumber(item.quantity) * toNumber(item.unit_price)
                    )}
                  </span>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() =>
                      setSaleItems((prev) => prev.filter((_, idx) => idx !== index))
                    }
                  >
                    Quitar
                  </button>
                </div>
              ))}
              <div className="petshop-items__footer">
                <span>Total</span>
                <strong>{formatCurrency(saleTotal)}</strong>
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-primary" disabled={saleSubmitting}>
                {saleSubmitting ? "Guardando..." : "Registrar venta"}
              </button>
            </div>
          </form>

          <div className="card">
            <div className="petshop-list__header">
              <div>
                <h2 className="card-title">Ventas registradas</h2>
                <p className="card-subtitle">
                  Período: {salesFilters.from} → {salesFilters.to}
                </p>
              </div>
              <div className="petshop-date-range">
                <input
                  type="date"
                  value={salesFilters.from}
                  onChange={(e) =>
                    setSalesFilters((prev) => ({ ...prev, from: e.target.value }))
                  }
                />
                <input
                  type="date"
                  value={salesFilters.to}
                  onChange={(e) =>
                    setSalesFilters((prev) => ({ ...prev, to: e.target.value }))
                  }
                />
              </div>
            </div>

            {salesError && <div className="petshop-error">{salesError}</div>}
            {salesLoading ? (
              <div className="card-subtitle">Cargando ventas...</div>
            ) : sales.length === 0 ? (
              <div className="card-subtitle">Sin ventas registradas.</div>
            ) : (
              <div className="services-list">
                {sales.map((sale) => (
                  <div
                    key={sale.id}
                    className="service-item petshop-clickable"
                    onClick={() => setSelectedSale(sale)}
                  >
                    <div className="service-item__body">
                      <div className="service-item__title">
                        {getSaleTitle(sale)}
                      </div>
                      <div className="service-item__meta">
                        <span>{formatDateDisplay(sale.date)}</span>
                        <span>{getSaleQuantity(sale)} u.</span>
                        <span>{formatPaymentMethod(sale.payment_method_id)}</span>
                      </div>
                      {sale.notes ? (
                        <div className="service-item__badges">
                          <span className="service-badge">{sale.notes}</span>
                        </div>
                      ) : null}
                    </div>
                    <div className="service-item__side">
                      <div className="service-item__price">
                        {formatCurrency(sale.total)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Modal
            isOpen={Boolean(selectedSale)}
            onClose={() => setSelectedSale(null)}
            title="Detalle de venta"
          >
            {selectedSale && (
              <>
                <div className="petshop-detail">
                  <div>
                    <strong>Fecha:</strong> {formatDateDisplay(selectedSale.date)}
                  </div>
                  <div>
                    <strong>Método de pago:</strong>{" "}
                    {formatPaymentMethod(selectedSale.payment_method_id)}
                  </div>
                  <div>
                    <strong>Total:</strong> {formatCurrency(selectedSale.total)}
                  </div>
                  <div>
                    <strong>Notas:</strong> {selectedSale.notes || "-"}
                  </div>
                </div>
                {selectedSale.items?.length ? (
                  <div className="table-wrapper">
                    <table className="table table--compact">
                      <thead>
                        <tr>
                          <th>Producto</th>
                          <th>Cantidad</th>
                          <th>Precio</th>
                          <th>Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedSale.items.map((item) => (
                          <tr key={item.id || `${item.product_id}-${item.quantity}`}>
                            <td>{formatProductName(item.product_id)}</td>
                            <td>{item.quantity}</td>
                            <td>{formatCurrency(item.unit_price)}</td>
                            <td>
                              {formatCurrency(
                                toNumber(item.quantity) * toNumber(item.unit_price)
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </>
            )}
          </Modal>
        </>
      ) : null}

      {activeTab === "products" ? (
        <>
          <form className="form-card" onSubmit={handleProductSubmit}>
            <h2 className="card-title">
              {editingProductId ? "Editar producto" : "Nuevo producto"}
            </h2>
            <p className="card-subtitle">
              Registrá productos, precios y stock mínimo.
            </p>
            <div className="form-grid">
              <div className="form-field">
                <label htmlFor="product_name">Nombre</label>
                <input
                  id="product_name"
                  type="text"
                  value={productForm.name}
                  onChange={(e) =>
                    setProductForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="form-field">
                <label htmlFor="product_sku">SKU / Código</label>
                <input
                  id="product_sku"
                  type="text"
                  value={productForm.sku}
                  onChange={(e) =>
                    setProductForm((prev) => ({ ...prev, sku: e.target.value }))
                  }
                />
              </div>
              <div className="form-field">
                <label htmlFor="product_cost">Costo</label>
                <input
                  id="product_cost"
                  type="number"
                  min="0"
                  step="100"
                  value={productForm.cost}
                  onChange={(e) =>
                    setProductForm((prev) => ({ ...prev, cost: e.target.value }))
                  }
                />
              </div>
              <div className="form-field">
                <label htmlFor="product_price">Precio</label>
                <input
                  id="product_price"
                  type="number"
                  min="0"
                  step="100"
                  value={productForm.price}
                  onChange={(e) =>
                    setProductForm((prev) => ({ ...prev, price: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="form-field">
                <label htmlFor="product_stock">Stock actual</label>
                <input
                  id="product_stock"
                  type="number"
                  min="0"
                  value={productForm.stock}
                  onChange={(e) =>
                    setProductForm((prev) => ({ ...prev, stock: e.target.value }))
                  }
                />
              </div>
              <div className="form-field">
                <label htmlFor="product_stock_min">Stock mínimo</label>
                <input
                  id="product_stock_min"
                  type="number"
                  min="0"
                  value={productForm.stock_min}
                  onChange={(e) =>
                    setProductForm((prev) => ({
                      ...prev,
                      stock_min: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn-primary">
                {editingProductId ? "Guardar cambios" : "Guardar producto"}
              </button>
              {editingProductId ? (
                <button type="button" className="btn-secondary" onClick={resetProductForm}>
                  Cancelar
                </button>
              ) : null}
            </div>
          </form>

          <div className="card">
            <h2 className="card-title">Productos cargados</h2>
            <p className="card-subtitle">
              Stock crítico: {lowStockProducts.length} productos.
            </p>
            {productsError && <div className="petshop-error">{productsError}</div>}
            {productsLoading ? (
              <div className="card-subtitle">Cargando productos...</div>
            ) : products.length === 0 ? (
              <div className="card-subtitle">Sin productos cargados.</div>
            ) : (
              <div className="services-list">
                {products.map((product) => (
                  <div
                    key={product.id}
                    className="service-item petshop-clickable"
                    onClick={() => openProductModal(product)}
                  >
                    <div className="service-item__body">
                      <div className="service-item__title">{product.name}</div>
                      <div className="service-item__meta">
                        <span>SKU: {product.sku || "-"}</span>
                        <span>Stock: {product.stock ?? 0}</span>
                        <span>Mín: {product.stock_min ?? 0}</span>
                      </div>
                    </div>
                    <div className="service-item__side">
                      <div className="service-item__price">
                        {formatCurrency(product.price)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : null}

      {activeTab === "stock" ? (
        <>
          <form className="form-card" onSubmit={handleStockSubmit}>
            <h2 className="card-title">Movimiento de stock</h2>
            <p className="card-subtitle">
              Registrá ingresos, ventas manuales o ajustes.
            </p>
            <div className="form-grid">
              <div className="form-field">
                <label htmlFor="stock_date">Fecha</label>
                <input
                  id="stock_date"
                  type="date"
                  value={stockForm.date}
                  onChange={(e) =>
                    setStockForm((prev) => ({ ...prev, date: e.target.value }))
                  }
                />
              </div>
              <div className="form-field">
                <label htmlFor="stock_product">Producto</label>
                <select
                  id="stock_product"
                  value={stockForm.product_id}
                  onChange={(e) =>
                    setStockForm((prev) => ({
                      ...prev,
                      product_id: e.target.value,
                    }))
                  }
                  required
                >
                  <option value="">Seleccioná</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <label htmlFor="stock_type">Tipo</label>
                <select
                  id="stock_type"
                  value={stockForm.type}
                  onChange={(e) =>
                    setStockForm((prev) => ({ ...prev, type: e.target.value }))
                  }
                >
                  <option value="in">Entrada</option>
                  <option value="out">Salida</option>
                  <option value="adjust">Ajuste</option>
                </select>
              </div>
              <div className="form-field">
                <label htmlFor="stock_qty">Cantidad</label>
                <input
                  id="stock_qty"
                  type="number"
                  min="1"
                  value={stockForm.quantity}
                  onChange={(e) =>
                    setStockForm((prev) => ({
                      ...prev,
                      quantity: e.target.value,
                    }))
                  }
                  required
                />
              </div>
              <div className="form-field form-field--full">
                <label htmlFor="stock_note">Motivo / Nota</label>
                <input
                  id="stock_note"
                  type="text"
                  value={stockForm.note}
                  onChange={(e) =>
                    setStockForm((prev) => ({ ...prev, note: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn-primary" disabled={stockSubmitting}>
                {stockSubmitting ? "Guardando..." : "Registrar movimiento"}
              </button>
            </div>
          </form>

          <div className="card">
            <div className="petshop-list__header">
              <div>
                <h2 className="card-title">Historial de stock</h2>
                <p className="card-subtitle">
                  Período: {stockFilters.from} → {stockFilters.to}
                </p>
              </div>
              <div className="petshop-date-range">
                <input
                  type="date"
                  value={stockFilters.from}
                  onChange={(e) =>
                    setStockFilters((prev) => ({ ...prev, from: e.target.value }))
                  }
                />
                <input
                  type="date"
                  value={stockFilters.to}
                  onChange={(e) =>
                    setStockFilters((prev) => ({ ...prev, to: e.target.value }))
                  }
                />
              </div>
            </div>

            {stockError && <div className="petshop-error">{stockError}</div>}
            {stockLoading ? (
              <div className="card-subtitle">Cargando movimientos...</div>
            ) : (
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Producto</th>
                      <th>Tipo</th>
                      <th>Cantidad</th>
                      <th>Nota</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stockMovements.map((movement) => (
                      <tr key={movement.id}>
                        <td>{movement.date}</td>
                        <td>{formatProductName(movement.product_id)}</td>
                        <td>{movement.type}</td>
                        <td>{movement.quantity}</td>
                        <td>{movement.note || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : null}

      <Modal
        isOpen={Boolean(selectedProduct)}
        onClose={() => setSelectedProduct(null)}
        title="Detalle del producto"
      >
        {selectedProduct && (
          <>
            {isEditingProductModal ? (
              <>
                <label className="form-field">
                  <span>Nombre</span>
                  <input
                    type="text"
                    value={productModalForm.name}
                    onChange={(e) =>
                      setProductModalForm((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                  />
                </label>
                <label className="form-field">
                  <span>SKU</span>
                  <input
                    type="text"
                    value={productModalForm.sku}
                    onChange={(e) =>
                      setProductModalForm((prev) => ({
                        ...prev,
                        sku: e.target.value,
                      }))
                    }
                  />
                </label>
                <label className="form-field">
                  <span>Costo</span>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={productModalForm.cost}
                    onChange={(e) =>
                      setProductModalForm((prev) => ({
                        ...prev,
                        cost: e.target.value,
                      }))
                    }
                  />
                </label>
                <label className="form-field">
                  <span>Precio</span>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={productModalForm.price}
                    onChange={(e) =>
                      setProductModalForm((prev) => ({
                        ...prev,
                        price: e.target.value,
                      }))
                    }
                  />
                </label>
                <label className="form-field">
                  <span>Stock</span>
                  <input
                    type="number"
                    min="0"
                    value={productModalForm.stock}
                    onChange={(e) =>
                      setProductModalForm((prev) => ({
                        ...prev,
                        stock: e.target.value,
                      }))
                    }
                  />
                </label>
                <label className="form-field">
                  <span>Stock mínimo</span>
                  <input
                    type="number"
                    min="0"
                    value={productModalForm.stock_min}
                    onChange={(e) =>
                      setProductModalForm((prev) => ({
                        ...prev,
                        stock_min: e.target.value,
                      }))
                    }
                  />
                </label>
              </>
            ) : (
              <div className="petshop-detail">
                <div>
                  <strong>Nombre:</strong> {selectedProduct.name}
                </div>
                <div>
                  <strong>SKU:</strong> {selectedProduct.sku || "-"}
                </div>
                <div>
                  <strong>Costo:</strong> {formatCurrency(selectedProduct.cost)}
                </div>
                <div>
                  <strong>Precio:</strong> {formatCurrency(selectedProduct.price)}
                </div>
                <div>
                  <strong>Stock:</strong> {selectedProduct.stock ?? 0}
                </div>
                <div>
                  <strong>Stock mínimo:</strong> {selectedProduct.stock_min ?? 0}
                </div>
              </div>
            )}
            <div className="modal-actions">
              {isEditingProductModal ? (
                <>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setIsEditingProductModal(false)}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={handleProductModalSave}
                  >
                    Guardar cambios
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => setIsEditingProductModal(true)}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className="btn-danger"
                    onClick={async () => {
                      await handleProductDelete(selectedProduct.id);
                      setSelectedProduct(null);
                    }}
                  >
                    Eliminar
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
