import { apiRequest } from "./apiClient";

export const getTenants = () =>
  apiRequest("/v2/super/tenants");

export const getTenant = (id) =>
  apiRequest(`/v2/super/tenants/${id}`);

export const createTenant = (data) =>
  apiRequest("/v2/super/tenants", { method: "POST", body: data });

export const updateTenant = (id, data) =>
  apiRequest(`/v2/super/tenants/${id}`, { method: "PATCH", body: data });

export const createTenantAdmin = (tenantId, data) =>
  apiRequest(`/v2/super/tenants/${tenantId}/admin`, { method: "POST", body: data });
