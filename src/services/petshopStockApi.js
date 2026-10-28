// Stock del PetShop con conteo (backend: src/petshopStock.js).
import { apiRequest } from "./apiClient";
import { explainMissingRoute } from "./teamApi";

const request = (path, options) =>
  apiRequest(path, options).catch((err) => {
    throw explainMissingRoute(err);
  });

export async function getStock() {
  const data = await request("/v2/petshop/stock");
  return data?.items || [];
}

export async function getMovements({ productId, kinds, from, to, limit } = {}) {
  const params = {};
  if (productId) params.product_id = productId;
  if (kinds?.length) params.kind = kinds.join(",");
  if (from) params.from = from;
  if (to) params.to = to;
  if (limit) params.limit = limit;
  const data = await request("/v2/petshop/stock/movements", { params });
  return data?.items || [];
}

// kind: ingreso | merma | conteo. clientId hace que un reintento no duplique.
export function registerMovement({ clientId, productId, kind, quantity, unitCost, note }) {
  return request("/v2/petshop/stock/movements", {
    method: "POST",
    body: {
      client_id: clientId,
      product_id: productId,
      kind,
      quantity,
      unit_cost: unitCost ?? null,
      note: note ?? null,
    },
  });
}

export function getReview() {
  return request("/v2/petshop/stock/review");
}
