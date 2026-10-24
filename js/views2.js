/* ----------------------------------- Sales ---------------------------------- */

function salesPage() {
  return `<div class="page-toolbar">
      <div class="search-field">
        ${icon("search", 16)}
        <input id="sales-search" type="search" value="${esc(ui.salesSearch)}" placeholder="Search orders, items or notes" autocomplete="off" />
      </div>
      <div class="segmented" aria-label="Sales period">
        ${[
          ["today", "Today"],
          ["7d", "7 days"],
          ["30d", "30 days"],
          ["all", "All"],
        ]
          .map(
            ([key, label]) =>
              `<button class="${ui.salesRange === key ? "is-active" : ""}" data-action="sales-range" data-range="${key}">${label}</button>`
          )
          .join("")}
      </div>
      <div class="select-field">
        <select id="sales-payment-filter" aria-label="Filter by payment">
          <option value="all" ${ui.salesPayment === "all" ? "selected" : ""}>All payments</option>
          <option value="cash" ${ui.salesPayment === "cash" ? "selected" : ""}>Cash</option>
          <option value="card" ${ui.salesPayment === "card" ? "selected" : ""}>Card</option>
          <option value="mobile" ${ui.salesPayment === "mobile" ? "selected" : ""}>Mobile</option>
        </select>
        ${icon("chevronDown", 14)}
      </div>
      <div class="toolbar-spacer"></div>
      <button class="btn btn-secondary" data-action="export-csv">${icon("download", 15)}<span class="btn-label">Export</span></button>
    </div>
    <div id="sales-results">${salesResults()}</div>`;
}

function salesResults() {
  const cfg = rangeFor(ui.salesRange);
  let sales = searchSales(salesInRange(cfg.startKey, cfg.endKey), ui.salesSearch);
  if (ui.salesPayment !== "all") sales = sales.filter((sale) => sale.payment === ui.salesPayment);
  sales = sales.sort((a, b) => new Date(b.date) - new Date(a.date));

  const revenue = sales.reduce((sum, sale) => sum + sale.total, 0);
  const items = sales.reduce((sum, sale) => sum + sale.items.reduce((n, item) => n + item.qty, 0), 0);
  const avg = sales.length ? revenue / sales.length : 0;
  const shown = sales.slice(0, ui.salesLimit);

  const rows = shown
    .map(
      (sale) => `<tr>
        <td>
          <div class="cell-tx">
            <span class="tx-icon is-sale">${icon("receipt", 15)}</span>
            <div>
              <div class="cell-title">Order #${sale.code}</div>
              <div class="cell-sub">${fmtShort(sale.date)}, ${fmtTime(sale.date)}</div>
            </div>
          </div>
        </td>
        <td class="hide-sm"><div class="cell-items" title="${esc(itemsLabel(sale))}">${esc(itemsLabel(sale))}</div></td>
        <td class="hide-sm">${paymentBadge(sale.payment)}</td>
        <td><div class="cell-amount is-positive">+${money(sale.total)}</div></td>
        <td>
          <div class="row-actions">
            <button class="icon-btn" data-action="edit-sale" data-id="${sale.id}" aria-label="Edit order ${sale.code}">${icon("edit", 14)}</button>
            <button class="icon-btn is-danger" data-action="delete-sale" data-id="${sale.id}" aria-label="Delete order ${sale.code}">${icon("trash", 14)}</button>
          </div>
        </td>
      </tr>`
    )
    .join("");

  const summary = `<div class="summary-strip">
    ${summaryCell({ iconName: "receipt", label: "Revenue", value: money(revenue), color: "#9c3410", soft: "#fee9de" })}
    ${summaryCell({ iconName: "bag", label: "Orders", value: String(sales.length), color: "#3a5797", soft: "#e7edfb" })}
    ${summaryCell({ iconName: "coins", label: "Average order", value: money(avg), color: "#147049", soft: "#e1f4ea" })}
    ${summaryCell({ iconName: "box", label: "Items sold", value: String(items), color: "#5b43a6", soft: "#eee9fb" })}
  </div>`;

  const table = `<section class="card table-card">
    <div class="table-head">
      <div class="table-title-wrap">
        <h2 class="card-title">Transactions</h2>
        <span class="count-chip">${sales.length}</span>
      </div>
      <span class="card-sub">${cfg.label}${sales.length > shown.length ? ` · showing ${shown.length}` : ""}</span>
    </div>
    ${
      sales.length
        ? `<div class="table-scroll">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th class="hide-sm">Items</th>
                  <th class="hide-sm">Payment</th>
                  <th>Amount</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
          ${
            sales.length > shown.length
              ? `<div class="table-foot"><span>Showing ${shown.length} of ${plural(sales.length, "order")}</span><button class="btn btn-secondary btn-sm" data-action="sales-load">Load more</button></div>`
              : ""
          }`
        : emptyState("receipt", "No sales in this view", "Adjust your filters, or record a new sale to get started.")
    }
  </section>`;

  return summary + table;
}

/* --------------------------------- Expenses -------------------------------- */

function expensesPage() {
  const categories = Object.keys(EXPENSE_CATEGORIES);
  return `<div class="page-toolbar">
      <div class="search-field">
        ${icon("search", 16)}
        <input id="expense-search" type="search" value="${esc(ui.expenseSearch)}" placeholder="Search vendors or notes" autocomplete="off" />
      </div>
      <div class="segmented" aria-label="Expense period">
        ${[
          ["today", "Today"],
          ["7d", "7 days"],
          ["30d", "30 days"],
          ["all", "All"],
        ]
          .map(
            ([key, label]) =>
              `<button class="${ui.expenseRange === key ? "is-active" : ""}" data-action="expense-range" data-range="${key}">${label}</button>`
          )
          .join("")}
      </div>
      <div class="select-field">
        <select id="expense-category-filter" aria-label="Filter by category">
          <option value="all" ${ui.expenseCategory === "all" ? "selected" : ""}>All categories</option>
          ${categories
            .map(
              (category) =>
                `<option value="${category}" ${ui.expenseCategory === category ? "selected" : ""}>${category}</option>`
            )
            .join("")}
        </select>
        ${icon("chevronDown", 14)}
      </div>
      <div class="toolbar-spacer"></div>
      <button class="btn btn-secondary" data-action="export-csv">${icon("download", 15)}<span class="btn-label">Export</span></button>
    </div>
    <div id="expense-results">${expenseResults()}</div>`;
}

function expenseResults() {
  const cfg = rangeFor(ui.expenseRange);
  let expenses = searchExpenses(expensesInRange(cfg.startKey, cfg.endKey), ui.expenseSearch);
  if (ui.expenseCategory !== "all") expenses = expenses.filter((expense) => expense.category === ui.expenseCategory);
  expenses = expenses.sort((a, b) => new Date(b.date) - new Date(a.date));

  const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const avg = expenses.length ? total / expenses.length : 0;
  const top = topExpenseCategory(expenses);
  const shown = expenses.slice(0, ui.expenseLimit);

  const rows = shown
    .map((expense) => {
      const category = EXPENSE_CATEGORIES[expense.category] || EXPENSE_CATEGORIES.Other;
      return `<tr>
        <td>
          <div class="cell-tx">
            <span class="tx-icon is-expense">${icon(category.icon, 15)}</span>
            <div>
              <div class="cell-title">${esc(expense.vendor)}</div>
              <div class="cell-sub">${fmtShort(expense.date)}, ${fmtTime(expense.date)}${expense.note ? ` · ${esc(expense.note)}` : ""}</div>
            </div>
          </div>
        </td>
        <td class="hide-sm"><span class="badge" style="background:${category.soft};color:${category.ink}">${icon(category.icon, 11)}${esc(expense.category)}</span></td>
        <td class="hide-sm">${paymentBadge(expense.payment)}</td>
        <td><div class="cell-amount">−${money(expense.amount)}</div></td>
        <td>
          <div class="row-actions">
            <button class="icon-btn" data-action="edit-expense" data-id="${expense.id}" aria-label="Edit expense">${icon("edit", 14)}</button>
            <button class="icon-btn is-danger" data-action="delete-expense" data-id="${expense.id}" aria-label="Delete expense">${icon("trash", 14)}</button>
          </div>
        </td>
      </tr>`;
    })
    .join("");

  const summary = `<div class="summary-strip">
    ${summaryCell({ iconName: "expenses", label: "Total spent", value: money(total), color: "#af352b", soft: "#fbe9e7" })}
    ${summaryCell({ iconName: "receipt", label: "Entries", value: String(expenses.length), color: "#3a5797", soft: "#e7edfb" })}
    ${summaryCell({ iconName: "coins", label: "Average expense", value: money(avg), color: "#8a6208", soft: "#fbf0d8" })}
    ${summaryCell({
      iconName: top ? (EXPENSE_CATEGORIES[top.category] || {}).icon || "dots" : "dots",
      label: "Top category",
      value: top ? esc(top.category) : "—",
      color: "#5b43a6",
      soft: "#eee9fb",
    })}
  </div>`;

  const table = `<section class="card table-card">
    <div class="table-head">
      <div class="table-title-wrap">
        <h2 class="card-title">Expense log</h2>
        <span class="count-chip">${expenses.length}</span>
      </div>
      <span class="card-sub">${cfg.label}${expenses.length > shown.length ? ` · showing ${shown.length}` : ""}</span>
    </div>
    ${
      expenses.length
        ? `<div class="table-scroll">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Expense</th>
                  <th class="hide-sm">Category</th>
                  <th class="hide-sm">Payment</th>
                  <th>Amount</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
          ${
            expenses.length > shown.length
              ? `<div class="table-foot"><span>Showing ${shown.length} of ${plural(expenses.length, "expense")}</span><button class="btn btn-secondary btn-sm" data-action="expense-load">Load more</button></div>`
              : ""
          }`
        : emptyState("expenses", "No expenses in this view", "Adjust your filters, or add a cost to keep the books accurate.")
    }
  </section>`;

  return summary + table;
}
