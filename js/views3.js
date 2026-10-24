/* ------------------------------------ Menu ---------------------------------- */

function menuPage() {
  const sold = menuStats();
  const filtered =
    ui.menuFilter === "All" ? data.menu : data.menu.filter((item) => item.category === ui.menuFilter);
  const avgMargin = data.menu.length
    ? data.menu.reduce((sum, item) => sum + (item.price ? (item.price - item.cost) / item.price : 0), 0) /
      data.menu.length
    : 0;
  const avgPrice = data.menu.length ? data.menu.reduce((sum, item) => sum + item.price, 0) / data.menu.length : 0;
  const best = topItems(salesInRange(rangeFor("30d").startKey, rangeFor("30d").endKey), 1)[0];
  const categories = ["All", ...CATEGORY_ORDER];

  const cards = filtered
    .map((item) => {
      const category = CATEGORIES[item.category] || {
        color: "#8a8378",
        soft: "#f1eee8",
        ink: "#6c645a",
        icon: "burger",
      };
      const margin = item.price ? ((item.price - item.cost) / item.price) * 100 : 0;
      const low = margin < Number(data.settings.marginTarget || 0);
      return `<article class="menu-card">
        <div class="menu-top">
          <span class="menu-thumb" style="background:${category.soft};color:${category.ink}">${icon(item.icon || category.icon, 21)}</span>
          <div class="menu-actions">
            <button class="icon-btn" data-action="edit-menu" data-id="${item.id}" aria-label="Edit ${esc(item.name)}">${icon("edit", 14)}</button>
            <button class="icon-btn is-danger" data-action="delete-menu" data-id="${item.id}" aria-label="Delete ${esc(item.name)}">${icon("trash", 14)}</button>
          </div>
        </div>
        <h3 class="menu-name">${esc(item.name)}</h3>
        <div class="menu-cat">${esc(item.category)}</div>
        <div class="menu-stats">
          <div>
            <div class="menu-price">${money(item.price)}</div>
            <div class="menu-cost">Cost ${money(item.cost)}</div>
          </div>
          <div class="margin-box">
            <div class="margin-val" style="${low ? "color:var(--red)" : ""}">${margin.toFixed(0)}%</div>
            <div class="margin-bar"><span style="width:${clamp(margin, 0, 100)}%;${low ? "background:var(--red)" : ""}"></span></div>
          </div>
        </div>
        <div class="menu-sold">${icon("flame", 11)} ${sold[item.id] || 0} sold in last 30 days</div>
      </article>`;
    })
    .join("");

  const summary = `<div class="summary-strip">
    ${summaryCell({ iconName: "menu", label: "Menu items", value: String(data.menu.length), color: "#9c3410", soft: "#fee9de" })}
    ${summaryCell({ iconName: "chart", label: "Average margin", value: `${(avgMargin * 100).toFixed(0)}%`, color: "#147049", soft: "#e1f4ea" })}
    ${summaryCell({ iconName: "flame", label: "Top seller", value: best ? esc(best.name) : "—", color: "#8a6208", soft: "#fbf0d8" })}
    ${summaryCell({ iconName: "coins", label: "Average price", value: money(avgPrice), color: "#5b43a6", soft: "#eee9fb" })}
  </div>`;

  return `${summary}
    <div class="page-toolbar">
      <div class="segmented" aria-label="Menu category">
        ${categories
          .map(
            (category) =>
              `<button class="${ui.menuFilter === category ? "is-active" : ""}" data-action="menu-filter" data-cat="${category}">${category}</button>`
          )
          .join("")}
      </div>
      <div class="toolbar-spacer"></div>
      <span class="card-sub">${filtered.length} ${filtered.length === 1 ? "item" : "items"}</span>
    </div>
    <div class="menu-grid">
      ${cards}
      <button class="menu-add" data-action="new-item">
        <span class="add-circle">${icon("plus", 18)}</span>
        Add menu item
      </button>
    </div>`;
}

/* ---------------------------------- Reports --------------------------------- */

function reportsPage() {
  const cfg = rangeFor(ui.reportRange);
  const current = metricsFor(cfg.startKey, cfg.endKey);
  const previous = cfg.prevStartKey ? metricsFor(cfg.prevStartKey, cfg.prevEndKey) : null;
  const series = buildSeries(cfg);
  const sales = salesInRange(cfg.startKey, cfg.endKey);
  const expenses = expensesInRange(cfg.startKey, cfg.endKey);
  const breakdown = expenseBreakdown(expenses);
  const payments = paymentMix(sales);
  const products = topItems(sales, 8);
  const topCategory = topExpenseCategory(expenses);
  const maxExpense = breakdown.length ? breakdown[0].amount : 1;
  const best = bestDay(series);
  const marginPct = current.revenue ? (current.profit / current.revenue) * 100 : 0;
  const prevMarginPct = previous && previous.revenue ? (previous.profit / previous.revenue) * 100 : 0;
  const totalPayment = payments.reduce((sum, row) => sum + row.total, 0);
  const compareLabel = previous ? `vs previous ${cfg.days} days` : "no comparison";

  const kpis = [
    kpiCard({
      label: "Revenue",
      iconName: "sales",
      value: money(current.revenue),
      trend: trendBadge(current.revenue, previous ? previous.revenue : 0),
      compare: compareLabel,
      spark: sparkline(series.map((day) => day.sales), "report-sales"),
    }),
    kpiCard({
      label: "Expenses",
      iconName: "expenses",
      value: money(current.expenses),
      trend: trendBadge(current.expenses, previous ? previous.expenses : 0, { invert: true }),
      compare: compareLabel,
      spark: sparkline(series.map((day) => day.expenses), "report-expenses"),
    }),
    kpiCard({
      label: "Net profit",
      iconName: "coins",
      value: money(current.profit),
      trend: trendBadge(current.profit, previous ? previous.profit : 0),
      compare: compareLabel,
      spark: sparkline(series.map((day) => day.profit), "report-profit", true),
      dark: true,
    }),
    kpiCard({
      label: "Profit margin",
      iconName: "chart",
      value: `${marginPct.toFixed(1)}%`,
      trend: trendBadge(marginPct, prevMarginPct, { absolute: true, suffix: "pp" }),
      compare: previous ? `${prevMarginPct.toFixed(1)}% previous` : "current period",
      spark: sparkline(
        series.map((day) => (day.sales ? ((day.sales - day.expenses) / day.sales) * 100 : 0)),
        "report-margin"
      ),
    }),
  ].join("");

  const expenseRows = breakdown
    .map((row) => {
      const category = EXPENSE_CATEGORIES[row.category] || EXPENSE_CATEGORIES.Other;
      return `<div class="expense-bar-row">
        <div class="expense-bar-label"><span class="dot" style="background:${category.color}"></span>${esc(row.category)}</div>
        <div class="expense-bar-track"><span style="width:${Math.max(3, (row.amount / maxExpense) * 100)}%;background:${category.color}"></span></div>
        <div class="expense-bar-amount">${money(row.amount)}</div>
      </div>`;
    })
    .join("");

  const paymentRows = payments
    .map((row) => {
      const payment = PAYMENTS[row.payment] || PAYMENTS.cash;
      const share = totalPayment ? (row.total / totalPayment) * 100 : 0;
      return `<div class="payment-row">
        <span class="payment-icon">${icon(payment.icon, 15)}</span>
        <div>
          <div class="payment-name">${payment.label}</div>
          <div class="payment-sub">${row.count} orders · ${share.toFixed(0)}% of revenue</div>
          <div class="progress" style="margin-top:6px"><span style="width:${Math.max(3, share)}%"></span></div>
        </div>
        <div class="payment-amount">${money(row.total)}</div>
      </div>`;
    })
    .join("");

  const productRows = products
    .map((item) => {
      const category = CATEGORIES[item.category] || { soft: "#f1eee8", ink: "#6c645a", icon: "burger" };
      const gross = item.revenue - item.cost;
      return `<tr>
        <td>
          <div class="cell-tx">
            <span class="tx-icon" style="background:${category.soft};color:${category.ink}">${icon(item.icon || category.icon, 15)}</span>
            <div>
              <div class="cell-title">${esc(item.name)}</div>
              <div class="cell-sub">${esc(item.category)}</div>
            </div>
          </div>
        </td>
        <td>${item.units}</td>
        <td><div class="cell-amount">${money(item.revenue)}</div></td>
        <td class="hide-sm"><div class="cell-amount is-positive">${money(gross)}</div></td>
      </tr>`;
    })
    .join("");

  return `<div class="kpi-grid">${kpis}</div>
    <div class="reports-grid">
      <section class="card report-card">
        <div class="card-head">
          <div>
            <h2 class="card-title">Performance</h2>
            <p class="card-sub">Daily revenue and expenses · ${cfg.label.toLowerCase()}</p>
          </div>
          <div class="pill-group">
            ${[
              ["week", "Week"],
              ["month", "Month"],
              ["30d", "30D"],
              ["90d", "90D"],
            ]
              .map(
                ([key, label]) =>
                  `<button class="pill-btn ${ui.reportRange === key ? "is-active" : ""}" data-action="report-range" data-range="${key}">${label}</button>`
              )
              .join("")}
          </div>
        </div>
        <div class="chart-body" id="report-chart"></div>
        <div class="chart-footer">
          <div class="chart-legend">
            <span class="legend-item"><span class="legend-dot"></span>Revenue</span>
            <span class="legend-item"><span class="legend-dot is-expense"></span>Expenses</span>
          </div>
          <div class="chart-summary">Best day <strong>${best ? fmtShort(best.key) : "—"}</strong> · ${best ? money(best.sales) : money(0)}</div>
        </div>
      </section>
      <section class="card report-card">
        <div class="card-head">
          <div>
            <h2 class="card-title">Expense breakdown</h2>
            <p class="card-sub">Where the money went · ${cfg.label.toLowerCase()}</p>
          </div>
          <span class="count-chip">${money(current.expenses)}</span>
        </div>
        ${
          breakdown.length
            ? `<div class="expense-bars">${expenseRows}</div>
               <div class="report-insight">${icon("sparkles", 14)}<span><strong>${esc(topCategory.category)}</strong> is your largest cost at ${(topCategory.share * 100).toFixed(0)}% of total spending. ${
                 topCategory.category === "Ingredients"
                   ? "Review supplier prices weekly to protect your margin."
                   : "Keep an eye on this line as sales grow."
               }</span></div>`
            : emptyState("expenses", "No expenses recorded", "Add expenses to see a full cost breakdown.")
        }
      </section>
    </div>
    <div class="reports-grid">
      <section class="card table-card report-table-card">
        <div class="table-head">
          <div>
            <h2 class="card-title">Top products</h2>
            <p class="card-sub">Best sellers by revenue · ${cfg.label.toLowerCase()}</p>
          </div>
          <button class="link-btn" data-action="nav" data-page="menu">Manage menu ${icon("chevronRight", 12)}</button>
        </div>
        ${
          products.length
            ? `<div class="table-scroll">
                <table class="data-table">
                  <thead><tr><th>Item</th><th>Units</th><th>Revenue</th><th class="hide-sm">Gross margin</th></tr></thead>
                  <tbody>${productRows}</tbody>
                </table>
              </div>`
            : emptyState("bag", "No product data yet", "Record itemised sales to unlock product performance.")
        }
      </section>
      <section class="card report-card">
        <div class="card-head">
          <div>
            <h2 class="card-title">Payment mix</h2>
            <p class="card-sub">How customers are paying</p>
          </div>
        </div>
        ${payments.length ? `<div class="payment-list">${paymentRows}</div>` : emptyState("card", "No payments yet", "Payment breakdown appears after your first sale.")}
        <div class="report-insight">${icon("info", 14)}<span>Card and mobile payments are easier to reconcile. Count the cash drawer at close so every order is accounted for.</span></div>
      </section>
    </div>`;
}

/* ---------------------------------- Settings -------------------------------- */

function settingsPage() {
  const currencyOptions = CURRENCIES.map(
    ([code, name]) =>
      `<option value="${code}" ${data.settings.currency === code ? "selected" : ""}>${name} (${code})</option>`
  ).join("");

  return `<div class="settings-grid">
    <div>
      <section class="card settings-card">
        <div class="settings-head">
          <span class="settings-head-icon">${icon("store", 18)}</span>
          <div>
            <h2 class="card-title">Business profile</h2>
            <p class="card-sub">Used across your dashboard and reports.</p>
          </div>
        </div>
        <form id="settings-form">
          <div class="settings-grid-2">
            <div class="field">
              <label for="settings-name">Business name</label>
              <input id="settings-name" name="businessName" value="${esc(data.settings.businessName)}" maxlength="50" required />
            </div>
            <div class="field">
              <label for="settings-owner">Owner name</label>
              <input id="settings-owner" name="ownerName" value="${esc(data.settings.ownerName)}" maxlength="50" required />
            </div>
          </div>
          <div class="settings-grid-2" style="margin-top:13px">
            <div class="field">
              <label for="settings-currency">Currency</label>
              <select id="settings-currency" name="currency">${currencyOptions}</select>
            </div>
            <div class="field">
              <label for="settings-margin">Menu margin target (%)</label>
              <input id="settings-margin" name="marginTarget" type="number" min="0" max="100" step="1" value="${Number(data.settings.marginTarget) || 60}" />
              <span class="field-hint">Items below this margin get flagged on the menu.</span>
            </div>
          </div>
          <div class="form-actions">
            <button class="btn btn-primary" type="submit">${icon("check", 15)}Save changes</button>
          </div>
        </form>
      </section>

      <section class="card settings-card danger-zone">
        <div class="settings-head">
          <span class="settings-head-icon" style="background:#e7edfb;color:#3a5797">${icon("database", 18)}</span>
          <div>
            <h2 class="card-title">Data &amp; backup</h2>
            <p class="card-sub">Your records live in this browser. Export regularly.</p>
          </div>
        </div>
        <div class="data-row">
          <span class="data-row-icon">${icon("download", 16)}</span>
          <div class="data-row-main">
            <div class="data-row-title">Export transactions</div>
            <div class="data-row-sub">Download sales and expenses as a CSV file.</div>
          </div>
          <button class="btn btn-secondary btn-sm" data-action="export-csv">Export</button>
        </div>
        <div class="data-row">
          <span class="data-row-icon">${icon("file", 16)}</span>
          <div class="data-row-main">
            <div class="data-row-title">Full backup</div>
            <div class="data-row-sub">Save a JSON copy of menu and records.</div>
          </div>
          <button class="btn btn-secondary btn-sm" data-action="export-json">Backup</button>
        </div>
        <div class="data-row">
          <span class="data-row-icon">${icon("refresh", 16)}</span>
          <div class="data-row-main">
            <div class="data-row-title">Restore demo data</div>
            <div class="data-row-sub">Reset everything to the sample shop.</div>
          </div>
          <button class="btn btn-secondary btn-sm" data-action="reset-demo">Restore</button>
        </div>
        <div class="data-row">
          <span class="data-row-icon" style="background:#fbe9e7;border-color:#f2cfcb;color:#af352b">${icon("trash", 16)}</span>
          <div class="data-row-main">
            <div class="data-row-title">Clear all transactions</div>
            <div class="data-row-sub">Keep your menu, remove all sales and expenses.</div>
          </div>
          <button class="btn btn-secondary btn-sm" style="color:var(--red)" data-action="clear-data">Clear</button>
        </div>
      </section>
    </div>

    <div>
      <div class="tip-card">
        <div class="tip-label">${icon("sparkles", 12)} Daily habit</div>
        <h3 class="tip-title">Small margins, big wins.</h3>
        <p class="tip-text">Log sales and ingredient runs before closing. Ten seconds a day keeps your food cost honest and makes weekly reports effortless.</p>
      </div>
      <section class="card settings-card" style="margin-top:14px">
        <div class="settings-head">
          <span class="settings-head-icon" style="background:#e1f4ea;color:#147049">${icon("info", 18)}</span>
          <div>
            <h2 class="card-title">About FryLedger</h2>
            <p class="card-sub">Built for busy food counters.</p>
          </div>
        </div>
        <div class="about-row"><span>Version</span><span>1.0.0</span></div>
        <div class="about-row"><span>Business</span><span>${esc(data.settings.businessName)}</span></div>
        <div class="about-row"><span>Currency</span><span>${data.settings.currency}</span></div>
        <div class="about-row"><span>Storage</span><span>Local browser</span></div>
        <div class="about-row"><span>Records</span><span>${data.sales.length + data.expenses.length}</span></div>
        <div class="about-row"><span>Demo data</span><span>${data.demo ? "On" : "Off"}</span></div>
      </section>
    </div>
  </div>`;
}
