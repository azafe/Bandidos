// src/lib/dashboardMetrics.js
function parseDateValue(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  const raw = String(value).trim();

  if (raw.includes("-")) {
    // Strip time component if present (e.g. "2026-03-02T00:00:00.000Z")
    const datePart = raw.includes("T") ? raw.slice(0, 10) : raw;
    const parts = datePart.split("-");
    if (parts.length === 3 && parts[0].length === 4) {
      const [y, m, d] = parts.map(Number);
      return new Date(y, m - 1, d);
    }
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parts = raw.split("/");
  if (parts.length === 3) {
    let [p1, p2, p3] = parts.map((v) => Number(v));
    if (!p1 || !p2 || !p3) return null;
    let day = p1;
    let month = p2;
    if (p1 <= 12 && p2 > 12) {
      month = p1;
      day = p2;
    }
    const year = p3 < 100 ? 2000 + p3 : p3;
    const parsed = new Date(year, month - 1, day);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const fallback = new Date(raw);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

function formatDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function buildDateRange(from, to) {
  const start = parseDateValue(from);
  const end = parseDateValue(to);
  if (!start || !end) return [];
  const days = [];
  const current = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  while (current <= last) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return days;
}

function inRange(dateValue, range) {
  const parsed = parseDateValue(dateValue);
  if (!parsed) return false;
  const start = parseDateValue(range.from);
  const end = parseDateValue(range.to);
  if (!start || !end) return false;
  const d = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  return d >= start && d <= end;
}

function sumBy(items, getter) {
  return items.reduce((acc, item) => acc + (getter(item) || 0), 0);
}

function percentDelta(current, previous) {
  if (!previous) return 0;
  return (current - previous) / Math.abs(previous);
}

function normalizeService(service) {
  const amount =
    Number(
      service.final_price ||
        service.service_type?.default_price ||
        service.service_price ||
        service.amount ||
        service.price ||
        service.total ||
        0
    ) || 0;
  return {
    id: service.id,
    date: service.date || service.created_at || service.createdAt,
    amount,
    petName: service.dogName || service.pet_name || service.pet?.name || "",
    customerName:
      service.owner_name || service.ownerName || service.customer?.name || "",
    paymentMethod: service.paymentMethod || service.payment_method?.name || "",
    serviceTypeName: service.service_type?.name || service.serviceTypeName || "",
  };
}

function normalizeExpense(expense) {
  return {
    id: expense.id,
    date: expense.date || expense.created_at || expense.createdAt,
    amount: Number(expense.amount || 0) || 0,
    category:
      expense.category?.name ||
      expense.category_name ||
      expense.categoryName ||
      "",
    paymentMethod: expense.payment_method?.name || expense.paymentMethod || "",
    description: expense.description || "",
    supplier: expense.supplier?.name || "",
  };
}

function normalizeFixedExpense(expense) {
  return {
    id: expense.id,
    amount: Number(expense.amount || 0) || 0,
    dueDay: Number(expense.due_day || expense.dueDay || 0) || 0,
    status: expense.status,
    category:
      expense.category?.name ||
      expense.category_name ||
      expense.categoryName ||
      "",
    paymentMethod: expense.payment_method?.name || expense.paymentMethod || "",
    name: expense.name || "",
  };
}

function isActiveFixed(expense) {
  return expense.status === "active" || expense.status === "Activo";
}

function fixedExpenseOccurrences(fixedExpenses, rangeDays) {
  const totalsByDate = new Map();
  fixedExpenses.forEach((expense) => {
    if (!isActiveFixed(expense) || !expense.dueDay) return;
    rangeDays.forEach((day) => {
      if (day.getDate() === expense.dueDay) {
        const key = formatDateKey(day);
        totalsByDate.set(key, (totalsByDate.get(key) || 0) + expense.amount);
      }
    });
  });
  return totalsByDate;
}

function buildAlerts({ profit, income, expenses }, fixedExpenses, rangeEnd) {
  const alerts = [];
  if (profit < 0) {
    alerts.push({
      tone: "danger",
      title: "Estás en pérdida",
      description: "El profit del período es negativo.",
    });
  }
  if (expenses > income) {
    alerts.push({
      tone: "danger",
      title: "Gastos por encima de ingresos",
      description: "Los gastos superan los ingresos en este rango.",
    });
  }
  const endDate = parseDateValue(rangeEnd);
  if (endDate) {
    const upcoming = fixedExpenses.filter((expense) => {
      if (!isActiveFixed(expense) || !expense.dueDay) return false;
      const dueDate = new Date(
        endDate.getFullYear(),
        endDate.getMonth(),
        expense.dueDay
      );
      const diff = (dueDate - endDate) / (1000 * 60 * 60 * 24);
      return diff >= 0 && diff <= 7;
    });
    if (upcoming.length > 0) {
      alerts.push({
        tone: "warning",
        title: "Gastos fijos próximos",
        description: `${upcoming.length} gasto(s) fijo(s) vencen en la próxima semana.`,
      });
    }
  }
  return alerts;
}

const GROOMER_COMMISSION_RATE = 0.40;

function normalizePetshopSale(sale) {
  return {
    id: sale.id,
    date: sale.date || sale.created_at,
    amount: Number(sale.total || 0) || 0,
    paymentMethod: sale.payment_method?.name || sale.paymentMethod || "",
    itemCount: Array.isArray(sale.items) ? sale.items.length : 0,
  };
}

function normalizeGroomerReport(groomerReport) {
  if (!Array.isArray(groomerReport)) return [];
  return groomerReport
    .map((item) => ({
      name: item.groomer_name || item.name || "Sin nombre",
      total: Number(item.total_income || item.total || item.amount || 0) || 0,
      services: Number(item.services_count || item.count || 0) || 0,
    }))
    .filter((item) => item.total > 0)
    .sort((a, b) => b.total - a.total);
}

export function buildDashboardMetrics({
  range,
  current,
  previous,
  categories,
}) {
  const rangeDays = buildDateRange(range.from, range.to);
  const services = current.services
    .map(normalizeService)
    .filter((service) => inRange(service.date, range));
  const dailyExpenses = current.dailyExpenses
    .map(normalizeExpense)
    .filter((expense) => inRange(expense.date, range));
  const fixedExpenses = current.fixedExpenses.map(normalizeFixedExpense);
  const petshopSales = (current.petshopSales || [])
    .map(normalizePetshopSale)
    .filter((sale) => inRange(sale.date, range));

  const fixedByDate = fixedExpenseOccurrences(fixedExpenses, rangeDays);
  const servicesIncome = sumBy(services, (service) => service.amount);
  const petshopIncome = sumBy(petshopSales, (sale) => sale.amount);
  const income = servicesIncome + petshopIncome;
  const dailyExpenseTotal = sumBy(dailyExpenses, (expense) => expense.amount);
  const fixedExpenseTotal = Array.from(fixedByDate.values()).reduce(
    (sum, value) => sum + value,
    0
  );
  const groomerCommissions = servicesIncome * GROOMER_COMMISSION_RATE;
  const expenses = dailyExpenseTotal + fixedExpenseTotal;
  const totalCosts = expenses + groomerCommissions;
  const profit = income - totalCosts;
  const margin = income > 0 ? profit / income : 0;
  const servicesCount = services.length;
  const avgTicket = servicesCount > 0 ? servicesIncome / servicesCount : 0;

  const byDay = rangeDays.map((day) => {
    const key = formatDateKey(day);
    const dailyServicesIncome = sumBy(
      services.filter((service) => formatDateKey(parseDateValue(service.date)) === key),
      (service) => service.amount
    );
    const dailyPetshopIncome = sumBy(
      petshopSales.filter((sale) => formatDateKey(parseDateValue(sale.date)) === key),
      (sale) => sale.amount
    );
    const dailyIncome = dailyServicesIncome + dailyPetshopIncome;
    const dailyExpense = sumBy(
      dailyExpenses.filter(
        (expense) => formatDateKey(parseDateValue(expense.date)) === key
      ),
      (expense) => expense.amount
    );
    const fixedExpense = fixedByDate.get(key) || 0;
    const dailyCommissions = dailyServicesIncome * GROOMER_COMMISSION_RATE;
    const expenseTotal = dailyExpense + fixedExpense + dailyCommissions;
    return {
      date: key,
      income: dailyIncome,
      servicesIncome: dailyServicesIncome,
      petshopIncome: dailyPetshopIncome,
      groomerCommissions: dailyCommissions,
      expense: expenseTotal,
      profit: dailyIncome - expenseTotal,
    };
  });

  const categoryTotals = new Map();
  dailyExpenses.forEach((expense) => {
    const name = expense.category || "Sin categoría";
    categoryTotals.set(name, (categoryTotals.get(name) || 0) + expense.amount);
  });
  if (fixedExpenseTotal > 0) {
    categoryTotals.set(
      "Gastos fijos",
      (categoryTotals.get("Gastos fijos") || 0) + fixedExpenseTotal
    );
  }
  if (groomerCommissions > 0) {
    categoryTotals.set(
      "Comisiones peluqueros",
      (categoryTotals.get("Comisiones peluqueros") || 0) + groomerCommissions
    );
  }

  const expensesByCategory = Array.from(categoryTotals.entries()).map(
    ([name, value]) => ({ name, value })
  );

  const marginByDay = byDay.map((d) => ({
    date: d.date,
    margin: d.income > 0 ? d.profit / d.income : 0,
  }));

  const serviceTypeTotals = new Map();
  services.forEach((service) => {
    const name =
      service.serviceTypeName ||
      service.service_type?.name ||
      "Sin tipo";
    serviceTypeTotals.set(name, (serviceTypeTotals.get(name) || 0) + service.amount);
  });
  const revenueByServiceType = Array.from(serviceTypeTotals.entries())
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total);

  const groomerRevenue = normalizeGroomerReport(current.groomerReport || []);

  const previousMetrics = previous
    ? buildDashboardMetrics({
        range: previous.range,
        current: previous.current,
        previous: null,
        categories,
      })
    : null;

  const deltas = previousMetrics
    ? {
        income: percentDelta(income, previousMetrics.kpis.income),
        servicesIncome: percentDelta(servicesIncome, previousMetrics.kpis.servicesIncome),
        petshopIncome: percentDelta(petshopIncome, previousMetrics.kpis.petshopIncome),
        expenses: percentDelta(expenses, previousMetrics.kpis.expenses),
        totalCosts: percentDelta(totalCosts, previousMetrics.kpis.totalCosts),
        groomerCommissions: percentDelta(groomerCommissions, previousMetrics.kpis.groomerCommissions),
        profit: percentDelta(profit, previousMetrics.kpis.profit),
        margin: percentDelta(margin, previousMetrics.kpis.margin),
        servicesCount: percentDelta(
          servicesCount,
          previousMetrics.kpis.servicesCount
        ),
        avgTicket: percentDelta(avgTicket, previousMetrics.kpis.avgTicket),
      }
    : null;

  const recentActivity = [
    ...services.map((service) => ({
      id: `service-${service.id}`,
      type: "service",
      title: `Servicio - ${service.petName || "Mascota"}`,
      subtitle: service.customerName || "Cliente",
      amount: service.amount,
      method: service.paymentMethod || "Sin método",
      date: service.date,
    })),
    ...dailyExpenses.map((expense) => ({
      id: `expense-${expense.id}`,
      type: "expense",
      title: `Gasto - ${expense.category || "Sin categoría"}`,
      subtitle: expense.description || "Gasto diario",
      amount: expense.amount,
      method: expense.paymentMethod || "Sin método",
      date: expense.date,
    })),
    ...petshopSales.map((sale) => ({
      id: `petshop-${sale.id}`,
      type: "petshop",
      title: "Venta PetShop",
      subtitle: `${sale.itemCount} artículo${sale.itemCount !== 1 ? "s" : ""}`,
      amount: sale.amount,
      method: sale.paymentMethod || "Sin método",
      date: sale.date,
    })),
  ]
    .filter((item) => item.date)
    .sort((a, b) => {
      const aDate = parseDateValue(a.date);
      const bDate = parseDateValue(b.date);
      const aTime = aDate ? aDate.getTime() : 0;
      const bTime = bDate ? bDate.getTime() : 0;
      return bTime - aTime;
    })
    .slice(0, 10);

  const alerts = buildAlerts(
    { profit, income, expenses },
    fixedExpenses,
    range.to
  );

  return {
    range: { ...range, label: range.label },
    kpis: {
      income,
      servicesIncome,
      petshopIncome,
      expenses,
      dailyExpenseTotal,
      fixedExpenseTotal,
      totalCosts,
      groomerCommissions,
      profit,
      margin,
      servicesCount,
      avgTicket,
      deltas,
    },
    series: {
      byDay,
      expensesByCategory,
      marginByDay,
      revenueByServiceType,
      groomerRevenue,
    },
    recentActivity,
    alerts,
    empty:
      income === 0 &&
      expenses === 0 &&
      servicesCount === 0 &&
      dailyExpenses.length === 0 &&
      petshopSales.length === 0,
  };
}
