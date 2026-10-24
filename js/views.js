function cleanupCharts() {
  chartObservers.forEach((observer) => {
    try {
      observer.disconnect();
    } catch {
      /* noop */
    }
  });
  chartObservers = [];
}

function render() {
  cleanupCharts();
  renderSidebar();
  renderTopbar();
  renderPage();
  renderMobileNav();
  document.title = `${PAGE_META[ui.page].title} · FryLedger`;
}

function renderSidebar() {
  const today = todayMetrics();
  const yesterday = today.yesterday.profit;
  const delta = yesterday ? ((today.today.profit - yesterday) / Math.abs(yesterday)) * 100 : null;
  const deltaUp = delta === null || delta >= 0;
  const deltaText =
    delta === null ? "New" : `${delta >= 0 ? "+" : ""}${Math.abs(delta) < 100 ? delta.toFixed(0) : delta.toFixed(0)}%`;
  const week = buildSeries(rangeFor("7d"));
  const maxProfit = Math.max(1, ...week.map((day) => day.profit));
  const bars = week
    .map((day, index) => {
      const height = 5 + Math.max(0, day.profit / maxProfit) * 20;
      const last = index === week.length - 1 ? ' style="height:' + Math.round(height) + 'px"' : ' style="height:' + Math.round(height) + 'px"';
      return `<span${last}></span>`;
    })
    .join("");

  const groups = [
    {
      label: "Workspace",
      items: [
        { page: "dashboard", label: "Dashboard", icon: "dashboard" },
        { page: "sales", label: "Sales", icon: "sales", badge: today.today.orders },
        { page: "expenses", label: "Expenses", icon: "expenses", badge: today.today.entries },
        { page: "menu", label: "Menu", icon: "menu" },
      ],
    },
    {
      label: "Insights",
      items: [
        { page: "reports", label: "Reports", icon: "reports" },
        { page: "settings", label: "Settings", icon: "settings" },
      ],
    },
  ];

  const nav = groups
    .map((group) => {
      const items = group.items
        .map(
          (item) => `<button class="nav-item ${ui.page === item.page ? "is-active" : ""}" data-action="nav" data-page="${item.page}">
            <span class="nav-icon">${icon(item.icon, 17)}</span>
            <span>${item.label}</span>
            ${item.badge ? `<span class="nav-badge">${item.badge}</span>` : ""}
          </button>`
        )
        .join("");
      return `<div class="nav-group"><div class="nav-label">${group.label}</div><nav class="nav">${items}</nav></div>`;
    })
    .join("");

  document.getElementById("sidebar").innerHTML = `
    <div class="brand">
      <span class="brand-mark">${icon("burger", 22)}</span>
      <div>
        <div class="brand-name">FryLedger</div>
        <div class="brand-sub">Fast food finance</div>
      </div>
    </div>
    ${nav}
    <div class="sidebar-spacer"></div>
    <div class="snapshot">
      <div class="snapshot-label">${icon("coins", 12)} Today's net profit</div>
      <div class="snapshot-value">${money(today.today.profit)}</div>
      <div class="snapshot-meta">
        <span class="snapshot-delta ${deltaUp ? "" : "is-down"}">
          ${icon(deltaUp ? "arrowUpRight" : "arrowDownRight", 10)}${deltaText}
        </span>
        <span>vs yesterday</span>
      </div>
      <div class="snapshot-bars">${bars}</div>
    </div>
    <div class="account">
      <div class="avatar">${initials(data.settings.ownerName)}</div>
      <div>
        <div class="account-name">${esc(data.settings.ownerName)}</div>
        <div class="account-role">Owner · ${esc(data.settings.businessName)}</div>
      </div>
      <button class="account-btn" data-action="nav" data-page="settings" aria-label="Open settings">${icon("settings", 15)}</button>
    </div>`;
}

function renderTopbar() {
  const meta = PAGE_META[ui.page];
  let actions = "";
  const newSale = `<button class="btn btn-primary" data-action="new-sale">${icon("plus", 15)}<span class="btn-label">New sale</span></button>`;
  const newExpense = `<button class="btn btn-secondary" data-action="new-expense">${icon("expenses", 15)}<span class="btn-label">Add expense</span></button>`;

  if (ui.page === "dashboard") {
    actions = `${newExpense}${newSale}`;
  } else if (ui.page === "sales") {
    actions = `${newSale}`;
  } else if (ui.page === "expenses") {
    actions = `<button class="btn btn-primary" data-action="new-expense">${icon("plus", 15)}<span class="btn-label">Add expense</span></button>`;
  } else if (ui.page === "menu") {
    actions = `<button class="btn btn-primary" data-action="new-item">${icon("plus", 15)}<span class="btn-label">New item</span></button>`;
  } else if (ui.page === "reports") {
    actions = `<button class="btn btn-secondary is-export-action" data-action="export-csv" aria-label="Export report">${icon("download", 15)}<span class="btn-label">Export report</span></button>`;
  } else if (ui.page === "settings") {
    actions = `<span class="badge badge-green">${icon("shield", 11)} Saved locally</span>`;
  }

  document.getElementById("topbar").innerHTML = `
    <div class="topbar-left">
      <div class="mobile-brand">
        <span class="brand-mark">${icon("burger", 18)}</span>
        <div>
          <div class="brand-name">FryLedger</div>
          <div class="brand-sub">Fast food finance</div>
        </div>
      </div>
      <p class="eyebrow"><span class="dot"></span>${fmtLongDate()} · ${esc(data.settings.businessName)}</p>
      <h1>${meta.title}</h1>
      <p class="topbar-subtitle">${meta.subtitle(esc(data.settings.businessName))}</p>
    </div>
    <div class="topbar-actions">${actions}</div>`;
}

function renderMobileNav() {
  const items = [
    { page: "dashboard", label: "Home", icon: "dashboard" },
    { page: "sales", label: "Sales", icon: "sales" },
  ];
  const items2 = [
    { page: "expenses", label: "Expenses", icon: "expenses" },
    { action: "mobile-more", label: "More", icon: "dots" },
  ];
  const navBtn = (item) =>
    `<button class="mobile-nav-item ${ui.page === item.page ? "is-active" : ""}" ${
      item.action ? `data-action="${item.action}"` : `data-action="nav" data-page="${item.page}"`
    }>${icon(item.icon, 20)}<span>${item.label}</span></button>`;

  document.getElementById("mobile-nav").innerHTML = `
    ${items.map(navBtn).join("")}
    <button class="mobile-add" data-action="new-sale" aria-label="New sale">${icon("plus", 22)}</button>
    ${items2.map(navBtn).join("")}`;
}

function renderPage() {
  const page = document.getElementById("page");
  let html = "";
  if (ui.page === "dashboard") html = dashboardPage();
  else if (ui.page === "sales") html = salesPage();
  else if (ui.page === "expenses") html = expensesPage();
  else if (ui.page === "menu") html = menuPage();
  else if (ui.page === "reports") html = reportsPage();
  else if (ui.page === "settings") html = settingsPage();
  page.innerHTML = html;

  if (ui.page === "dashboard") {
    const cfg = rangeFor(`${ui.dashRange}d`);
    mountLineChart("cash-chart", buildSeries(cfg), "cash", { range: ui.dashRange });
  }
  if (ui.page === "reports") {
    const cfg = rangeFor(ui.reportRange);
    mountLineChart("report-chart", buildSeries(cfg), "report", { range: cfg.days });
  }
}

/* --------------------------------- Fragments ------------------------------- */

function kpiCard({ label, iconName, value, trend = "", compare = "", spark = "", dark = false }) {
  return `<div class="kpi-card ${dark ? "is-dark" : ""}">
    <div class="kpi-head">
      <div class="kpi-label"><span class="kpi-icon">${icon(iconName, 15)}</span>${label}</div>
    </div>
    <div class="kpi-value">${value}</div>
    <div class="kpi-foot">${trend}<span class="kpi-compare">${compare}</span></div>
    ${spark}
  </div>`;
}

function summaryCell({ iconName, label, value, color, soft }) {
  return `<div class="summary-cell">
    <span class="summary-icon" style="background:${soft};color:${color}">${icon(iconName, 16)}</span>
    <div>
      <div class="summary-label">${label}</div>
      <div class="summary-value">${value}</div>
    </div>
  </div>`;
}

function paymentBadge(payment) {
  const p = PAYMENTS[payment] || PAYMENTS.cash;
  return `<span class="badge badge-neutral">${icon(p.icon, 11)}${p.label}</span>`;
}

function emptyState(iconName, title, sub) {
  return `<div class="empty">
    <div class="empty-icon">${icon(iconName, 21)}</div>
    <div class="empty-title">${title}</div>
    <div class="empty-sub">${sub}</div>
  </div>`;
}

function donutMarkup(mix, total, caption) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  let segments = "";
  if (total > 0) {
    mix.forEach((row) => {
      const category = CATEGORIES[row.category] || { color: "#b8afa3" };
      const share = row.revenue / total;
      const length = Math.max(share * circumference - 4, 1.5);
      segments += `<circle class="donut-seg" cx="69" cy="69" r="${radius}" stroke="${category.color}" stroke-dasharray="${length} ${circumference - length}" stroke-dashoffset="${-offset}"></circle>`;
      offset += share * circumference;
    });
  } else {
    segments = `<circle cx="69" cy="69" r="${radius}" fill="none" stroke="#f1ece4" stroke-width="17"></circle>`;
  }
  const legend = mix
    .map((row) => {
      const category = CATEGORIES[row.category] || { color: "#b8afa3" };
      const pct = total ? (row.revenue / total) * 100 : 0;
      return `<div class="mix-legend-row">
        <span class="mix-swatch" style="background:${category.color}"></span>
        <span class="mix-name">${esc(row.category)}</span>
        <span class="mix-value">${compactMoney(row.revenue)}<span class="mix-pct">${pct.toFixed(0)}%</span></span>
      </div>`;
    })
    .join("");

  return `<div class="donut-wrap">
    <div class="donut">
      <svg viewBox="0 0 138 138" aria-label="Sales by category">${segments}</svg>
      <div class="donut-center">
        <div class="donut-total">${compactMoney(total)}</div>
        <div class="donut-caption">${caption}</div>
      </div>
    </div>
    <div class="mix-legend">${legend || '<div class="mix-name">No sales yet</div>'}</div>
  </div>`;
}

/* -------------------------------- Dashboard -------------------------------- */

function dashboardPage() {
  const cfg = rangeFor(`${ui.dashRange}d`);
  const series = buildSeries(cfg);
  const mix = categoryMix(salesInRange(cfg.startKey, cfg.endKey));
  const mixTotal = mix.reduce((sum, row) => sum + row.revenue, 0);
  const sellers = topItems(salesInRange(cfg.startKey, cfg.endKey), 5);
  const maxRevenue = sellers.length ? sellers[0].revenue : 1;
  const recent = [...data.sales.map((sale) => ({ type: "sale", date: sale.date, record: sale })),
    ...data.expenses.map((expense) => ({ type: "expense", date: expense.date, record: expense }))]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 6);

  const today = todayMetrics();
  const series7 = buildSeries(rangeFor("7d"));
  const revSeries = series.map((day) => day.sales);
  const expSeries = series.map((day) => day.expenses);
  const profitSeries = series.map((day) => day.profit);
  const ordersSeries = series.map((day) => {
    const daySaleCount = data.sales.filter((sale) => dayKey(new Date(sale.date)) === day.key).length;
    return daySaleCount;
  });
  const spark7profit = series7.map((day) => day.profit);
  const spark7sales = series7.map((day) => day.sales);
  const spark7exp = series7.map((day) => day.expenses);
  const spark7orders = series7.map((day) => data.sales.filter((sale) => dayKey(new Date(sale.date)) === day.key).length);
  const recentBest = bestDay(series);
  const avgProfit = series.length ? series.reduce((sum, day) => sum + day.profit, 0) / series.length : 0;

  const kpis = [
    kpiCard({
      label: "Net profit",
      iconName: "coins",
      value: money(today.today.profit),
      trend: trendBadge(today.today.profit, today.yesterday.profit),
      compare: "vs yesterday",
      spark: sparkline(spark7profit, "profit", true),
      dark: true,
    }),
    kpiCard({
      label: "Sales revenue",
      iconName: "sales",
      value: money(today.today.revenue),
      trend: trendBadge(today.today.revenue, today.yesterday.revenue),
      compare: "vs yesterday",
      spark: sparkline(spark7sales, "sales"),
    }),
    kpiCard({
      label: "Expenses",
      iconName: "expenses",
      value: money(today.today.expenses),
      trend: trendBadge(today.today.expenses, today.yesterday.expenses, { invert: true }),
      compare: "vs yesterday",
      spark: sparkline(spark7exp, "expense"),
    }),
    kpiCard({
      label: "Orders today",
      iconName: "bag",
      value: String(today.today.orders),
      trend: trendBadge(today.today.orders, today.yesterday.orders),
      compare: `${money(today.today.avgOrder)} avg order`,
      spark: sparkline(spark7orders, "orders"),
    }),
  ].join("");

  const activity = recent
    .map((entry) => {
      if (entry.type === "sale") {
        const sale = entry.record;
        return `<div class="tx-row">
          <div class="tx-icon is-sale">${icon("receipt", 16)}</div>
          <div class="tx-main">
            <div class="tx-title">Order #${sale.code}</div>
            <div class="tx-meta">${itemsLabel(sale)} · ${relativeTime(sale.date)}</div>
          </div>
          <div class="tx-amount is-sale">+${money(sale.total)}</div>
        </div>`;
      }
      const expense = entry.record;
      return `<div class="tx-row">
        <div class="tx-icon is-expense">${icon((EXPENSE_CATEGORIES[expense.category] || {}).icon || "expenses", 16)}</div>
        <div class="tx-main">
          <div class="tx-title">${esc(expense.vendor)}</div>
          <div class="tx-meta">${esc(expense.category)} · ${relativeTime(expense.date)}</div>
        </div>
        <div class="tx-amount is-expense">−${money(expense.amount)}</div>
      </div>`;
    })
    .join("");

  const sellerRows = sellers
    .map(
      (item, index) => `<div class="rank-row">
        <span class="rank-num">${String(index + 1).padStart(2, "0")}</span>
        <span class="rank-thumb">${icon(item.icon, 15)}</span>
        <div class="rank-main">
          <div class="rank-top"><span>${esc(item.name)}</span><span class="rank-revenue">${money(item.revenue)}</span></div>
          <div class="progress"><span style="width:${Math.max(6, (item.revenue / maxRevenue) * 100)}%"></span></div>
        </div>
        <span class="rank-qty">${item.units} sold</span>
      </div>`
    )
    .join("");

  return `<div class="kpi-grid">${kpis}</div>
    <div class="dash-grid">
      <section class="card chart-card">
        <div class="card-head">
          <div>
            <h2 class="card-title">Cash flow</h2>
            <p class="card-sub">Sales and operating expenses over time</p>
          </div>
          <div class="pill-group">
            <button class="pill-btn ${ui.dashRange === 7 ? "is-active" : ""}" data-action="dash-range" data-range="7">7 days</button>
            <button class="pill-btn ${ui.dashRange === 30 ? "is-active" : ""}" data-action="dash-range" data-range="30">30 days</button>
          </div>
        </div>
        <div class="chart-body" id="cash-chart"></div>
        <div class="chart-footer">
          <div class="chart-legend">
            <span class="legend-item"><span class="legend-dot"></span>Revenue</span>
            <span class="legend-item"><span class="legend-dot is-expense"></span>Expenses</span>
          </div>
          <div class="chart-summary">Avg daily profit <strong>${money(avgProfit)}</strong> · Best day <strong>${recentBest ? fmtShort(recentBest.key) : "—"}</strong></div>
        </div>
      </section>
      <section class="card mix-card">
        <div class="card-head">
          <div>
            <h2 class="card-title">Sales mix</h2>
            <p class="card-sub">Revenue by category · last ${ui.dashRange} days</p>
          </div>
          <button class="link-btn" data-action="nav" data-page="reports">Details ${icon("chevronRight", 12)}</button>
        </div>
        ${donutMarkup(mix, mixTotal, `Last ${ui.dashRange}d`)}
      </section>
    </div>
    <div class="dash-grid lower">
      <section class="card activity-card">
        <div class="card-head">
          <div>
            <h2 class="card-title">Recent activity</h2>
            <p class="card-sub">Latest orders and expenses</p>
          </div>
          <button class="link-btn" data-action="nav" data-page="sales">View sales ${icon("chevronRight", 12)}</button>
        </div>
        <div class="tx-list">${activity || emptyState("receipt", "No activity yet", "Record your first sale or expense to see it here.")}</div>
      </section>
      <section class="card activity-card">
        <div class="card-head">
          <div>
            <h2 class="card-title">Top sellers</h2>
            <p class="card-sub">By revenue · last ${ui.dashRange} days</p>
          </div>
          <button class="link-btn" data-action="nav" data-page="menu">Menu ${icon("chevronRight", 12)}</button>
        </div>
        <div class="rank-list">${sellerRows || emptyState("bag", "No items sold yet", "Sales will reveal your best performing menu items.")}</div>
      </section>
    </div>`;
}

/* ---------------------------------- Chart ---------------------------------- */

function mountLineChart(containerId, series, prefix, options = {}) {
  const container = document.getElementById(containerId);
  if (!container || !series.length) return;
  let lastWidth = 0;
  let lastHeight = 0;

  const axisText = (value) => {
    if (Math.abs(value) >= 1000) return compactMoney(value);
    const rounded = Math.round(value * 10) / 10;
    return `${currencySymbol()}${rounded.toLocaleString("en-US", { maximumFractionDigits: 1 })}`;
  };

  const draw = () => {
    const width = Math.max(280, Math.floor(container.clientWidth));
    const height = window.innerWidth <= 700 ? 195 : 236;
    if (!width || (width === lastWidth && height === lastHeight)) return;
    lastWidth = width;
    lastHeight = height;

    const padL = width < 430 ? 36 : 46;
    const padR = 10;
    const padT = 15;
    const padB = 26;
    const plotW = width - padL - padR;
    const plotH = height - padT - padB;
    const n = series.length;
    const maxValue = niceMax(Math.max(...series.map((day) => Math.max(day.sales, day.expenses)), 1) * 1.1);
    const xAt = (i) => (n === 1 ? padL + plotW / 2 : padL + (i * plotW) / (n - 1));
    const yAt = (value) => padT + plotH - (value / maxValue) * plotH;
    const baseY = padT + plotH;

    const salesPoints = series.map((day, i) => ({ x: xAt(i), y: yAt(day.sales), day }));
    const expensePoints = series.map((day, i) => ({ x: xAt(i), y: yAt(day.expenses), day }));
    const salesPath = smoothLine(salesPoints);
    const expensePath = smoothLine(expensePoints);
    const areaPath = `${salesPath} L${salesPoints[salesPoints.length - 1].x},${baseY} L${salesPoints[0].x},${baseY} Z`;

    let grid = "";
    for (let i = 0; i <= 4; i++) {
      const value = (maxValue * i) / 4;
      const y = yAt(value);
      grid += `<line class="chart-grid-line" x1="${padL}" y1="${y}" x2="${width - padR}" y2="${y}"></line>`;
      grid += `<text class="chart-axis-text" x="${padL - 8}" y="${y + 3}" text-anchor="end">${axisText(value)}</text>`;
    }

    const step = n <= 8 ? 1 : n <= 16 ? 2 : Math.ceil(n / 6);
    let lastLabelX = -999;
    let labels = "";
    series.forEach((day, i) => {
      const isLast = i === n - 1;
      if (i % step !== 0 && !isLast) return;
      const x = xAt(i);
      if (x - lastLabelX < (n <= 8 ? 40 : 54)) return;
      lastLabelX = x;
      const label = n <= 8 ? fmtWeekday(day.key) : fmtShort(day.key);
      labels += `<text class="chart-axis-text" x="${x}" y="${height - 7}" text-anchor="middle">${label}</text>`;
    });

    let hits = "";
    series.forEach((day, i) => {
      hits += `<circle class="chart-hit" cx="${xAt(i)}" cy="${yAt(day.sales)}" r="11" fill="transparent" data-index="${i}" style="cursor:pointer"></circle>`;
    });

    const lastPoint = salesPoints[salesPoints.length - 1];
    const lastExpense = expensePoints[expensePoints.length - 1];

    container.innerHTML = `<svg class="line-chart" viewBox="0 0 ${width} ${height}" width="100%" height="${height}" role="img" aria-label="Sales and expenses chart">
      <defs>
        <linearGradient id="area-${prefix}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#f15a24" stop-opacity="0.22"></stop>
          <stop offset="1" stop-color="#f15a24" stop-opacity="0"></stop>
        </linearGradient>
      </defs>
      ${grid}
      <path d="${areaPath}" fill="url(#area-${prefix})"></path>
      <path class="chart-line-expense" d="${expensePath}"></path>
      <path class="chart-line" d="${salesPath}"></path>
      <circle class="chart-point is-expense" cx="${lastExpense.x}" cy="${lastExpense.y}" r="2.7"></circle>
      <circle class="chart-point" cx="${lastPoint.x}" cy="${lastPoint.y}" r="3.2"></circle>
      <circle id="${prefix}-active" class="chart-point" cx="${lastPoint.x}" cy="${lastPoint.y}" r="4" style="display:none"></circle>
      ${hits}
      ${labels}
    </svg>
    <div class="chart-tooltip" id="${prefix}-tooltip"></div>`;

    const tooltip = container.querySelector(`#${prefix}-tooltip`);
    const active = container.querySelector(`#${prefix}-active`);

    container.querySelectorAll(".chart-hit").forEach((hit) => {
      hit.addEventListener("pointerenter", () => {
        const index = Number(hit.dataset.index);
        const day = series[index];
        const x = xAt(index);
        tooltip.innerHTML = `<div class="chart-tooltip-date">${fmtDate(day.key, {
          weekday: "short",
          month: "short",
          day: "numeric",
        })}</div>
          <div class="chart-tooltip-row"><span><i class="tooltip-swatch"></i>Sales</span><strong>${money(day.sales)}</strong></div>
          <div class="chart-tooltip-row"><span><i class="tooltip-swatch is-expense"></i>Expenses</span><strong>${money(day.expenses)}</strong></div>
          <div class="chart-tooltip-row"><span>Profit</span><strong>${money(day.profit)}</strong></div>`;
        tooltip.style.left = `${clamp(x, 72, width - 72)}px`;
        tooltip.style.top = `${Math.max(yAt(day.sales), 82)}px`;
        tooltip.classList.add("is-visible");
        active.setAttribute("cx", x);
        active.setAttribute("cy", yAt(day.sales));
        active.style.display = "";
      });
    });

    container.addEventListener("pointerleave", () => {
      tooltip.classList.remove("is-visible");
      active.style.display = "none";
    });
  };

  draw();
  const observer = new ResizeObserver(() => {
    if (container.clientWidth && Math.abs(container.clientWidth - lastWidth) > 1) draw();
  });
  observer.observe(container);
  chartObservers.push(observer);
}
