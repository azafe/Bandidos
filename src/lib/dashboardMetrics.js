// src/lib/dashboardMetrics.js
function parseDateValue(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  const raw = String(value).trim();

  if (raw.includes("-")) {
    const parts = raw.split("-");
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
    Number(service.price || service.amount || service.total || 0) || 0;
  return {
    id: service.id,
    date: service.date || service.created_at || service.createdAt,
    amount,
    petName: service.dogName || service.pet?.name || "",
    customerName: service.ownerName || service.customer?.name || "",
    paymentMethod: service.paymentMethod || service.payment_method?.name || "",
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

  const fixedByDate = fixedExpenseOccurrences(fixedExpenses, rangeDays);
  const income = sumBy(services, (service) => service.amount);
  const dailyExpenseTotal = sumBy(dailyExpenses, (expense) => expense.amount);
  const fixedExpenseTotal = Array.from(fixedByDate.values()).reduce(
    (sum, value) => sum + value,
    0
  );
  const expenses = dailyExpenseTotal + fixedExpenseTotal;
  const profit = income - expenses;
  const margin = income > 0 ? profit / income : 0;
  const servicesCount = services.length;
  const avgTicket = servicesCount > 0 ? income / servicesCount : 0;

  const byDay = rangeDays.map((day) => {
    const key = formatDateKey(day);
    const dailyIncome = sumBy(
      services.filter((service) => formatDateKey(parseDateValue(service.date)) === key),
      (service) => service.amount
    );
    const dailyExpense = sumBy(
      dailyExpenses.filter(
        (expense) => formatDateKey(parseDateValue(expense.date)) === key
      ),
      (expense) => expense.amount
    );
    const fixedExpense = fixedByDate.get(key) || 0;
    const expenseTotal = dailyExpense + fixedExpense;
    return {
      date: key,
      income: dailyIncome,
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

  const expensesByCategory = Array.from(categoryTotals.entries()).map(
    ([name, value]) => ({ name, value })
  );

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
        expenses: percentDelta(expenses, previousMetrics.kpis.expenses),
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
      expenses,
      profit,
      margin,
      servicesCount,
      avgTicket,
      deltas,
    },
    series: {
      byDay,
      expensesByCategory,
    },
    recentActivity,
    alerts,
    empty:
      income === 0 &&
      expenses === 0 &&
      servicesCount === 0 &&
      dailyExpenses.length === 0,
  };
}
