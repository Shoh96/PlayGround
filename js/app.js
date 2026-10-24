/* ---------------------------------- Modals ---------------------------------- */

function modalHead(eyebrow, title, sub) {
  return `<div class="modal-head">
    <div>
      <div class="modal-eyebrow">${eyebrow}</div>
      <h2 class="modal-title">${title}</h2>
      ${sub ? `<p class="modal-sub">${sub}</p>` : ""}
    </div>
    <button class="modal-close" data-action="modal-close" aria-label="Close dialog">${icon("x", 15)}</button>
  </div>`;
}

function openModal(content, options = {}) {
  const root = document.getElementById("modal-root");
  root.innerHTML = `<div class="modal-backdrop" data-modal-backdrop>
    <div class="modal ${options.wide ? "is-wide" : ""}" role="dialog" aria-modal="true">${content}</div>
  </div>`;
  document.body.style.overflow = "hidden";
  const backdrop = root.querySelector("[data-modal-backdrop]");
  backdrop.addEventListener("mousedown", (event) => {
    if (event.target === backdrop) closeModal();
  });
  requestAnimationFrame(() => {
    const focusable =
      root.querySelector("input:not([type=hidden]), select, textarea") || root.querySelector("button");
    if (focusable) focusable.focus({ preventScroll: true });
  });
}

function closeModal() {
  document.getElementById("modal-root").innerHTML = "";
  document.body.style.overflow = "";
  saleDraft = null;
  expenseDraft = null;
  menuDraft = null;
  pendingConfirm = null;
}

/* ---------------------------------- Sales ----------------------------------- */

function openSaleModal(id) {
  const existing = id ? data.sales.find((sale) => sale.id === id) : null;
  saleDraft = {
    editingId: id || null,
    items: {},
    payment: existing ? existing.payment : "card",
  };
  if (existing) {
    existing.items.forEach((item) => {
      saleDraft.items[item.id] = (saleDraft.items[item.id] || 0) + item.qty;
    });
  }

  const paymentButtons = Object.entries(PAYMENTS)
    .map(
      ([key, payment]) => `<button class="pay-option ${saleDraft.payment === key ? "is-active" : ""}" data-action="sale-payment" data-pay="${key}">
        ${icon(payment.icon, 15)}${payment.label}
      </button>`
    )
    .join("");

  const picker = data.menu
    .map((item) => {
      const category = CATEGORIES[item.category] || { soft: "#f1eee8", ink: "#6c645a", icon: "burger" };
      return `<button class="picker-item" data-action="sale-pick" data-id="${item.id}">
        <span class="picker-thumb" style="background:${category.soft};color:${category.ink}">${icon(item.icon || category.icon, 16)}</span>
        <span class="picker-main">
          <span class="picker-name">${esc(item.name)}</span>
          <span class="picker-price">${money(item.price)}</span>
        </span>
        <span class="picker-add">${icon("plus", 12)}</span>
      </button>`;
    })
    .join("");

  openModal(
    `${modalHead(
      existing ? "Edit order" : "New sale",
      existing ? `Order #${existing.code}` : "Record a sale",
      existing ? "Update the items, payment or time for this order." : "Add items and take payment in a few taps."
    )}
    <div class="modal-body">
      <div class="field">
        <label for="sale-date">Date &amp; time</label>
        <input id="sale-date" type="datetime-local" />
      </div>
      <div class="form-section-label">Add items</div>
      <div class="item-picker">${picker || '<div class="cart-empty">Your menu is empty. Add a menu item first.</div>'}</div>
      <div class="form-section-label">Order summary</div>
      <div class="cart" id="sale-cart"></div>
      <div class="form-section-label">Payment method</div>
      <div class="pay-options">${paymentButtons}</div>
      <div class="field" style="margin-top:14px">
        <label for="sale-note">Note (optional)</label>
        <input id="sale-note" placeholder="e.g. extra sauce, delivery order" maxlength="80" />
      </div>
    </div>
    <div class="modal-foot">
      <div class="modal-total"><span class="modal-total-label">Total</span><span class="modal-total-value" id="sale-total">${money(0)}</span></div>
      <div class="modal-foot-right">
        <button class="btn btn-secondary" data-action="modal-close">Cancel</button>
        <button class="btn btn-primary" data-action="save-sale">${icon("check", 15)}${existing ? "Update sale" : "Save sale"}</button>
      </div>
    </div>`,
    { wide: true }
  );

  document.getElementById("sale-date").value = toLocalInput(existing ? existing.date : new Date().toISOString());
  document.getElementById("sale-note").value = existing ? existing.note || "" : "";
  refreshSaleCart();
}

function saleLines() {
  if (!saleDraft) return [];
  return Object.entries(saleDraft.items)
    .map(([id, qty]) => {
      const item = data.menu.find((menuItem) => menuItem.id === id);
      if (!item || qty <= 0) return null;
      return {
        id: item.id,
        name: item.name,
        category: item.category,
        icon: item.icon,
        price: item.price,
        cost: item.cost,
        qty,
      };
    })
    .filter(Boolean);
}

function refreshSaleCart() {
  const cart = document.getElementById("sale-cart");
  if (!cart || !saleDraft) return;
  const lines = saleLines();
  const total = lines.reduce((sum, line) => sum + line.price * line.qty, 0);

  cart.innerHTML = lines.length
    ? lines
        .map(
          (line) => `<div class="cart-row">
            <div class="cart-main">
              <div class="cart-name">${esc(line.name)}</div>
              <div class="cart-price">${money(line.price)} each</div>
            </div>
            <div class="qty-stepper">
              <button data-action="sale-dec" data-id="${line.id}" aria-label="Remove one ${esc(line.name)}">${icon("minus", 11)}</button>
              <span>${line.qty}</span>
              <button data-action="sale-inc" data-id="${line.id}" aria-label="Add one ${esc(line.name)}">${icon("plus", 11)}</button>
            </div>
            <div class="cart-line-total">${money(line.price * line.qty)}</div>
            <button class="icon-btn is-danger" data-action="sale-remove" data-id="${line.id}" aria-label="Remove ${esc(line.name)}">${icon("x", 13)}</button>
          </div>`
        )
        .join("")
    : '<div class="cart-empty">Tap items above to build this order.</div>';

  const totalEl = document.getElementById("sale-total");
  if (totalEl) totalEl.textContent = money(total);
}

function saveSale() {
  if (!saleDraft) return;
  const lines = saleLines();
  if (!lines.length) {
    showToast("Add at least one item before saving.", "error");
    return;
  }
  const dateInput = document.getElementById("sale-date");
  const noteInput = document.getElementById("sale-note");
  const date = dateInput && dateInput.value ? new Date(dateInput.value).toISOString() : new Date().toISOString();
  const total = round2(lines.reduce((sum, line) => sum + line.price * line.qty, 0));
  const note = noteInput ? noteInput.value.trim() : "";

  if (saleDraft.editingId) {
    const sale = data.sales.find((item) => item.id === saleDraft.editingId);
    if (sale) {
      sale.date = date;
      sale.items = lines;
      sale.total = total;
      sale.payment = saleDraft.payment;
      sale.note = note;
      saveData();
      closeModal();
      render();
      showToast(`Order #${sale.code} updated.`);
    }
    return;
  }

  const code = data.meta.nextOrder++;
  const sale = {
    id: `s${data.meta.nextSaleId++}`,
    code,
    date,
    items: lines,
    total,
    payment: saleDraft.payment,
    note,
  };
  data.sales.push(sale);
  saveData();
  closeModal();
  render();
  showToast(`Sale #${code} recorded · ${money(total)}`);
}

/* --------------------------------- Expenses --------------------------------- */

function openExpenseModal(id) {
  const existing = id ? data.expenses.find((expense) => expense.id === id) : null;
  expenseDraft = {
    editingId: id || null,
    category: existing ? existing.category : "Ingredients",
    payment: existing ? existing.payment : "card",
  };

  const categoryButtons = Object.entries(EXPENSE_CATEGORIES)
    .map(
      ([key, category]) => `<button class="cat-option ${expenseDraft.category === key ? "is-active" : ""}" data-action="expense-category" data-cat="${key}">
        ${icon(category.icon, 15)}<span>${key}</span>
      </button>`
    )
    .join("");

  const paymentButtons = Object.entries(PAYMENTS)
    .map(
      ([key, payment]) => `<button class="pay-option ${expenseDraft.payment === key ? "is-active" : ""}" data-action="expense-payment" data-pay="${key}">
        ${icon(payment.icon, 15)}${payment.label}
      </button>`
    )
    .join("");

  openModal(
    `${modalHead(
      existing ? "Edit expense" : "New expense",
      existing ? "Update this cost" : "Add an expense",
      "Ingredients, packaging, rent, wages and more."
    )}
    <div class="modal-body">
      <div class="form-row">
        <div class="field">
          <label for="expense-amount">Amount</label>
          <input id="expense-amount" type="number" min="0.01" step="0.01" placeholder="0.00" required />
        </div>
        <div class="field">
          <label for="expense-date">Date &amp; time</label>
          <input id="expense-date" type="datetime-local" />
        </div>
      </div>
      <div class="field">
        <label for="expense-vendor">Vendor / paid to</label>
        <input id="expense-vendor" placeholder="e.g. Metro Food Supply" maxlength="60" />
      </div>
      <div class="form-section-label">Category</div>
      <div class="cat-picker">${categoryButtons}</div>
      <div class="form-section-label">Payment method</div>
      <div class="pay-options">${paymentButtons}</div>
      <div class="field" style="margin-top:14px">
        <label for="expense-note">Note (optional)</label>
        <input id="expense-note" placeholder="e.g. weekly produce run" maxlength="80" />
      </div>
    </div>
    <div class="modal-foot">
      <div class="modal-total"><span class="modal-total-label">Expense</span><span class="modal-total-value" id="expense-preview">${money(0)}</span></div>
      <div class="modal-foot-right">
        <button class="btn btn-secondary" data-action="modal-close">Cancel</button>
        <button class="btn btn-primary" data-action="save-expense">${icon("check", 15)}${existing ? "Update expense" : "Save expense"}</button>
      </div>
    </div>`
  );

  document.getElementById("expense-amount").value = existing ? existing.amount : "";
  document.getElementById("expense-vendor").value = existing ? existing.vendor : "";
  document.getElementById("expense-date").value = toLocalInput(existing ? existing.date : new Date().toISOString());
  document.getElementById("expense-note").value = existing ? existing.note || "" : "";
  updateExpensePreview();
}

function updateExpensePreview() {
  const amount = Number(document.getElementById("expense-amount")?.value) || 0;
  const preview = document.getElementById("expense-preview");
  if (preview) preview.textContent = money(amount);
}

function saveExpense() {
  if (!expenseDraft) return;
  const amountInput = document.getElementById("expense-amount");
  const vendorInput = document.getElementById("expense-vendor");
  const dateInput = document.getElementById("expense-date");
  const noteInput = document.getElementById("expense-note");
  const amount = Number(amountInput.value);

  if (!amount || amount <= 0) {
    showToast("Enter an amount greater than zero.", "error");
    amountInput.focus();
    return;
  }

  const payload = {
    amount: round2(amount),
    vendor: vendorInput.value.trim() || expenseDraft.category,
    date: dateInput.value ? new Date(dateInput.value).toISOString() : new Date().toISOString(),
    category: expenseDraft.category,
    payment: expenseDraft.payment,
    note: noteInput.value.trim(),
  };

  if (expenseDraft.editingId) {
    const expense = data.expenses.find((item) => item.id === expenseDraft.editingId);
    if (expense) Object.assign(expense, payload);
    saveData();
    closeModal();
    render();
    showToast("Expense updated.");
    return;
  }

  data.expenses.push({ id: `e${data.meta.nextExpenseId++}`, ...payload });
  saveData();
  closeModal();
  render();
  showToast(`Expense of ${money(payload.amount)} added.`);
}

/* ----------------------------------- Menu ----------------------------------- */

function openMenuModal(id) {
  const existing = id ? data.menu.find((item) => item.id === id) : null;
  menuDraft = {
    editingId: id || null,
    category: existing ? existing.category : "Burgers",
    icon: existing ? existing.icon : "burger",
    originalCategory: existing ? existing.category : null,
  };

  const categoryButtons = CATEGORY_ORDER.map(
    (category) => `<button class="cat-option ${menuDraft.category === category ? "is-active" : ""}" data-action="menu-category" data-cat="${category}">
      ${icon(CATEGORIES[category].icon, 15)}<span>${category}</span>
    </button>`
  ).join("");

  openModal(
    `${modalHead(
      existing ? "Edit menu item" : "New menu item",
      existing ? esc(existing.name) : "Add to your menu",
      "Set the selling price and food cost to track item margin."
    )}
    <div class="modal-body">
      <div class="field">
        <label for="menu-name">Item name</label>
        <input id="menu-name" placeholder="e.g. Spicy Chicken Burger" maxlength="50" required />
      </div>
      <div class="form-section-label">Category</div>
      <div class="cat-picker">${categoryButtons}</div>
      <div class="form-row" style="margin-top:14px">
        <div class="field">
          <label for="menu-price">Selling price</label>
          <input id="menu-price" type="number" min="0.01" step="0.01" placeholder="0.00" />
        </div>
        <div class="field">
          <label for="menu-cost">Food cost</label>
          <input id="menu-cost" type="number" min="0" step="0.01" placeholder="0.00" />
        </div>
      </div>
      <div class="report-insight" style="margin-top:14px">${icon("sparkles", 14)}<span>Item margin <strong id="menu-margin-preview">0%</strong> — aim for at least ${Number(data.settings.marginTarget) || 60}% to cover rent, wages and overhead.</span></div>
    </div>
    <div class="modal-foot">
      <div class="modal-total"><span class="modal-total-label">Item margin</span><span class="modal-total-value" id="menu-margin-total">0%</span></div>
      <div class="modal-foot-right">
        <button class="btn btn-secondary" data-action="modal-close">Cancel</button>
        <button class="btn btn-primary" data-action="save-menu">${icon("check", 15)}${existing ? "Update item" : "Add item"}</button>
      </div>
    </div>`
  );

  document.getElementById("menu-name").value = existing ? existing.name : "";
  document.getElementById("menu-price").value = existing ? existing.price : "";
  document.getElementById("menu-cost").value = existing ? existing.cost : "";
  updateMenuMargin();
}

function updateMenuMargin() {
  const price = Number(document.getElementById("menu-price")?.value) || 0;
  const cost = Number(document.getElementById("menu-cost")?.value) || 0;
  const margin = price > 0 ? ((price - cost) / price) * 100 : 0;
  const preview = document.getElementById("menu-margin-preview");
  const total = document.getElementById("menu-margin-total");
  if (preview) preview.textContent = `${margin.toFixed(0)}%`;
  if (total) total.textContent = `${margin.toFixed(0)}%`;
}

function saveMenu() {
  if (!menuDraft) return;
  const nameInput = document.getElementById("menu-name");
  const priceInput = document.getElementById("menu-price");
  const costInput = document.getElementById("menu-cost");
  const name = nameInput.value.trim();
  const price = Number(priceInput.value);
  const cost = Number(costInput.value);

  if (!name) {
    showToast("Give this menu item a name.", "error");
    nameInput.focus();
    return;
  }
  if (!price || price <= 0) {
    showToast("Enter a selling price greater than zero.", "error");
    priceInput.focus();
    return;
  }
  if (!Number.isFinite(cost) || cost < 0) {
    showToast("Food cost cannot be negative.", "error");
    costInput.focus();
    return;
  }

  const iconName =
    menuDraft.editingId && menuDraft.category === menuDraft.originalCategory
      ? menuDraft.icon
      : CATEGORIES[menuDraft.category].icon;

  if (menuDraft.editingId) {
    const item = data.menu.find((menuItem) => menuItem.id === menuDraft.editingId);
    if (item) {
      item.name = name;
      item.category = menuDraft.category;
      item.price = round2(price);
      item.cost = round2(cost);
      item.icon = iconName;
    }
    saveData();
    closeModal();
    render();
    showToast(`${name} updated.`);
    return;
  }

  data.menu.push({
    id: `m${data.meta.nextMenuId++}`,
    name,
    category: menuDraft.category,
    price: round2(price),
    cost: round2(cost),
    icon: iconName,
  });
  saveData();
  closeModal();
  render();
  showToast(`${name} added to the menu.`);
}

/* --------------------------------- Confirm ---------------------------------- */

function openConfirm({ title, message, label = "Delete", onConfirm }) {
  pendingConfirm = onConfirm;
  openModal(`${modalHead("Please confirm", title, "")}
    <div class="modal-body" style="padding-top:0">
      <div class="confirm-icon">${icon("alert", 20)}</div>
      <p class="confirm-text" style="margin-top:0">${message}</p>
    </div>
    <div class="modal-foot" style="border-top:0;background:transparent">
      <div class="modal-foot-right">
        <button class="btn btn-secondary" data-action="modal-close">Cancel</button>
        <button class="btn btn-danger" data-action="confirm-action">${label}</button>
      </div>
    </div>`);
}

/* -------------------------------- Quick more -------------------------------- */

function openMobileMore() {
  const items = [
    { page: "menu", icon: "menu", title: "Menu", sub: "Items, prices and margins" },
    { page: "reports", icon: "reports", title: "Reports", sub: "Trends and breakdowns" },
    { page: "settings", icon: "settings", title: "Settings", sub: "Business and data" },
  ];
  openModal(`${modalHead("Quick access", "More", "Jump to another part of FryLedger.")}
    <div class="modal-body">
      <div class="quick-grid">
        ${items
          .map(
            (item) => `<button class="quick-item" data-action="nav" data-page="${item.page}">
              <span class="quick-icon">${icon(item.icon, 19)}</span>
              <span><strong>${item.title}</strong><small>${item.sub}</small></span>
            </button>`
          )
          .join("")}
        <button class="quick-item" data-action="new-expense">
          <span class="quick-icon">${icon("expenses", 19)}</span>
          <span><strong>Add expense</strong><small>Log a new cost</small></span>
        </button>
      </div>
    </div>`);
}

/* ---------------------------------- Toasts ---------------------------------- */

function showToast(message, type = "success") {
  const root = document.getElementById("toast-root");
  const toast = document.createElement("div");
  toast.className = `toast ${type === "error" ? "is-error" : ""}`;
  toast.innerHTML = `<span class="toast-icon">${icon(type === "error" ? "alert" : "check", 13)}</span><span>${esc(message)}</span>`;
  root.appendChild(toast);
  setTimeout(() => {
    toast.classList.add("is-leaving");
    setTimeout(() => toast.remove(), 260);
  }, 2600);
}

/* ---------------------------------- Exports --------------------------------- */

function exportCsv() {
  const range =
    ui.page === "sales"
      ? rangeFor(ui.salesRange)
      : ui.page === "expenses"
        ? rangeFor(ui.expenseRange)
        : ui.page === "reports"
          ? rangeFor(ui.reportRange)
          : rangeFor("all");

  let sales = salesInRange(range.startKey, range.endKey);
  let expenses = expensesInRange(range.startKey, range.endKey);
  if (ui.page === "sales") {
    sales = searchSales(sales, ui.salesSearch);
    if (ui.salesPayment !== "all") sales = sales.filter((sale) => sale.payment === ui.salesPayment);
    expenses = [];
  }
  if (ui.page === "expenses") {
    expenses = searchExpenses(expenses, ui.expenseSearch);
    if (ui.expenseCategory !== "all") expenses = expenses.filter((expense) => expense.category === ui.expenseCategory);
    sales = [];
  }

  const rows = [["Type", "Date", "Reference", "Details", "Payment", "Amount"]];
  sales
    .slice()
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .forEach((sale) => {
      rows.push([
        "Sale",
        new Date(sale.date).toLocaleString("en-US"),
        `#${sale.code}`,
        sale.items.map((item) => `${item.name} x${item.qty}`).join("; "),
        (PAYMENTS[sale.payment] || PAYMENTS.cash).label,
        sale.total.toFixed(2),
      ]);
    });
  expenses
    .slice()
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .forEach((expense) => {
      rows.push([
        "Expense",
        new Date(expense.date).toLocaleString("en-US"),
        expense.vendor,
        expense.category + (expense.note ? ` — ${expense.note}` : ""),
        (PAYMENTS[expense.payment] || PAYMENTS.cash).label,
        expense.amount.toFixed(2),
      ]);
    });

  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
  downloadFile(`fryledger-${range.startKey}-to-${range.endKey}.csv`, csv, "text/csv;charset=utf-8");
  showToast(`Exported ${plural(rows.length - 1, "transaction")}.`);
}

function exportJson() {
  downloadFile(`fryledger-backup-${dayKey()}.json`, JSON.stringify(data, null, 2), "application/json");
  showToast("Backup downloaded.");
}

/* ----------------------------------- Events --------------------------------- */

function refreshSalesResults() {
  const target = document.getElementById("sales-results");
  if (target) target.innerHTML = salesResults();
}

function refreshExpenseResults() {
  const target = document.getElementById("expense-results");
  if (target) target.innerHTML = expenseResults();
}

function handleAction(actionEl) {
  const action = actionEl.dataset.action;
  if (!action) return;

  switch (action) {
    case "nav": {
      const modalOpen = !!document.getElementById("modal-root").innerHTML;
      if (modalOpen) closeModal();
      ui.page = actionEl.dataset.page;
      render();
      window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
      break;
    }
    case "new-sale":
      if (document.getElementById("modal-root").innerHTML) closeModal();
      openSaleModal();
      break;
    case "new-expense":
      if (document.getElementById("modal-root").innerHTML) closeModal();
      openExpenseModal();
      break;
    case "new-item":
      if (document.getElementById("modal-root").innerHTML) closeModal();
      openMenuModal();
      break;
    case "edit-sale":
      openSaleModal(actionEl.dataset.id);
      break;
    case "delete-sale": {
      const sale = data.sales.find((item) => item.id === actionEl.dataset.id);
      if (!sale) return;
      openConfirm({
        title: `Delete order #${sale.code}?`,
        message: `${itemsLabel(sale)} · ${money(sale.total)}. This cannot be undone.`,
        onConfirm: () => {
          data.sales = data.sales.filter((item) => item.id !== sale.id);
          saveData();
          render();
          showToast(`Order #${sale.code} deleted.`);
        },
      });
      break;
    }
    case "edit-expense":
      openExpenseModal(actionEl.dataset.id);
      break;
    case "delete-expense": {
      const expense = data.expenses.find((item) => item.id === actionEl.dataset.id);
      if (!expense) return;
      openConfirm({
        title: "Delete this expense?",
        message: `${expense.vendor} · ${expense.category} · ${money(expense.amount)}. This cannot be undone.`,
        onConfirm: () => {
          data.expenses = data.expenses.filter((item) => item.id !== expense.id);
          saveData();
          render();
          showToast("Expense deleted.");
        },
      });
      break;
    }
    case "edit-menu":
      openMenuModal(actionEl.dataset.id);
      break;
    case "delete-menu": {
      const item = data.menu.find((menuItem) => menuItem.id === actionEl.dataset.id);
      if (!item) return;
      openConfirm({
        title: `Remove ${item.name}?`,
        message: "The item will disappear from your menu. Past sales keep their item snapshots.",
        onConfirm: () => {
          data.menu = data.menu.filter((menuItem) => menuItem.id !== item.id);
          saveData();
          render();
          showToast(`${item.name} removed.`);
        },
      });
      break;
    }
    case "sale-pick": {
      if (!saleDraft) return;
      const id = actionEl.dataset.id;
      saleDraft.items[id] = (saleDraft.items[id] || 0) + 1;
      refreshSaleCart();
      break;
    }
    case "sale-inc": {
      if (!saleDraft) return;
      const id = actionEl.dataset.id;
      saleDraft.items[id] = (saleDraft.items[id] || 0) + 1;
      refreshSaleCart();
      break;
    }
    case "sale-dec": {
      if (!saleDraft) return;
      const id = actionEl.dataset.id;
      saleDraft.items[id] = (saleDraft.items[id] || 0) - 1;
      if (saleDraft.items[id] <= 0) delete saleDraft.items[id];
      refreshSaleCart();
      break;
    }
    case "sale-remove": {
      if (!saleDraft) return;
      delete saleDraft.items[actionEl.dataset.id];
      refreshSaleCart();
      break;
    }
    case "sale-payment": {
      if (!saleDraft) return;
      saleDraft.payment = actionEl.dataset.pay;
      document.querySelectorAll('[data-action="sale-payment"]').forEach((button) => {
        button.classList.toggle("is-active", button.dataset.pay === saleDraft.payment);
      });
      break;
    }
    case "save-sale":
      saveSale();
      break;
    case "expense-category": {
      if (!expenseDraft) return;
      expenseDraft.category = actionEl.dataset.cat;
      document.querySelectorAll('[data-action="expense-category"]').forEach((button) => {
        button.classList.toggle("is-active", button.dataset.cat === expenseDraft.category);
      });
      break;
    }
    case "expense-payment": {
      if (!expenseDraft) return;
      expenseDraft.payment = actionEl.dataset.pay;
      document.querySelectorAll('[data-action="expense-payment"]').forEach((button) => {
        button.classList.toggle("is-active", button.dataset.pay === expenseDraft.payment);
      });
      break;
    }
    case "save-expense":
      saveExpense();
      break;
    case "menu-category": {
      if (!menuDraft) return;
      menuDraft.category = actionEl.dataset.cat;
      document.querySelectorAll('[data-action="menu-category"]').forEach((button) => {
        button.classList.toggle("is-active", button.dataset.cat === menuDraft.category);
      });
      break;
    }
    case "save-menu":
      saveMenu();
      break;
    case "modal-close":
      closeModal();
      break;
    case "dash-range":
      ui.dashRange = Number(actionEl.dataset.range);
      render();
      break;
    case "report-range":
      ui.reportRange = actionEl.dataset.range;
      render();
      break;
    case "sales-range":
      ui.salesRange = actionEl.dataset.range;
      ui.salesLimit = 12;
      render();
      break;
    case "expense-range":
      ui.expenseRange = actionEl.dataset.range;
      ui.expenseLimit = 12;
      render();
      break;
    case "menu-filter":
      ui.menuFilter = actionEl.dataset.cat;
      render();
      break;
    case "sales-load":
      ui.salesLimit += 12;
      refreshSalesResults();
      break;
    case "expense-load":
      ui.expenseLimit += 12;
      refreshExpenseResults();
      break;
    case "confirm-action": {
      const callback = pendingConfirm;
      pendingConfirm = null;
      closeModal();
      if (callback) callback();
      break;
    }
    case "mobile-more":
      openMobileMore();
      break;
    case "export-csv":
      exportCsv();
      break;
    case "export-json":
      exportJson();
      break;
    case "reset-demo":
      openConfirm({
        title: "Restore demo data?",
        message: "This replaces the current shop, menu, sales and expenses with a fresh sample shop. Export a backup first if you need one.",
        label: "Restore demo",
        onConfirm: () => {
          data = seedState();
          resetCurrencyCache();
          saveData();
          render();
          showToast("Demo data restored.");
        },
      });
      break;
    case "clear-data":
      openConfirm({
        title: "Clear all transactions?",
        message: "Every sale and expense will be removed. Your menu and business settings stay exactly as they are.",
        label: "Clear transactions",
        onConfirm: () => {
          data.sales = [];
          data.expenses = [];
          data.demo = false;
          data.seedDate = dayKey();
          data.meta.nextOrder = 1001;
          data.meta.nextSaleId = 1;
          data.meta.nextExpenseId = 1;
          saveData();
          render();
          showToast("All transactions cleared.");
        },
      });
      break;
    default:
      break;
  }
}

document.addEventListener("click", (event) => {
  const actionEl = event.target.closest("[data-action]");
  if (!actionEl) return;
  event.preventDefault();
  handleAction(actionEl);
});

document.addEventListener("input", (event) => {
  const target = event.target;
  if (target.id === "sales-search") {
    ui.salesSearch = target.value;
    ui.salesLimit = 12;
    refreshSalesResults();
  } else if (target.id === "expense-search") {
    ui.expenseSearch = target.value;
    ui.expenseLimit = 12;
    refreshExpenseResults();
  } else if (target.id === "expense-amount") {
    updateExpensePreview();
  } else if (target.id === "menu-price" || target.id === "menu-cost") {
    updateMenuMargin();
  }
});

document.addEventListener("change", (event) => {
  const target = event.target;
  if (target.id === "sales-payment-filter") {
    ui.salesPayment = target.value;
    ui.salesLimit = 12;
    refreshSalesResults();
  } else if (target.id === "expense-category-filter") {
    ui.expenseCategory = target.value;
    ui.expenseLimit = 12;
    refreshExpenseResults();
  }
});

document.addEventListener("submit", (event) => {
  if (event.target.id !== "settings-form") return;
  event.preventDefault();
  const name = document.getElementById("settings-name").value.trim();
  const owner = document.getElementById("settings-owner").value.trim();
  const currency = document.getElementById("settings-currency").value;
  const marginTarget = Number(document.getElementById("settings-margin").value);

  if (!name || !owner) {
    showToast("Business and owner names are required.", "error");
    return;
  }

  const currencyChanged = currency !== data.settings.currency;
  data.settings.businessName = name;
  data.settings.ownerName = owner;
  data.settings.currency = currency;
  data.settings.marginTarget = clamp(Number.isFinite(marginTarget) ? marginTarget : 60, 0, 100);
  if (currencyChanged) resetCurrencyCache();
  saveData();
  render();
  showToast("Settings saved.");
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && document.getElementById("modal-root").innerHTML) {
    closeModal();
  }
});

/* ----------------------------------- Init ----------------------------------- */

function init() {
  data = loadData();
  saveData();
  render();
}

init();
