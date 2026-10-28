// Equipo: organigrama y personal (backend: src/team.js). Solo admin.
import { apiRequest } from "./apiClient";

// El servidor responde 404 (sin mensaje) si todavía corre una versión sin
// esta función: mejor decirlo que mostrar "Error".
export const OUTDATED_SERVER_MESSAGE =
  "El servidor todavía no tiene esta función. Falta actualizar el backend; probá de nuevo en unos minutos.";

export function explainMissingRoute(err) {
  if (err?.status === 404 && !err?.payload?.message) {
    const friendly = new Error(OUTDATED_SERVER_MESSAGE);
    friendly.status = 404;
    return friendly;
  }
  return err;
}

export async function getTeam() {
  const data = await apiRequest("/v2/team").catch((err) => {
    throw explainMissingRoute(err);
  });
  return {
    positions: data?.positions || [],
    employees: data?.employees || [],
    assignments: data?.assignments || [],
  };
}

export function createPosition({ name, description, area, parentId }) {
  return apiRequest("/v2/team/positions", {
    method: "POST",
    body: { name, description: description || null, area, parent_id: parentId || null },
  });
}

export function updatePosition(id, { name, description, area, parentId }) {
  return apiRequest(`/v2/team/positions/${id}`, {
    method: "PATCH",
    body: { name, description: description || null, area, parent_id: parentId || null },
  });
}

export function deletePosition(id) {
  return apiRequest(`/v2/team/positions/${id}`, { method: "DELETE" });
}

export function setPositionEmployees(id, employeeIds) {
  return apiRequest(`/v2/team/positions/${id}/employees`, {
    method: "PUT",
    body: { employee_ids: employeeIds },
  });
}

export function createTemplate() {
  return apiRequest("/v2/team/template", { method: "POST" });
}
