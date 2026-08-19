// src/lib/dashboardApi.js
import { apiRequest } from "../services/apiClient";

const asList = (data) => (Array.isArray(data) ? data : data?.items || []);

export async function fetchDashboardData(range) {
  const params = range ? { from: range.from, to: range.to } : undefined;
  const [
    services,
    dailyExpenses,
    fixedExpenses,
    fixedAccrual,
    employees,
    categories,
    groomerReport,
    sales,
  ] = await Promise.all([
    apiRequest("/agenda", { params }),
    apiRequest("/v2/daily-expenses", { params }),
    // Las plantillas de gasto fijo no llevan fecha: el endpoint rechaza from/to.
    apiRequest("/v2/fixed-expenses"),
    // El devengado del período sale del backend, que es la única fuente de
    // verdad — antes el dashboard y /reports/summary lo calculaban por
    // separado, con criterios distintos.
    params
      ? apiRequest("/v2/fixed-expenses/accrual", { params }).catch(() => null)
      : Promise.resolve(null),
    apiRequest("/v2/employees").catch(() => []),
    apiRequest("/v2/expense-categories"),
    apiRequest("/reports/by-groomer", { params }).catch(() => []),
    apiRequest("/v2/petshop/sales", { params }).catch(() => []),
  ]);

  return {
    services: asList(services),
    dailyExpenses: asList(dailyExpenses),
    fixedExpenses: asList(fixedExpenses),
    fixedAccrual,
    employees: asList(employees),
    categories: asList(categories),
    groomerReport: asList(groomerReport),
    petshopSales: asList(sales),
  };
}
