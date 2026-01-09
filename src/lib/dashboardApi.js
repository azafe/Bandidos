// src/lib/dashboardApi.js
import { apiRequest } from "../services/apiClient";

export async function fetchDashboardData(range) {
  const params = range ? { from: range.from, to: range.to } : undefined;
  const [services, dailyExpenses, fixedExpenses, categories] =
    await Promise.all([
      apiRequest("/v2/services", { params }),
      apiRequest("/v2/daily-expenses", { params }),
      apiRequest("/v2/fixed-expenses", { params }),
      apiRequest("/v2/expense-categories"),
    ]);

  return {
    services: Array.isArray(services) ? services : services?.items || [],
    dailyExpenses: Array.isArray(dailyExpenses)
      ? dailyExpenses
      : dailyExpenses?.items || [],
    fixedExpenses: Array.isArray(fixedExpenses)
      ? fixedExpenses
      : fixedExpenses?.items || [],
    categories: Array.isArray(categories) ? categories : categories?.items || [],
  };
}
