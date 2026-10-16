import { apiRequest } from "./apiClient";

export const getTrasladoSolicitud = async (turnoId) => {
  const rows = await apiRequest("/v2/traslado-solicitudes", {
    params: { turno_id: turnoId },
  });
  return rows[0] || null;
};
export const saveTrasladoSolicitud = (id, body) =>
  apiRequest(`/v2/traslado-solicitudes/${id}`, { method: "PUT", body });
export const registrarCobroTraslado = (id, body) =>
  apiRequest(`/v2/traslado-solicitudes/${id}/cobro`, { method: "POST", body });
export const getTrasladoConfig = () =>
  apiRequest("/v2/traslados/configuracion");
export const saveTrasladoConfig = (body) =>
  apiRequest("/v2/traslados/configuracion", { method: "PUT", body });
