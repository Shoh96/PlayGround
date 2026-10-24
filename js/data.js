const CATEGORIES = {
  Burgers: { icon: "burger", color: "#f15a24", soft: "#fee9de", ink: "#9c3410" },
  Sides: { icon: "fries", color: "#e3a008", soft: "#fbf0d8", ink: "#8a6208" },
  Drinks: { icon: "drink", color: "#3d8f8a", soft: "#e2f2f0", ink: "#236a66" },
  Combos: { icon: "combo", color: "#7b61c9", soft: "#eee9fb", ink: "#5b43a6" },
  Wraps: { icon: "wrap", color: "#c0507a", soft: "#fbe7ef", ink: "#9b365d" },
};

const CATEGORY_ORDER = ["Burgers", "Sides", "Drinks", "Combos", "Wraps"];

const EXPENSE_CATEGORIES = {
  Ingredients: { icon: "basket", color: "#f15a24", soft: "#fee9de", ink: "#9c3410" },
  Packaging: { icon: "box", color: "#b8791b", soft: "#fbf0d8", ink: "#8a6208" },
  Payroll: { icon: "users", color: "#1c8a5b", soft: "#e1f4ea", ink: "#147049" },
  Rent: { icon: "store", color: "#4d6fb8", soft: "#e7edfb", ink: "#3a5797" },
  Utilities: { icon: "bolt", color: "#7b61c9", soft: "#eee9fb", ink: "#5b43a6" },
  Marketing: { icon: "megaphone", color: "#c0507a", soft: "#fbe7ef", ink: "#9b365d" },
  Equipment: { icon: "tool", color: "#6f7772", soft: "#eff0ee", ink: "#4c534f" },
  Other: { icon: "dots", color: "#8a8378", soft: "#f1eee8", ink: "#6c645a" },
};

const PAYMENTS = {
  cash: { label: "Cash", icon: "cash" },
  card: { label: "Card", icon: "card" },
  mobile: { label: "Mobile", icon: "phone" },
};

const BASE_MENU = [
  { name: "Classic Burger", category: "Burgers", price: 3250, cost: 1050, icon: "burger" },
  { name: "Double Smash", category: "Burgers", price: 4750, cost: 1700, icon: "burger" },
  { name: "Crispy Chicken", category: "Burgers", price: 3750, cost: 1400, icon: "burger" },
  { name: "Chicken Wrap", category: "Wraps", price: 3450, cost: 1200, icon: "wrap" },
  { name: "Classic Fries", category: "Sides", price: 1750, cost: 450, icon: "fries" },
  { name: "Loaded Fries", category: "Sides", price: 2750, cost: 800, icon: "fries" },
  { name: "Onion Rings", category: "Sides", price: 2250, cost: 600, icon: "rings" },
  { name: "Cola", category: "Drinks", price: 1250, cost: 225, icon: "drink" },
  { name: "Lemonade", category: "Drinks", price: 1500, cost: 300, icon: "drink" },
  { name: "Milkshake", category: "Drinks", price: 2250, cost: 600, icon: "drink" },
  { name: "Combo Meal", category: "Combos", price: 5750, cost: 2100, icon: "combo" },
  { name: "Kids Meal", category: "Combos", price: 3500, cost: 1150, icon: "combo" },
];

const WEIGHTS = {
  "Classic Burger": 20,
  "Double Smash": 11,
  "Crispy Chicken": 13,
  "Chicken Wrap": 8,
  "Classic Fries": 17,
  "Loaded Fries": 9,
  "Onion Rings": 6,
  Cola: 18,
  Lemonade: 8,
  Milkshake: 7,
  "Combo Meal": 13,
  "Kids Meal": 6,
};

const CURRENCIES = [
  ["XAF", "Cameroon CFA franc"],
  ["USD", "US Dollar"],
  ["EUR", "Euro"],
  ["GBP", "British Pound"],
  ["CAD", "Canadian Dollar"],
  ["AUD", "Australian Dollar"],
  ["INR", "Indian Rupee"],
  ["BDT", "Bangladeshi Taka"],
  ["NGN", "Nigerian Naira"],
  ["PHP", "Philippine Peso"],
  ["IDR", "Indonesian Rupiah"],
  ["PKR", "Pakistani Rupee"],
  ["MXN", "Mexican Peso"],
  ["BRL", "Brazilian Real"],
  ["ZAR", "South African Rand"],
  ["KES", "Kenyan Shilling"],
  ["AED", "UAE Dirham"],
  ["SAR", "Saudi Riyal"],
  ["TRY", "Turkish Lira"],
  ["JPY", "Japanese Yen"],
  ["KRW", "South Korean Won"],
  ["CNY", "Chinese Yuan"],
];

const STORAGE_KEY = "fryledger:v1";
const DEMO_VERSION = 2;

const PAGE_META = {
  dashboard: { title: "Dashboard", subtitle: (name) => `Here's how ${name} is doing today.` },
  sales: { title: "Sales", subtitle: () => "Every order, payment and item in one place." },
  expenses: { title: "Expenses", subtitle: () => "Keep ingredient, staff and operating costs in check." },
  menu: { title: "Menu", subtitle: () => "Your menu, pricing and product margins." },
  reports: { title: "Reports", subtitle: (name) => `Understand what's driving profit at ${name}.` },
  settings: { title: "Settings", subtitle: () => "Business profile, currency and data controls." },
};

const ui = {
  page: "dashboard",
  dashRange: 7,
  reportRange: "30d",
  salesRange: "30d",
  salesPayment: "all",
  salesSearch: "",
  salesLimit: 12,
  expenseRange: "30d",
  expenseCategory: "all",
  expenseSearch: "",
  expenseLimit: 12,
  menuFilter: "All",
};

let data;
let saleDraft = null;
let expenseDraft = null;
let menuDraft = null;
let pendingConfirm = null;
let chartObservers = [];

/* ---------------------------------- Seed ---------------------------------- */

function seedState() {
  const now = new Date();
  const menu = BASE_MENU.map((item, index) => ({ ...item, id: `m${index + 1}` }));
  const sales = [];
  const expenses = [];
  const rng = mulberry32(20261024);
  const pool = [];
  menu.forEach((item) => {
    const weight = WEIGHTS[item.name] || 6;
    for (let i = 0; i < weight; i++) pool.push(item);
  });

  let code = 1042;
  let salesId = 1;
  let expenseId = 1;

  const addExpense = (date, category, vendor, amount, payment, note) => {
    expenses.push({
      id: `e${expenseId++}`,
      date: date.toISOString(),
      category,
      vendor,
      amount: round2(amount),
      payment,
      note: note || "",
    });
  };

  for (let offset = 74; offset >= 0; offset--) {
    const day = new Date(now);
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() - offset);
    const dow = day.getDay();
    let orderCount = 7 + Math.floor(rng() * 5) + (dow === 0 || dow === 5 || dow === 6 ? 2 : 0);
    if (offset >= 30) orderCount = Math.max(4, orderCount - 1);
    if (offset === 0) orderCount = Math.max(orderCount, 12);
    let dayTotal = 0;

    for (let i = 0; i < orderCount; i++) {
      const saleDate = new Date(day);
      const maxHour = offset === 0 ? Math.max(11, Math.min(21, now.getHours() - 1)) : 21;
      const hour = 11 + Math.floor(rng() * (maxHour - 11 + 1));
      saleDate.setHours(hour, Math.floor(rng() * 60), 0, 0);

      const lineCount = 1 + (rng() < 0.5 ? 1 : 0) + (rng() < 0.2 ? 1 : 0);
      const used = new Set();
      const lines = [];
      for (let j = 0; j < lineCount; j++) {
        let item = pool[Math.floor(rng() * pool.length)];
        let guard = 0;
        while (used.has(item.id) && guard++ < 8) {
          item = pool[Math.floor(rng() * pool.length)];
        }
        used.add(item.id);
        const qty = 1 + (rng() < 0.2 ? 1 : 0) + (rng() < 0.05 ? 1 : 0);
        lines.push({
          id: item.id,
          name: item.name,
          category: item.category,
          icon: item.icon,
          price: item.price,
          cost: item.cost,
          qty,
        });
        dayTotal += item.price * qty;
      }

      const roll = rng();
      const payment = roll < 0.36 ? "cash" : roll < 0.76 ? "card" : "mobile";
      sales.push({
        id: `s${salesId++}`,
        code: code++,
        date: saleDate.toISOString(),
        items: lines,
        total: round2(lines.reduce((sum, line) => sum + line.price * line.qty, 0)),
        payment,
        note: "",
      });
    }

    if (dayTotal > 0) {
      const ingredientDate = new Date(day);
      ingredientDate.setHours(9, 10, 0, 0);
      addExpense(
        ingredientDate,
        "Ingredients",
        "Metro Food Supply",
        dayTotal * (0.27 + rng() * 0.06),
        "card",
        "Daily produce, meat and dairy run"
      );

      const packagingDate = new Date(day);
      packagingDate.setHours(9, 25, 0, 0);
      addExpense(
        packagingDate,
        "Packaging",
        "PackRight Co.",
        1000 + dayTotal * 0.035 + rng() * 2000,
        "cash",
        "Boxes, bags and wraps"
      );
    }

    if (offset % 7 === 0 && offset !== 0) {
      const payrollDate = new Date(day);
      payrollDate.setHours(18, 0, 0, 0);
      addExpense(payrollDate, "Payroll", "Kitchen team payroll", 90000, "card", "Weekly shift payout");
    }

    if (day.getDate() === 1) {
      const rentDate = new Date(day);
      rentDate.setHours(8, 0, 0, 0);
      addExpense(rentDate, "Rent", "Unit 14 lease", 240000, "card", "Monthly shop rent");
    }

    if (offset % 9 === 2) {
      const utilityDate = new Date(day);
      utilityDate.setHours(10, 0, 0, 0);
      addExpense(utilityDate, "Utilities", "City Power & Water", 24000 + rng() * 12000, "card", "Electricity and water");
    }

    if (offset % 13 === 4) {
      const marketingDate = new Date(day);
      marketingDate.setHours(12, 0, 0, 0);
      addExpense(marketingDate, "Marketing", "Local ads boost", 12000 + rng() * 8000, "card", "Neighborhood promotion");
    }

    if (offset === 20) {
      const equipmentDate = new Date(day);
      equipmentDate.setHours(14, 0, 0, 0);
      addExpense(equipmentDate, "Equipment", "GrillWorks", 44500, "card", "Replacement fryer basket");
    }
  }

  return {
    version: 1,
    demoVersion: DEMO_VERSION,
    demo: true,
    seedDate: dayKey(),
    settings: {
      businessName: "Crispy Corner",
      ownerName: "Alex Morgan",
      currency: "XAF",
      marginTarget: 60,
    },
    menu,
    sales,
    expenses,
    meta: {
      nextOrder: code,
      nextSaleId: salesId,
      nextExpenseId: expenseId,
      nextMenuId: menu.length + 1,
    },
  };
}

/* -------------------------------- Persistence ------------------------------ */

function loadData() {
  let raw = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    raw = null;
  }
  if (!raw) return seedState();

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return seedState();
  }
  if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.sales)) return seedState();

  if (parsed.demo && parsed.demoVersion !== DEMO_VERSION) {
    resetCurrencyCache();
    return seedState();
  }

  if (parsed.demo && parsed.seedDate !== dayKey()) {
    const fresh = seedState();
    fresh.settings = { ...fresh.settings, ...parsed.settings };
    resetCurrencyCache();
    return fresh;
  }
  return parsed;
}

function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* Storage may be unavailable; the app still works for this session. */
  }
}

/* --------------------------------- Analytics ------------------------------- */

function todayMetrics() {
  const key = dayKey();
  const yesterday = addDaysKey(key, -1);
  return {
    today: metricsFor(key, key),
    yesterday: metricsFor(yesterday, yesterday),
  };
}

function metricsFor(startKey, endKey) {
  let revenue = 0;
  let orders = 0;
  let items = 0;
  data.sales.forEach((sale) => {
    const key = dayKey(new Date(sale.date));
    if (key >= startKey && key <= endKey) {
      revenue += sale.total;
      orders += 1;
      sale.items.forEach((item) => {
        items += item.qty;
      });
    }
  });
  let expenseTotal = 0;
  let entries = 0;
  data.expenses.forEach((expense) => {
    const key = dayKey(new Date(expense.date));
    if (key >= startKey && key <= endKey) {
      expenseTotal += expense.amount;
      entries += 1;
    }
  });
  return {
    revenue: round2(revenue),
    expenses: round2(expenseTotal),
    profit: round2(revenue - expenseTotal),
    orders,
    items,
    entries,
    avgOrder: orders ? round2(revenue / orders) : 0,
    margin: revenue ? (revenue - expenseTotal) / revenue : 0,
  };
}

function rangeFor(key) {
  const today = dayKey();
  if (key === "today") {
    return {
      key,
      label: "Today",
      description: "Today",
      startKey: today,
      endKey: today,
      days: 1,
      prevStartKey: addDaysKey(today, -1),
      prevEndKey: addDaysKey(today, -1),
    };
  }
  if (key === "7d" || key === "30d" || key === "90d") {
    const days = Number(key.replace("d", ""));
    const startKey = addDaysKey(today, -(days - 1));
    return {
      key,
      label: days === 7 ? "Last 7 days" : `Last ${days} days`,
      description: days === 7 ? "Last 7 days" : `Last ${days} days`,
      startKey,
      endKey: today,
      days,
      prevStartKey: addDaysKey(startKey, -days),
      prevEndKey: addDaysKey(startKey, -1),
    };
  }
  if (key === "week") {
    const d = new Date();
    const offset = (d.getDay() + 6) % 7;
    const startKey = addDaysKey(today, -offset);
    const days = offset + 1;
    return {
      key,
      label: "This week",
      description: "This week",
      startKey,
      endKey: today,
      days,
      prevStartKey: addDaysKey(startKey, -7),
      prevEndKey: addDaysKey(startKey, -1),
    };
  }
  if (key === "month") {
    const d = new Date();
    const startKey = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`;
    const days = Number(today.slice(8, 10));
    return {
      key,
      label: "This month",
      description: "This month",
      startKey,
      endKey: today,
      days,
      prevStartKey: addDaysKey(startKey, -days),
      prevEndKey: addDaysKey(startKey, -1),
    };
  }
  const keys = [];
  data.sales.forEach((sale) => keys.push(dayKey(new Date(sale.date))));
  data.expenses.forEach((expense) => keys.push(dayKey(new Date(expense.date))));
  const startKey = keys.length ? keys.sort()[0] : today;
  const endKey = today;
  const days = Math.max(1, Math.round((dateFromKey(endKey) - dateFromKey(startKey)) / 86400000) + 1);
  return {
    key: "all",
    label: "All time",
    description: "All time",
    startKey,
    endKey,
    days,
    prevStartKey: null,
    prevEndKey: null,
  };
}

function salesInRange(startKey, endKey) {
  return data.sales.filter((sale) => {
    const key = dayKey(new Date(sale.date));
    return key >= startKey && key <= endKey;
  });
}

function expensesInRange(startKey, endKey) {
  return data.expenses.filter((expense) => {
    const key = dayKey(new Date(expense.date));
    return key >= startKey && key <= endKey;
  });
}

function buildSeries(cfg) {
  const salesMap = {};
  const expenseMap = {};
  data.sales.forEach((sale) => {
    const key = dayKey(new Date(sale.date));
    salesMap[key] = (salesMap[key] || 0) + sale.total;
  });
  data.expenses.forEach((expense) => {
    const key = dayKey(new Date(expense.date));
    expenseMap[key] = (expenseMap[key] || 0) + expense.amount;
  });
  const series = [];
  for (let i = 0; i < cfg.days; i++) {
    const key = addDaysKey(cfg.startKey, i);
    const sales = round2(salesMap[key] || 0);
    const expenses = round2(expenseMap[key] || 0);
    series.push({
      key,
      date: dateFromKey(key),
      sales,
      expenses,
      profit: round2(sales - expenses),
    });
  }
  return series;
}

function categoryMix(sales) {
  const byCategory = {};
  sales.forEach((sale) => {
    sale.items.forEach((item) => {
      const category = item.category || "Other";
      if (!byCategory[category]) byCategory[category] = { category, revenue: 0, units: 0 };
      byCategory[category].revenue += item.price * item.qty;
      byCategory[category].units += item.qty;
    });
  });
  return Object.values(byCategory).sort((a, b) => b.revenue - a.revenue);
}

function topItems(sales, limit = 5) {
  const byItem = {};
  sales.forEach((sale) => {
    sale.items.forEach((item) => {
      const id = item.id || item.name;
      if (!byItem[id]) {
        byItem[id] = {
          id,
          name: item.name,
          category: item.category || "Other",
          icon: item.icon || (CATEGORIES[item.category] || {}).icon || "burger",
          units: 0,
          revenue: 0,
          cost: 0,
        };
      }
      byItem[id].units += item.qty;
      byItem[id].revenue += item.price * item.qty;
      byItem[id].cost += item.cost * item.qty;
    });
  });
  return Object.values(byItem)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}

function expenseBreakdown(expenses) {
  const byCategory = {};
  expenses.forEach((expense) => {
    const category = expense.category || "Other";
    if (!byCategory[category]) byCategory[category] = { category, amount: 0, entries: 0 };
    byCategory[category].amount += expense.amount;
    byCategory[category].entries += 1;
  });
  return Object.values(byCategory).sort((a, b) => b.amount - a.amount);
}

function paymentMix(sales) {
  const map = {};
  sales.forEach((sale) => {
    const payment = sale.payment || "cash";
    if (!map[payment]) map[payment] = { payment, total: 0, count: 0 };
    map[payment].total += sale.total;
    map[payment].count += 1;
  });
  return Object.values(map).sort((a, b) => b.total - a.total);
}

function menuStats() {
  const cfg = rangeFor("30d");
  const recent = salesInRange(cfg.startKey, cfg.endKey);
  const sold = {};
  recent.forEach((sale) => {
    sale.items.forEach((item) => {
      sold[item.id] = (sold[item.id] || 0) + item.qty;
    });
  });
  return sold;
}

function searchSales(sales, query) {
  if (!query) return sales;
  const q = query.toLowerCase();
  return sales.filter((sale) => {
    const blob = `${sale.code} ${sale.payment} ${sale.note || ""} ${sale.items
      .map((item) => item.name)
      .join(" ")}`.toLowerCase();
    return blob.includes(q);
  });
}

function searchExpenses(expenses, query) {
  if (!query) return expenses;
  const q = query.toLowerCase();
  return expenses.filter((expense) => {
    return `${expense.vendor} ${expense.category} ${expense.note || ""} ${expense.payment}`
      .toLowerCase()
      .includes(q);
  });
}

function itemsLabel(sale) {
  const first = sale.items[0];
  if (!first) return "No items";
  const totalQty = sale.items.reduce((sum, item) => sum + item.qty, 0);
  if (sale.items.length === 1) return `${first.name} × ${first.qty}`;
  return `${first.name} + ${sale.items.length - 1} more · ${plural(totalQty, "item")}`;
}

function topExpenseCategory(expenses) {
  const breakdown = expenseBreakdown(expenses);
  if (!breakdown.length) return null;
  const total = breakdown.reduce((sum, row) => sum + row.amount, 0);
  return { ...breakdown[0], share: total ? breakdown[0].amount / total : 0 };
}

function bestDay(series) {
  if (!series.length || !series.some((day) => day.sales > 0)) return null;
  return series.reduce((best, day) => (day.sales > best.sales ? day : best), series[0]);
}
