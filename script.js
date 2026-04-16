import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-app.js";
import {
  getDatabase,
  ref,
  push,
  set,
  remove,
  onValue
} from "https://www.gstatic.com/firebasejs/12.12.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "PASTE_YOURS",
  authDomain: "PASTE_YOURS",
  databaseURL: "PASTE_YOURS",
  projectId: "PASTE_YOURS",
  storageBucket: "PASTE_YOURS",
  messagingSenderId: "PASTE_YOURS",
  appId: "PASTE_YOURS"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const CLASSIC_FLAVORS = [
  "Strawberry",
  "Watermelon",
  "Mango",
  "Pineapple",
  "Blue Raspberry",
  "Coconut",
  "Orange",
  "Kiwi",
  "Peach",
  "Sour Gummy Worm",
  "Passion Fruit",
  "Cherry",
  "Green Apple"
];

const LEMONADE_ADDONS = [
  "Candy",
  "Cueritos",
  "Cacahuates",
  ...CLASSIC_FLAVORS
];

const SPECIALTIES = {
  "Mango Madness": ["Mango", "Chamoy", "Tajin", "Candy"],
  "Blue Beam": ["Blue Raspberry", "Candy"],
  "Orange Creamsicle": ["Orange", "Cream"],
  "Electric Island": ["Blue Raspberry", "Coconut", "Candy"],
  "Peachy Paradise": ["Peach", "Candy"],
  "Strawberry Smash": ["Strawberry", "Candy"],
  "Strawberries & Cream": ["Strawberry", "Cream"],
  "Pink Pines": ["Pineapple", "Strawberry", "Candy"]
};

const SNACKS = {
  "Chip Locos": {
    price: 8,
    ingredients: ["Pepino", "Jicama", "Cueritos", "Mango", "Cacahuates", "Chaca Chaca", "Chamoy", "Limon", "Tajin"]
  },
  "Chip Esquite": {
    price: 9,
    ingredients: ["Elote", "Mayonesa", "Mantequilla", "Queso"]
  },
  "Maruchan Preparada": {
    price: 12,
    ingredients: ["Chips", "Elote", "Mayonesa", "Mantequilla", "Queso"]
  },
  "Churritos Locos": {
    price: 8,
    ingredients: ["Pepino", "Jicama", "Cueritos", "Cacahuates", "Chaca Chaca", "Clamato", "Chamoy", "Limon", "Tajin"]
  },
  "Esquite Vaso": {
    price: 6,
    ingredients: []
  },
  "Esquite con Cheetos": {
    price: 7,
    ingredients: []
  }
};

const MENU_BOXES = [
  { name: "Classic Lemonade", priceLabel: "$6", image: "images/lemonade-box.png", soldKey: "Classic Lemonade" },
  { name: "Specialty Lemonade", priceLabel: "$8", image: "images/lemonade-box.png", soldKey: "Specialty Lemonade" },
  { name: "Chip Locos", priceLabel: "$8", image: "images/chip-locos.png", soldKey: "Chip Locos" },
  { name: "Chip Esquite", priceLabel: "$9", image: "images/chip-esquite.png", soldKey: "Chip Esquite" },
  { name: "Maruchan Preparada", priceLabel: "$12", image: "images/maruchan-preparada.png", soldKey: "Maruchan Preparada" },
  { name: "Churritos Locos", priceLabel: "$8", image: "images/churritos-locos.png", soldKey: "Churritos Locos" },
  { name: "Esquite Vaso", priceLabel: "$6", image: "images/esquite-vaso.png", soldKey: "Esquite Vaso" },
  { name: "Esquite con Cheetos", priceLabel: "$7", image: "images/esquite-con-cheetos.png", soldKey: "Esquite con Cheetos" }
];

let trackerState = {
  sales: {},
  days: {}
};

let draftItems = [];
let builder = { data: {} };
let editingDraftIndex = null;
let selectedHistoryDay = null;

function formatMoney(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function escapeForSingleQuote(str) {
  return String(str).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function nowLabel() {
  return new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function todayLabel() {
  return new Date().toLocaleDateString();
}

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function getWeekStart(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function topLabel(counts) {
  let best = "—";
  let bestCount = 0;

  Object.entries(counts || {}).forEach(([name, count]) => {
    if (count > bestCount) {
      best = `${name} (${count})`;
      bestCount = count;
    }
  });

  return bestCount ? best : "—";
}

function totalsFromSales(salesObject) {
  let cash = 0;
  let cashApp = 0;
  let applePay = 0;
  let square = 0;

  Object.values(salesObject || {}).forEach(sale => {
    if (sale.payment?.type === "cash") {
      cash += Number(sale.payment.total || 0);
    }
    if (sale.payment?.type === "digital") {
      if (sale.payment.method === "Cash App") cashApp += Number(sale.payment.total || 0);
      if (sale.payment.method === "Apple Pay") applePay += Number(sale.payment.total || 0);
      if (sale.payment.method === "Square") square += Number(sale.payment.total || 0);
    }
    if (sale.payment?.type === "split") {
      cash += Number(sale.payment.cashAmount || 0);
      if (sale.payment.digitalMethod === "Cash App") cashApp += Number(sale.payment.digitalAmount || 0);
      if (sale.payment.digitalMethod === "Apple Pay") applePay += Number(sale.payment.digitalAmount || 0);
      if (sale.payment.digitalMethod === "Square") square += Number(sale.payment.digitalAmount || 0);
    }
  });

  return {
    cash,
    cashApp,
    applePay,
    square,
    dayTotal: cash + cashApp + applePay + square
  };
}

function getCountsFromSales(salesObject) {
  const itemCounts = {};
  const specialtyCounts = {};

  Object.values(salesObject || {}).forEach(sale => {
    (sale.items || []).forEach(item => {
      const qty = Number(item.quantity || 0);
      itemCounts[item.name] = (itemCounts[item.name] || 0) + qty;

      if (item.specialtyName) {
        specialtyCounts[item.specialtyName] = (specialtyCounts[item.specialtyName] || 0) + qty;
      }
    });
  });

  return { itemCounts, specialtyCounts };
}

function choiceButtons(items, key, isMulti = false) {
  return `
    <div class="choice-grid">
      ${items.map(item => {
        const selected = isMulti
          ? (Array.isArray(builder.data[key]) && builder.data[key].includes(item))
          : builder.data[key] === item;

        const safe = escapeForSingleQuote(item);
        const cls = selected
          ? `choice-btn selected ${isMulti ? "multi-selected" : ""}`
          : "choice-btn";

        const click = isMulti
          ? `toggleBuilderArray('${key}', '${safe}')`
          : `setBuilderValue('${key}', '${safe}')`;

        return `<button type="button" class="${cls}" onclick="${click}">${item}</button>`;
      }).join("")}
    </div>
  `;
}

function renderBoxMenu() {
  const { itemCounts } = getCountsFromSales(trackerState.sales);
  const box = document.getElementById("boxMenu");

  box.innerHTML = MENU_BOXES.map(item => `
    <button type="button" class="menu-box" style="background-image:url('${item.image}')" onclick="selectMenuBox('${escapeForSingleQuote(item.name)}')">
      <div class="menu-box-content">
        <h3>${item.name}</h3>
        <p>${item.priceLabel}</p>
        <p>Today Sold: ${itemCounts[item.soldKey] || 0}</p>
      </div>
    </button>
  `).join("");
}

window.selectMenuBox = function (name) {
  builder = { data: { itemType: name } };
  editingDraftIndex = null;
  renderBuilder();
  renderReview();
};

window.goHome = function () {
  history.pushState({}, "", window.location.pathname);
  renderScreen();
};

window.goHistory = function () {
  history.pushState({}, "", `${window.location.pathname}?view=history`);
  renderScreen();
};

window.selectHistoryDay = function (dayKey) {
  history.pushState({}, "", `${window.location.pathname}?view=history&day=${encodeURIComponent(dayKey)}`);
  renderScreen();
};

window.addEventListener("popstate", renderScreen);

window.clearBuilder = function () {
  builder = { data: {} };
  editingDraftIndex = null;
  renderBuilder();
  renderReview();
};

window.setBuilderValue = function (key, value) {
  builder.data[key] = value;
  renderBuilder();
  renderReview();
};

window.toggleBuilderArray = function (key, value) {
  if (!Array.isArray(builder.data[key])) builder.data[key] = [];
  const arr = builder.data[key];
  const idx = arr.indexOf(value);
  if (idx >= 0) arr.splice(idx, 1);
  else arr.push(value);
  renderBuilder();
  renderReview();
};

function renderBuilder() {
  const el = document.getElementById("builderStage");
  if (!el) return;

  const type = builder.data.itemType;

  if (!type) {
    el.innerHTML = `<p>Tap a box to begin.</p>`;
    return;
  }

  let html = `<h3>${type}</h3>`;

  if (type === "Classic Lemonade") {
    html += `
      <h4>1. Quantity</h4>
      ${choiceButtons(["1", "2", "3", "4", "5"], "quantity")}
    `;
    if (builder.data.quantity) {
      html += `
        <h4>2. Add On +$1</h4>
        ${choiceButtons(LEMONADE_ADDONS, "addons", true)}
        <p class="helper">Tap as many add-ons as needed. Each selected add-on adds $1.</p>
      `;
    }
  }

  if (type === "Specialty Lemonade") {
    html += `
      <h4>1. Quantity</h4>
      ${choiceButtons(["1", "2", "3", "4", "5"], "quantity")}
    `;
    if (builder.data.quantity) {
      html += `
        <h4>2. Choose Specialty</h4>
        ${choiceButtons(Object.keys(SPECIALTIES), "specialtyDrink")}
      `;
      if (builder.data.specialtyDrink) {
        html += `
          <h4>Ingredients</h4>
          <div class="review-card">
            ${SPECIALTIES[builder.data.specialtyDrink].map(i => `<p>${i}</p>`).join("")}
          </div>
        `;
      }
    }
  }

  if (SNACKS[type]) {
    html += `
      <h4>1. Quantity</h4>
      ${choiceButtons(["1", "2", "3", "4", "5"], "quantity")}
    `;
    if (builder.data.quantity && SNACKS[type].ingredients.length) {
      html += `
        <h4>Ingredients</h4>
        <div class="review-card">
          ${SNACKS[type].ingredients.map(i => `<p>${i}</p>`).join("")}
        </div>
      `;
    }
  }

  el.innerHTML = html;
}

function buildPreviewItem() {
  const d = builder.data;
  const qty = Number(d.quantity || 0);
  const type = d.itemType;

  if (!type || !qty) return null;

  if (type === "Classic Lemonade") {
    const addons = d.addons || [];
    const addonCount = addons.length;
    const unit = 6 + addonCount;
    return {
      kind: "classicLemonade",
      name: "Classic Lemonade",
      quantity: qty,
      unitPrice: unit,
      totalPrice: unit * qty,
      lines: [`Quantity: ${qty}`, ...(addons.length ? [`Add Ons: ${addons.join(", ")}`] : [])]
    };
  }

  if (type === "Specialty Lemonade") {
    if (!d.specialtyDrink) return null;
    return {
      kind: "specialtyLemonade",
      name: d.specialtyDrink,
      quantity: qty,
      unitPrice: 8,
      totalPrice: 8 * qty,
      lines: [`Quantity: ${qty}`, ...SPECIALTIES[d.specialtyDrink]],
      specialtyName: d.specialtyDrink
    };
  }

  if (SNACKS[type]) {
    return {
      kind: type,
      name: type,
      quantity: qty,
      unitPrice: SNACKS[type].price,
      totalPrice: SNACKS[type].price * qty,
      lines: [`Quantity: ${qty}`, ...SNACKS[type].ingredients]
    };
  }

  return null;
}

function renderReview() {
  const card = document.getElementById("reviewCard");
  const preview = buildPreviewItem();

  if (!preview) {
    card.innerHTML = `<p>No item being built yet.</p>`;
    return;
  }

  card.innerHTML = `
    <p><strong>${preview.name}</strong></p>
    ${preview.lines.map(line => `<p>${line}</p>`).join("")}
    <p><strong>Total:</strong> ${formatMoney(preview.totalPrice)}</p>
  `;
}

window.addBuiltItemToDraft = function () {
  const preview = buildPreviewItem();
  if (!preview) {
    alert("Finish building the item first.");
    return;
  }

  const itemToStore = {
    ...preview,
    builderData: clone(builder.data)
  };

  if (editingDraftIndex !== null) {
    draftItems[editingDraftIndex] = itemToStore;
  } else {
    draftItems.push(itemToStore);
  }

  editingDraftIndex = null;
  builder = { data: {} };
  renderBuilder();
  renderReview();
  renderDraft();
};

window.editDraftItem = function (index) {
  const item = draftItems[index];
  if (!item) return;
  builder = { data: clone(item.builderData) };
  editingDraftIndex = index;
  renderBuilder();
  renderReview();
};

window.removeDraftItem = function (index) {
  draftItems.splice(index, 1);
  renderDraft();
};

window.clearDraft = function () {
  if (!draftItems.length) return;
  if (!confirm("Clear the current draft?")) return;
  draftItems = [];
  builder = { data: {} };
  editingDraftIndex = null;
  renderBuilder();
  renderReview();
  renderDraft();
};

function renderDraft() {
  const list = document.getElementById("draftOrderList");
  const total = draftItems.reduce((sum, item) => sum + item.totalPrice, 0);
  document.getElementById("draftTotal").textContent = formatMoney(total);
  document.getElementById("editingNotice").classList.toggle("hidden", editingDraftIndex === null);

  if (!draftItems.length) {
    list.innerHTML = `<p>No items in draft yet.</p>`;
    return;
  }

  list.innerHTML = draftItems.map((item, index) => `
    <div class="order-item">
      <div class="order-item-head">
        <div>
          <p><strong>${item.name}</strong></p>
          ${item.lines.map(line => `<p>${line}</p>`).join("")}
          <p><strong>${formatMoney(item.totalPrice)}</strong></p>
        </div>
      </div>
      <div class="order-actions">
        <button type="button" class="action-btn" onclick="editDraftItem(${index})">Edit Item</button>
        <button type="button" class="action-btn delete-btn" onclick="removeDraftItem(${index})">Remove</button>
      </div>
    </div>
  `).join("");
}

window.addDraftToToday = async function () {
  if (!draftItems.length) {
    alert("Add at least one item first.");
    return;
  }

  const subtotal = draftItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const mode = prompt("Payment type:\nEnter exactly:\nCash\nDigital\nSplit");
  if (mode === null) return;

  const cleanedMode = mode.trim().toLowerCase();
  let payment = null;

  if (cleanedMode === "cash") {
    payment = { type: "cash", total: subtotal };
  } else if (cleanedMode === "digital") {
    const method = prompt("Enter digital method exactly:\nCash App\nApple Pay\nSquare");
    if (method === null) return;
    const m = method.trim();
    if (!["Cash App", "Apple Pay", "Square"].includes(m)) {
      alert("Enter Cash App, Apple Pay, or Square exactly.");
      return;
    }
    payment = { type: "digital", method: m, total: subtotal };
  } else if (cleanedMode === "split") {
    const cashInput = prompt(`Sale total is ${formatMoney(subtotal)}.\nEnter CASH amount only:`);
    if (cashInput === null) return;
    const cashAmount = Number(cashInput);
    if (Number.isNaN(cashAmount) || cashAmount < 0 || cashAmount > subtotal) {
      alert("Invalid cash amount.");
      return;
    }
    const digitalAmount = Number((subtotal - cashAmount).toFixed(2));
    const method = prompt(`Digital amount is ${formatMoney(digitalAmount)}.\nEnter digital method exactly:\nCash App\nApple Pay\nSquare`);
    if (method === null) return;
    const m = method.trim();
    if (!["Cash App", "Apple Pay", "Square"].includes(m)) {
      alert("Enter Cash App, Apple Pay, or Square exactly.");
      return;
    }

    payment = {
      type: "split",
      total: subtotal,
      cashAmount,
      digitalAmount,
      digitalMethod: m
    };
  } else {
    alert("Enter Cash, Digital, or Split.");
    return;
  }

  const saleRef = push(ref(db, "tiaTracker/current/sales"));
  await set(saleRef, {
    createdAt: Date.now(),
    createdLabel: nowLabel(),
    subtotal,
    payment,
    items: clone(draftItems)
  });

  draftItems = [];
  builder = { data: {} };
  editingDraftIndex = null;
  renderBuilder();
  renderReview();
  renderDraft();
};

window.removeSale = async function (saleKey) {
  if (!confirm("Remove this sale?")) return;
  await remove(ref(db, `tiaTracker/current/sales/${saleKey}`));
};

function renderTodaySales() {
  const box = document.getElementById("todaySalesList");
  const entries = Object.entries(trackerState.sales || {}).sort((a, b) => (a[1].createdAt || 0) - (b[1].createdAt || 0));

  box.innerHTML = entries.length
    ? entries.map(([key, sale]) => `
      <div class="sale-card">
        <p><strong>${sale.createdLabel}</strong> — ${formatMoney(sale.subtotal)}</p>
        ${sale.items.map(item => `
          <div class="order-item">
            <p><strong>${item.name}</strong></p>
            ${item.lines.map(line => `<p>${line}</p>`).join("")}
          </div>
        `).join("")}
        <p><strong>Payment:</strong> ${sale.payment?.type || "—"} ${sale.payment?.method || sale.payment?.digitalMethod || ""}</p>
        <div class="order-actions">
          <button type="button" class="action-btn delete-btn" onclick="removeSale('${key}')">Remove</button>
        </div>
      </div>
    `).join("")
    : "<p>No sales yet.</p>";
}

function renderMainScreen() {
  renderBoxMenu();
  renderBuilder();
  renderReview();
  renderDraft();
  renderTodaySales();

  const totals = totalsFromSales(trackerState.sales);
  const { itemCounts } = getCountsFromSales(trackerState.sales);

  document.getElementById("dayTotal").textContent = formatMoney(totals.dayTotal);
  document.getElementById("cashTotal").textContent = formatMoney(totals.cash);
  document.getElementById("cashAppTotal").textContent = formatMoney(totals.cashApp);
  document.getElementById("applePayTotal").textContent = formatMoney(totals.applePay);
  document.getElementById("squareTotal").textContent = formatMoney(totals.square);
  document.getElementById("topSeller").textContent = topLabel(itemCounts);

  const itemCountsBox = document.getElementById("itemCountsBox");
  const countEntries = Object.entries(itemCounts).filter(([, count]) => count > 0);
  itemCountsBox.innerHTML = countEntries.length
    ? countEntries.map(([name, count]) => `<p><strong>${name}:</strong> ${count}</p>`).join("")
    : "<p>No sales yet.</p>";

  renderWeeklyStats();
}

function renderWeeklyStats() {
  const start = getWeekStart();
  let weekTotal = 0;
  const weekItemCounts = {};

  Object.values(trackerState.days || {}).forEach(day => {
    const created = new Date(day.createdAt || 0);
    if (created >= start) {
      weekTotal += Number(day.totals?.dayTotal || 0);
      Object.entries(day.itemCounts || {}).forEach(([k, v]) => {
        weekItemCounts[k] = (weekItemCounts[k] || 0) + v;
      });
    }
  });

  document.getElementById("weekTotal").textContent = formatMoney(weekTotal);
  document.getElementById("weekTopSeller").textContent = topLabel(weekItemCounts);
}

window.saveDay = async function () {
  const totals = totalsFromSales(trackerState.sales);
  const { itemCounts, specialtyCounts } = getCountsFromSales(trackerState.sales);

  if (!Object.keys(trackerState.sales || {}).length) {
    alert("No sales to save yet.");
    return;
  }

  await set(ref(db, `tiaTracker/days/${todayKey()}`), {
    label: todayLabel(),
    createdAt: Date.now(),
    sales: clone(trackerState.sales || {}),
    totals,
    itemCounts,
    specialtyCounts
  });

  await set(ref(db, "tiaTracker/current/sales"), {});

  draftItems = [];
  builder = { data: {} };
  editingDraftIndex = null;
  renderBuilder();
  renderReview();
  renderDraft();
  alert("Day saved.");
};

window.resetDay = async function () {
  if (!confirm("Reset today without saving?")) return;

  await set(ref(db, "tiaTracker/current/sales"), {});

  draftItems = [];
  builder = { data: {} };
  editingDraftIndex = null;
  renderBuilder();
  renderReview();
  renderDraft();
  alert("Day reset.");
};

function renderHistoryScreen() {
  const daysList = document.getElementById("historyDaysList");
  const detail = document.getElementById("historyDetail");
  const detailTitle = document.getElementById("historyDetailTitle");

  const dayEntries = Object.entries(trackerState.days || {}).sort((a, b) => b[0].localeCompare(a[0]));

  if (!dayEntries.length) {
    daysList.innerHTML = "<p>No saved days yet.</p>";
    detail.innerHTML = "<p>Select a day.</p>";
    detailTitle.textContent = "Day Details";
    return;
  }

  daysList.innerHTML = dayEntries.map(([dayKey, day]) => `
    <div class="history-day-card">
      <p><strong>${day.label || dayKey}</strong></p>
      <p>Total: ${formatMoney(day.totals?.dayTotal || 0)}</p>
      <p>Top Seller: ${topLabel(day.itemCounts || {})}</p>
      <div class="order-actions">
        <button type="button" class="action-btn" onclick="selectHistoryDay('${dayKey}')">View Day</button>
      </div>
    </div>
  `).join("");

  if (!selectedHistoryDay || !trackerState.days[selectedHistoryDay]) {
    detail.innerHTML = "<p>Select a day.</p>";
    detailTitle.textContent = "Day Details";
    return;
  }

  const day = trackerState.days[selectedHistoryDay];
  detailTitle.textContent = `Day Details — ${day.label || selectedHistoryDay}`;

  detail.innerHTML = `
    <div class="totals-box">
      <div class="line"><span>Total</span><strong>${formatMoney(day.totals?.dayTotal || 0)}</strong></div>
      <div class="line"><span>Cash</span><strong>${formatMoney(day.totals?.cash || 0)}</strong></div>
      <div class="line"><span>Cash App</span><strong>${formatMoney(day.totals?.cashApp || 0)}</strong></div>
      <div class="line"><span>Apple Pay</span><strong>${formatMoney(day.totals?.applePay || 0)}</strong></div>
      <div class="line"><span>Square</span><strong>${formatMoney(day.totals?.square || 0)}</strong></div>
      <div class="line"><span>Top Seller</span><strong>${topLabel(day.itemCounts || {})}</strong></div>
    </div>
    ${Object.values(day.sales || {}).map(sale => `
      <div class="history-order-card">
        <p><strong>${sale.createdLabel}</strong> — ${formatMoney(sale.subtotal)}</p>
        ${sale.items.map(item => `
          <div class="order-item">
            <p><strong>${item.name}</strong></p>
            ${item.lines.map(line => `<p>${line}</p>`).join("")}
          </div>
        `).join("")}
        <p><strong>Payment:</strong> ${sale.payment?.type || "—"} ${sale.payment?.method || sale.payment?.digitalMethod || ""}</p>
      </div>
    `).join("")}
  `;
}

function renderScreen() {
  const params = new URLSearchParams(window.location.search);
  const view = params.get("view");

  document.getElementById("mainScreen").classList.toggle("hidden", view === "history");
  document.getElementById("historyScreen").classList.toggle("hidden", view !== "history");

  if (view === "history") {
    selectedHistoryDay = params.get("day") || null;
    renderHistoryScreen();
  } else {
    renderMainScreen();
  }
}

function attachListeners() {
  onValue(ref(db, "tiaTracker/current/sales"), snap => {
    trackerState.sales = snap.val() || {};
    renderScreen();
  });

  onValue(ref(db, "tiaTracker/days"), snap => {
    trackerState.days = snap.val() || {};
    renderScreen();
  });
}

attachListeners();
renderScreen();
