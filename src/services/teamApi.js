// Equipo: organigrama y personal (backend: src/team.js). Solo admin.
import { apiRequest } from "./apiClient";

export async function getTeam() {
  const data = await apiRequest("/v2/team");
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
