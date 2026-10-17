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
export const getTrasladosResultados = (params) =>
  apiRequest("/v2/traslados/resultados", { params });
export const saveCategoriasTraslados = (ids) =>
  apiRequest("/v2/traslados/resultados/categorias", { method: "PUT", body: { ids } });
export const confirmarGastosTraslados = (body) =>
  apiRequest("/v2/traslados/resultados/revision-gastos", { method: "POST", body });
export const asignarGastoTraslado = (tipo, id, body) =>
  apiRequest(`/v2/traslados/resultados/gastos/${tipo}/${id}`, { method: "PUT", body });
export const repartirTraslado = (id, body) =>
  apiRequest(`/v2/traslados/resultados/repartos/${id}`, { method: "PUT", body });
export const revisarCondicionesTraslado = (id, body) =>
  apiRequest(`/v2/traslados/resultados/condiciones/${id}`, { method: "PUT", body });
export const guardarCostoTraslado = (tipo, id, body) =>
  apiRequest(`/v2/traslados/resultados/${tipo}${id ? `/${id}` : ""}`, { method: id ? "PUT" : "POST", body });
export const getHojaDeRuta = (params) =>
  apiRequest("/v2/traslados/hoja-de-ruta", { params });
export const ordenarRuta = (body) =>
  apiRequest("/v2/traslados/orden-ruta", { method: "PUT", body });
export const avanzarTramo = (id, estado_anterior, estado) =>
  apiRequest(`/v2/traslados/${id}/estado`, { method: "PATCH", body: { estado_anterior, estado } });
export const vincularCuentaChofer = (id, chofer_id) =>
  apiRequest(`/v2/users/${id}/chofer`, { method: "PUT", body: { chofer_id } });
export const revisarHistoricos = () =>
  apiRequest("/v2/traslados/historicos/revision", { params: { hasta: "2026-10-15" } });
export const importarHistoricos = (body) =>
  apiRequest("/v2/traslados/historicos/importar", { method: "POST", body });
