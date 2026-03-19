// src/pages/petshop/PetShopPage.jsx
import { useEffect, useMemo, useState } from "react";
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
  return `${dd}/${mm}/${yyyy}`;
}

function getDateKey(value) {
  if (!value) return "";
  return String(value).split("T")[0];
}

function formatDateLabel(dateKey) {
  if (!dateKey) return "-";
  const [yyyy, mm, dd] = String(dateKey).split("-");
  if (!yyyy || !mm || !dd) return dateKey;
  return `${dd}/${mm}/${yyyy}`;
}

function toNumber(value, fallback = 0) {
  const num = Number(value);
  if (Number.isNaN(num)) return fallback;
  return num;
}

export default function PetShopPage() {
  const [activeTab, setActiveTab] = useState("sales");
  const [productSearch, setProductSearch] = useState("");
  const [productSort, setProductSort] = useState({ col: "name", dir: "asc" });
  const [showOnlyCritical, setShowOnlyCritical] = useState(false);

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
    { product_id: "", quantity: 1, unit_price: "", nameSearch: "", skuSearch: "" },
  ]);
  const [openCombo, setOpenCombo] = useState(null); // { index, type: "name"|"sku" }
  const [saleSubmitting, setSaleSubmitting] = useState(false);
  const [saleSuccess, setSaleSuccess] = useState(false);
  const [saleError, setSaleError] = useState("");
  const [totalBump, setTotalBump] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [isEditingSaleModal, setIsEditingSaleModal] = useState(false);
  const [saleModalForm, setSaleModalForm] = useState({
    date: todayISO(),
    payment_method_id: "",
    notes: "",
    items: [],
  });


  const saleTotal = useMemo(
    () =>
      saleItems.reduce(
        (sum, item) => sum + toNumber(item.quantity) * toNumber(item.unit_price),
        0
      ),
    [saleItems]
  );

  const saleModalTotal = useMemo(
    () =>
      saleModalForm.items.reduce(
        (sum, item) => sum + toNumber(item.quantity) * toNumber(item.unit_price),
        0
      ),
    [saleModalForm.items]
  );

  const saleHasInvalidItems = useMemo(
    () =>
      saleItems.some(
        (item) => !item.product_id || toNumber(item.quantity) <= 0
      ),
    [saleItems]
  );
  const saleSubmitDisabled =
    saleSubmitting || !saleForm.payment_method_id || saleHasInvalidItems;

  const salesByDay = useMemo(() => {
    const sorted = [...sales].sort((a, b) =>
      String(b.date || "").localeCompare(String(a.date || ""))
    );
    const map = new Map();
    sorted.forEach((sale) => {
      const key = getDateKey(sale.date);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(sale);
    });
    return Array.from(map.entries()).map(([dateKey, items]) => ({
      dateKey,
      label: formatDateLabel(dateKey),
      total: items.reduce((sum, sale) => sum + toNumber(sale.total), 0),
      items,
    }));
  }, [sales]);

  const salesCount = sales.length;
  const salesRevenue = sales.reduce((sum, sale) => sum + toNumber(sale.total), 0);

  const lowStockProducts = products.filter(
    (product) => toNumber(product.stock) <= toNumber(product.stock_min)
  );
  const hasCriticalStock = lowStockProducts.length > 0;

  const filteredProducts = useMemo(() => {
    let list = productSearch.trim()
      ? products.filter((p) => {
          const q = productSearch.trim().toLowerCase();
          return (
            (p.name && p.name.toLowerCase().includes(q)) ||
            (p.sku && p.sku.toLowerCase().includes(q))
          );
        })
      : [...products];
    if (showOnlyCritical) {
      list = list.filter((p) => toNumber(p.stock) <= toNumber(p.stock_min));
    }
    list.sort((a, b) => {
      let av, bv;
      if (productSort.col === "name") {
        av = (a.name || "").toLowerCase();
        bv = (b.name || "").toLowerCase();
      } else {
        av = toNumber(a[productSort.col]);
        bv = toNumber(b[productSort.col]);
      }
      if (av < bv) return productSort.dir === "asc" ? -1 : 1;
      if (av > bv) return productSort.dir === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [products, productSearch, showOnlyCritical, productSort]);

  function toggleSort(col) {
    setProductSort((prev) =>
      prev.col === col
        ? { col, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { col, dir: col === "name" ? "asc" : "desc" }
    );
  }

  useEffect(() => {
    if (!saleSuccess) return;
    const timer = setTimeout(() => setSaleSuccess(false), 2600);
    return () => clearTimeout(timer);
  }, [saleSuccess]);

  useEffect(() => {
    setTotalBump(true);
    const timer = setTimeout(() => setTotalBump(false), 140);
    return () => clearTimeout(timer);
  }, [saleTotal]);

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

  function updateSaleItem(index, next) {
    setSaleItems((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, ...next } : item))
    );
  }

  function adjustSaleQuantity(index, delta) {
    setSaleItems((prev) =>
      prev.map((item, idx) => {
        if (idx !== index) return item;
        const nextQty = Math.max(1, toNumber(item.quantity, 1) + delta);
        return { ...item, quantity: nextQty };
      })
    );
  }

  function handleSaleItemProduct(index, productId) {
    const product = products.find((p) => String(p.id) === String(productId));
    updateSaleItem(index, {
      product_id: productId,
      unit_price: product?.price != null ? String(product.price) : "",
      nameSearch: product?.name || "",
      skuSearch: product?.sku || "",
    });
  }

  function updateSaleModalItem(index, next) {
    setSaleModalForm((prev) => ({
      ...prev,
      items: prev.items.map((item, idx) => (idx === index ? { ...item, ...next } : item)),
    }));
  }

  function handleSaleModalProduct(index, productId) {
    const product = products.find((p) => String(p.id) === String(productId));
    updateSaleModalItem(index, {
      product_id: productId,
      unit_price:
        product && product.price !== null && product.price !== undefined
          ? String(product.price)
          : "",
    });
  }

  async function handleSaleSubmit(e) {
    e.preventDefault();
    setSaleError("");
    if (!saleForm.payment_method_id) {
      setSaleError("Seleccioná un método de pago.");
      return;
    }
    if (!saleItems.length) {
      setSaleError("Agregá al menos un producto.");
      return;
    }
    if (saleHasInvalidItems) {
      setSaleError("Completá producto y cantidad en cada ítem.");
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
      setSaleItems([{ product_id: "", quantity: 1, unit_price: "", nameSearch: "", skuSearch: "" }]);
      await refreshSales();
      await refreshProducts();
      setSaleSuccess(true);
    } catch (err) {
      setSaleError(err.message || "No se pudo registrar la venta.");
    } finally {
      setSaleSubmitting(false);
    }
  }

  async function handleSaleDelete() {
    if (!selectedSale) return;
    const ok = window.confirm("¿Eliminar esta venta?");
    if (!ok) return;
    try {
      await apiRequest(`/v2/petshop/sales/${selectedSale.id}`, {
        method: "DELETE",
      });
      setSelectedSale(null);
      await refreshSales();
      await refreshProducts();
    } catch (err) {
      alert(err.message || "No se pudo eliminar la venta.");
    }
  }

  async function handleSaleModalSave() {
    if (!selectedSale) return;
    if (!saleModalForm.payment_method_id) {
      alert("Seleccioná un método de pago.");
      return;
    }
    const invalid = saleModalForm.items.some(
      (item) => !item.product_id || toNumber(item.quantity) <= 0
    );
    if (invalid) {
      alert("Completá producto y cantidad en cada ítem.");
      return;
    }
    const payload = {
      date: saleModalForm.date,
      payment_method_id: saleModalForm.payment_method_id,
      notes: saleModalForm.notes.trim(),
      total: saleModalTotal,
      items: saleModalForm.items.map((item) => ({
        product_id: item.product_id,
        quantity: toNumber(item.quantity, 1),
        unit_price: toNumber(item.unit_price, 0),
      })),
    };
    try {
      await apiRequest(`/v2/petshop/sales/${selectedSale.id}`, {
        method: "PUT",
        body: payload,
      });
      await refreshSales();
      await refreshProducts();
      setSelectedSale((prev) => (prev ? { ...prev, ...payload } : prev));
      setIsEditingSaleModal(false);
    } catch (err) {
      alert(err.message || "No se pudo actualizar la venta.");
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
            Ventas y productos del local, en un flujo operativo directo.
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
        </div>
      </div>

      {activeTab === "sales" ? (
        <>
          <div className="petshop-summary">
            <div className="petshop-kpi card">
              <div className="petshop-kpi__label">
                <span className="petshop-kpi__icon" aria-hidden="true">
                  🧾
                </span>
                Ventas en período
              </div>
              <strong className="petshop-kpi__value">{salesCount}</strong>
            </div>
            <div className="petshop-kpi petshop-kpi--success card">
              <div className="petshop-kpi__label">
                <span className="petshop-kpi__icon" aria-hidden="true">
                  💸
                </span>
                Total vendido
              </div>
              <strong className="petshop-kpi__value petshop-amount">
                {formatCurrency(salesRevenue)}
              </strong>
            </div>
            <div
              className={`petshop-kpi card${
                hasCriticalStock ? " petshop-kpi--danger" : ""
              }`}
            >
              <div className="petshop-kpi__label">
                <span className="petshop-kpi__icon" aria-hidden="true">
                  ⚠️
                </span>
                Stock crítico
              </div>
              <strong className="petshop-kpi__value">
                {lowStockProducts.length}
              </strong>
            </div>
          </div>

          <form className="form-card petshop-sale-form" onSubmit={handleSaleSubmit}>
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
            </div>

            <div className="petshop-section-label">Productos</div>
            <div className="petshop-items">
              <div className="petshop-items__header">
                <span>Productos</span>
                <button
                  type="button"
                  className="btn-secondary petshop-action-ghost"
                  onClick={() =>
                    setSaleItems((prev) => [
                      ...prev,
                      { product_id: "", quantity: 1, unit_price: "", nameSearch: "", skuSearch: "" },
                    ])
                  }
                >
                  + Agregar item
                </button>
              </div>
              {saleItems.map((item, index) => {
                const hasProduct = Boolean(item.product_id);
                const hasQty = toNumber(item.quantity) > 0;
                const isInvalid = !hasProduct || !hasQty;
                const nameOpen = openCombo?.index === index && openCombo?.type === "name";
                const skuOpen  = openCombo?.index === index && openCombo?.type === "sku";
                const filteredByName = products.filter((p) =>
                  !item.nameSearch || p.name?.toLowerCase().includes(item.nameSearch.toLowerCase())
                );
                const filteredBySku = products.filter((p) =>
                  !item.skuSearch || (p.sku || "").toLowerCase().includes(item.skuSearch.toLowerCase())
                );
                return (
                  <div key={`${index}-${item.product_id || "item"}`} className={`petshop-item-card${isInvalid ? " petshop-item-card--invalid" : ""}`}>

                    {/* Búsqueda de producto: nombre + SKU */}
                    <div className="petshop-product-combos">
                      <div className="combo-field">
                        <input
                          type="text"
                          placeholder="Buscar por nombre…"
                          value={item.nameSearch}
                          autoComplete="off"
                          onChange={(e) => {
                            updateSaleItem(index, { nameSearch: e.target.value, product_id: "", skuSearch: "" });
                            setOpenCombo({ index, type: "name" });
                          }}
                          onFocus={() => setOpenCombo({ index, type: "name" })}
                          onBlur={() => setTimeout(() => setOpenCombo(null), 150)}
                        />
                        {nameOpen && (
                          <div className="combo-field__list" role="listbox">
                            {filteredByName.length === 0 ? (
                              <div className="combo-field__empty">Sin resultados</div>
                            ) : (
                              filteredByName.map((p) => (
                                <button
                                  key={p.id}
                                  type="button"
                                  className="combo-field__option petshop-combo-option"
                                  onMouseDown={() => {
                                    handleSaleItemProduct(index, p.id);
                                    setOpenCombo(null);
                                  }}
                                >
                                  <span>{p.name}</span>
                                  {p.sku && <small className="petshop-combo-option__sku">SKU: {p.sku}</small>}
                                </button>
                              ))
                            )}
                          </div>
                        )}
                      </div>

                      <div className="combo-field">
                        <input
                          type="text"
                          placeholder="Buscar por SKU / código…"
                          value={item.skuSearch}
                          autoComplete="off"
                          onChange={(e) => {
                            updateSaleItem(index, { skuSearch: e.target.value, product_id: "", nameSearch: "" });
                            setOpenCombo({ index, type: "sku" });
                          }}
                          onFocus={() => setOpenCombo({ index, type: "sku" })}
                          onBlur={() => setTimeout(() => setOpenCombo(null), 150)}
                        />
                        {skuOpen && (
                          <div className="combo-field__list" role="listbox">
                            {filteredBySku.length === 0 ? (
                              <div className="combo-field__empty">Sin resultados</div>
                            ) : (
                              filteredBySku.map((p) => (
                                <button
                                  key={p.id}
                                  type="button"
                                  className="combo-field__option petshop-combo-option"
                                  onMouseDown={() => {
                                    handleSaleItemProduct(index, p.id);
                                    setOpenCombo(null);
                                  }}
                                >
                                  <span>{p.sku || "-"}</span>
                                  <small className="petshop-combo-option__name">{p.name}</small>
                                </button>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Cantidad, precio, subtotal, eliminar */}
                    <div className="petshop-item-controls">
                      <div className="petshop-item-field">
                        <span className="petshop-item-field__label">Cantidad</span>
                        <div className="petshop-stepper" role="group" aria-label="Cantidad">
                          <button
                            type="button"
                            className="petshop-stepper__btn"
                            onClick={() => adjustSaleQuantity(index, -1)}
                            aria-label="Disminuir cantidad"
                          >−</button>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateSaleItem(index, { quantity: e.target.value })}
                            onBlur={(e) => {
                              const next = Math.max(1, toNumber(e.target.value, 1));
                              updateSaleItem(index, { quantity: next });
                            }}
                            aria-label="Cantidad"
                          />
                          <button
                            type="button"
                            className="petshop-stepper__btn"
                            onClick={() => adjustSaleQuantity(index, 1)}
                            aria-label="Aumentar cantidad"
                          >+</button>
                        </div>
                      </div>

                      <span className="petshop-item-op" aria-hidden="true">×</span>

                      <div className="petshop-item-field">
                        <span className="petshop-item-field__label">Precio unit.</span>
                        <div className="petshop-price-field">
                          <span className="petshop-price-field__prefix">$</span>
                          <input
                            type="number"
                            min="0"
                            step="100"
                            value={item.unit_price}
                            step="1"
                            onChange={(e) => updateSaleItem(index, { unit_price: e.target.value })}
                            aria-label="Precio unitario"
                          />
                        </div>
                      </div>

                      <span className="petshop-item-op" aria-hidden="true">=</span>

                      <div className="petshop-item-field petshop-item-field--subtotal">
                        <span className="petshop-item-field__label">Subtotal</span>
                        <span className="petshop-item-row__total">
                          {formatCurrency(toNumber(item.quantity) * toNumber(item.unit_price))}
                        </span>
                      </div>

                      <button
                        type="button"
                        className="petshop-icon-button petshop-icon-button--ghost petshop-item-delete"
                        onClick={() => setSaleItems((prev) => prev.filter((_, idx) => idx !== index))}
                        aria-label="Quitar ítem"
                      >🗑</button>
                    </div>

                    {isInvalid && (
                      <div className="petshop-item-row__hint">
                        {hasProduct ? "Ingresá cantidad válida." : "Buscá y seleccioná un producto."}
                      </div>
                    )}
                  </div>
                );
              })}
            <div className="petshop-items__footer">
              <span>Total</span>
              <strong className="petshop-amount">{formatCurrency(saleTotal)}</strong>
            </div>
          </div>

            <div className="form-grid">
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
                  {paymentMethods
                    .filter((method) =>
                      String(method.name || "").toLowerCase() !== "cash"
                    )
                    .map((method) => (
                      <option key={method.id} value={method.id}>
                        {method.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className="form-grid">
              <div className="form-field form-field--full">
                <label htmlFor="sale_notes">Notas (opcional)</label>
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

            {saleError ? (
              <div className="petshop-inline-error">{saleError}</div>
            ) : null}
            {saleSuccess ? (
              <div className="petshop-inline-success">Venta registrada ✓</div>
            ) : null}

            <div className="petshop-total-bar" role="status" aria-live="polite">
              <div className="petshop-total-bar__label">TOTAL</div>
              <div
                className={`petshop-total-bar__value petshop-amount${
                  totalBump ? " petshop-total-bar__value--bump" : ""
                }`}
              >
                {formatCurrency(saleTotal)}
              </div>
              <button
                type="submit"
                className="btn-primary"
                disabled={saleSubmitDisabled}
              >
                {saleSubmitting ? "Guardando..." : "Registrar venta"}
              </button>
            </div>
          </form>

          <div className="card">
            <div className="petshop-list__header">
              <div>
                <h2 className="card-title">Ventas registradas</h2>
                <p className="card-subtitle">
                  {formatDateLabel(salesFilters.from)} → {formatDateLabel(salesFilters.to)}
                  {" · "}{salesCount} {salesCount === 1 ? "venta" : "ventas"}
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
            <div className="filters-period-quick" style={{ marginBottom: 16 }}>
              {[
                { label: "Hoy", range: () => { const t = todayISO(); return { from: t, to: t }; } },
                { label: "Esta semana", range: () => {
                  const now = new Date();
                  const day = now.getDay() === 0 ? 6 : now.getDay() - 1;
                  const mon = new Date(now); mon.setDate(now.getDate() - day);
                  return { from: mon.toISOString().slice(0, 10), to: now.toISOString().slice(0, 10) };
                }},
                { label: "Este mes", range: () => {
                  const now = new Date();
                  return { from: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`, to: now.toISOString().slice(0, 10) };
                }},
                { label: "Mes anterior", range: () => {
                  const now = new Date();
                  const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                  const last = new Date(now.getFullYear(), now.getMonth(), 0);
                  return { from: first.toISOString().slice(0, 10), to: last.toISOString().slice(0, 10) };
                }},
              ].map(({ label, range }) => {
                const r = range();
                const isActive = salesFilters.from === r.from && salesFilters.to === r.to;
                return (
                  <button
                    key={label}
                    type="button"
                    className={`filters-period-pill${isActive ? " is-active" : ""}`}
                    onClick={() => setSalesFilters(r)}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {salesError && <div className="petshop-error">{salesError}</div>}
            {salesLoading ? (
              <div className="card-subtitle">Cargando ventas...</div>
            ) : salesByDay.length === 0 ? (
              <div className="card-subtitle" style={{ textAlign: "center", padding: "32px 0" }}>
                No hay ventas en este período.
              </div>
            ) : (
              <div className="petshop-sales-groups">
                {salesByDay.map((group) => (
                  <div key={group.dateKey} className="petshop-sales-group">
                    <div className="petshop-day-header">
                      <span className="petshop-day-header__date">{group.label}</span>
                      <span className="petshop-day-header__count">{group.items.length} {group.items.length === 1 ? "venta" : "ventas"}</span>
                      <span className="petshop-day-header__divider" />
                      <span className="petshop-day-header__total">{formatCurrency(group.total)}</span>
                    </div>
                    <table className="petshop-sales-table">
                      <tbody>
                        {group.items.map((sale, saleIdx) => {
                          const isTestSale = String(sale.notes || "").toLowerCase().includes("prueba");
                          const openSaleModal = () => {
                            setSelectedSale(sale);
                            setSaleModalForm({
                              date: sale.date || todayISO(),
                              payment_method_id: sale.payment_method_id || "",
                              notes: sale.notes || "",
                              items: (sale.items || []).map((item) => ({
                                product_id: item.product_id,
                                quantity: item.quantity,
                                unit_price:
                                  item.unit_price !== null && item.unit_price !== undefined
                                    ? String(item.unit_price)
                                    : "",
                              })),
                            });
                            setIsEditingSaleModal(false);
                          };
                          return (
                            <tr
                              key={sale.id}
                              className={`petshop-sales-table__row petshop-clickable${saleIdx % 2 === 1 ? " petshop-sales-table__row--alt" : ""}`}
                              onClick={openSaleModal}
                              tabIndex={0}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openSaleModal(); }
                              }}
                            >
                              <td className="petshop-sales-table__items">
                                {(sale.items || []).map((item, i) => (
                                  <span key={i} className="petshop-sales-table__item">
                                    {formatProductName(item.product_id)}
                                    {item.quantity > 1 && (
                                      <span className="petshop-sales-table__qty"> ×{item.quantity}</span>
                                    )}
                                    {i < sale.items.length - 1 && <span className="petshop-sales-table__sep">,  </span>}
                                  </span>
                                ))}
                                {sale.notes && !isTestSale && (
                                  <span className="petshop-sales-table__note"> · {sale.notes}</span>
                                )}
                                {isTestSale && (
                                  <span className="service-badge service-badge--muted" style={{ marginLeft: 6 }}>prueba</span>
                                )}
                              </td>
                              <td className="petshop-sales-table__method">
                                {formatPaymentMethod(sale.payment_method_id)}
                              </td>
                              <td className="petshop-sales-table__total petshop-amount">
                                {formatCurrency(sale.total)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Modal
            isOpen={Boolean(selectedSale)}
            onClose={() => {
              setSelectedSale(null);
              setIsEditingSaleModal(false);
            }}
            title={isEditingSaleModal ? "Editar venta" : "Detalle de venta"}
          >
            {selectedSale && (
              <>
                {isEditingSaleModal ? (
                  <>
                    <div className="form-grid">
                      <div className="form-field">
                        <label htmlFor="sale_modal_date">Fecha</label>
                        <input
                          id="sale_modal_date"
                          type="date"
                          value={saleModalForm.date}
                          onChange={(e) =>
                            setSaleModalForm((prev) => ({
                              ...prev,
                              date: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="form-field">
                        <label htmlFor="sale_modal_payment">Método de pago</label>
                        <select
                          id="sale_modal_payment"
                          value={saleModalForm.payment_method_id}
                          onChange={(e) =>
                            setSaleModalForm((prev) => ({
                              ...prev,
                              payment_method_id: e.target.value,
                            }))
                          }
                        >
                          <option value="">Seleccioná</option>
                          {paymentMethods
                            .filter((method) =>
                              String(method.name || "").toLowerCase() !== "cash"
                            )
                            .map((method) => (
                              <option key={method.id} value={method.id}>
                                {method.name}
                              </option>
                            ))}
                        </select>
                      </div>
                      <div className="form-field form-field--full">
                        <label htmlFor="sale_modal_notes">Notas</label>
                        <textarea
                          id="sale_modal_notes"
                          rows={3}
                          value={saleModalForm.notes}
                          onChange={(e) =>
                            setSaleModalForm((prev) => ({
                              ...prev,
                              notes: e.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>

                    <div className="petshop-items">
                      <div className="petshop-items__header">
                        <span>Producto</span>
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() =>
                            setSaleModalForm((prev) => ({
                              ...prev,
                              items: [
                                ...prev.items,
                                { product_id: "", quantity: 1, unit_price: "" },
                              ],
                            }))
                          }
                        >
                          + Agregar item
                        </button>
                      </div>
                      {saleModalForm.items.map((item, index) => (
                        <div key={`${index}-${item.product_id}`} className="petshop-item-row">
                          <select
                            value={item.product_id}
                            onChange={(e) =>
                              handleSaleModalProduct(index, e.target.value)
                            }
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
                              updateSaleModalItem(index, { quantity: e.target.value })
                            }
                          />
                          <input
                            type="number"
                            min="0"
                            step="100"
                            value={item.unit_price}
                            onChange={(e) =>
                              updateSaleModalItem(index, { unit_price: e.target.value })
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
                              setSaleModalForm((prev) => ({
                                ...prev,
                                items: prev.items.filter((_, idx) => idx !== index),
                              }))
                            }
                          >
                            Quitar
                          </button>
                        </div>
                      ))}
                      <div className="petshop-items__footer">
                        <span>Total</span>
                        <strong>{formatCurrency(saleModalTotal)}</strong>
                      </div>
                    </div>
                  </>
                ) : (
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
                <div className="modal-actions">
                  {isEditingSaleModal ? (
                    <>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => setIsEditingSaleModal(false)}
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={handleSaleModalSave}
                      >
                        Guardar cambios
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={() => setIsEditingSaleModal(true)}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="btn-danger"
                        onClick={handleSaleDelete}
                      >
                        Eliminar
                      </button>
                    </>
                  )}
                </div>
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
                  step="1"
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
                  step="1"
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
            <div className="petshop-list__header">
              <h2 className="card-title">
                Productos cargados
                <span style={{ fontWeight: 400, fontSize: "0.85rem", color: "var(--color-text-soft)", marginLeft: 8 }}>
                  {filteredProducts.length} de {products.length}
                </span>
              </h2>
              {lowStockProducts.length > 0 && (
                <button
                  type="button"
                  className={`service-badge${showOnlyCritical ? "" : " service-badge--critical"}`}
                  style={{ cursor: "pointer", border: "none", background: showOnlyCritical ? "var(--color-primary-light)" : undefined, color: showOnlyCritical ? "var(--color-primary)" : undefined }}
                  onClick={() => setShowOnlyCritical((v) => !v)}
                >
                  {lowStockProducts.length} con stock crítico{showOnlyCritical ? " ✕" : ""}
                </button>
              )}
            </div>
            <input
              className="petshop-product-search"
              type="search"
              placeholder="Buscar por nombre o SKU…"
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
            />
            {productsError && <div className="petshop-error">{productsError}</div>}
            {productsLoading ? (
              <div className="card-subtitle">Cargando productos...</div>
            ) : products.length === 0 ? (
              <div className="card-subtitle" style={{ textAlign: "center", padding: "32px 0" }}>
                No hay productos cargados.
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="card-subtitle" style={{ textAlign: "center", padding: "32px 0" }}>
                Sin resultados para &ldquo;{productSearch}&rdquo;.
              </div>
            ) : (
              <div className="petshop-product-table-wrap">
                <table className="petshop-product-table">
                  <thead>
                    <tr>
                      {[
                        { col: "name", label: "Producto" },
                        { col: "stock", label: "Stock" },
                        { col: "stock_min", label: "Mín." },
                        { col: "cost", label: "Costo" },
                        { col: "price", label: "Precio" },
                      ].map(({ col, label }) => (
                        <th
                          key={col}
                          className={`petshop-product-table__th${productSort.col === col ? " is-sorted" : ""}`}
                          onClick={() => toggleSort(col)}
                        >
                          {label}
                          <span className="petshop-sort-icon">
                            {productSort.col === col
                              ? productSort.dir === "asc" ? " ↑" : " ↓"
                              : " ↕"}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map((product) => {
                      const isCritical = toNumber(product.stock) <= toNumber(product.stock_min);
                      return (
                        <tr
                          key={product.id}
                          className={`petshop-product-table__row petshop-clickable${isCritical ? " petshop-product-table__row--critical" : ""}`}
                          onClick={() => openProductModal(product)}
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              openProductModal(product);
                            }
                          }}
                        >
                          <td className="petshop-product-table__name-cell">
                            {isCritical && (
                              <span className="petshop-product-table__critical-dot" title="Stock crítico" />
                            )}
                            <span className="petshop-product-table__name">{product.name}</span>
                            {product.sku && (
                              <span className="petshop-product-table__sku">{product.sku}</span>
                            )}
                          </td>
                          <td className={`petshop-product-table__stock${isCritical ? " petshop-product-table__stock--critical" : ""}`}>
                            {product.stock ?? 0}
                          </td>
                          <td className="petshop-product-table__muted">{product.stock_min ?? 0}</td>
                          <td className="petshop-product-table__muted">{product.cost ? formatCurrency(product.cost) : "-"}</td>
                          <td className="petshop-product-table__price">{formatCurrency(product.price)}</td>
                        </tr>
                      );
                    })}
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
