import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-app.js";
import {
  getDatabase,
  ref,
  set,
  get,
  remove,
  onValue
} from "https://www.gstatic.com/firebasejs/12.12.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyDMhniu1SEmiIWoXzwJy6zVSOZkHELhfLc",
  authDomain: "family-sales.firebaseapp.com",
  databaseURL: "https://family-sales-default-rtdb.firebaseio.com",
  projectId: "family-sales",
  storageBucket: "family-sales.firebasestorage.app",
  messagingSenderId: "590845027956",
  appId: "1:590845027956:web:676df074fe6150e8d39321"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const SNACK_ITEMS = [
  { id: "chip_locos", name: "Chip Locos", emoji: "🌶️", price: 8, sub: "Pepino, jicama, cueritos, mango, cacahuates, chaca chaca, chamoy, limon, tajin" },
  { id: "chip_esquite", name: "Chip Esquite", emoji: "🌽", price: 9, sub: "Elote, mayonesa, mantequilla, queso" },
  { id: "maruchan_preparada", name: "Maruchan Preparada", emoji: "🍜", price: 12, sub: "Chips, elote, mayonesa, mantequilla, queso" },
  { id: "churritos_locos", name: "Churritos Locos", emoji: "🔥", price: 8, sub: "Pepino, jicama, cueritos, cacahuates, chaca chaca, clamato, chamoy, limon, tajin" },
  { id: "esquite_vaso", name: "Esquite Vaso", emoji: "🥣", price: 6, sub: "Regular" },
  { id: "esquite_cheetos", name: "Esquite Con Cheetos", emoji: "🧀", price: 7, sub: "With Cheetos" }
];

const LEMONADE_FLAVORS = [
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

const SPECIALTY_LEMONADES = [
  { name: "Mango Madness", sub: "Mango • Chamoy • Chamoy Rim • Gummies • Tamarindo Stick" },
  { name: "Blue Beam", sub: "Blue Raspberry • Chamoy Rim • Gummies • Tamarindo Stick" },
  { name: "Orange Creamsicle", sub: "Orange • Vanilla • Sweet Cream • Gummies" },
  { name: "Electric Island", sub: "Pineapple • Blue Raspberry" },
  { name: "Peachy Paradise", sub: "Peach • Coconut • Strawberry" },
  { name: "Strawberry Smash", sub: "Strawberry • Fresh Strawberries" },
  { name: "Strawberries & Cream", sub: "Strawberry • Fresh Strawberries • Sweet Cream" },
  { name: "Pink Pines", sub: "Strawberry • Pineapple" }
];

const snackMenuButtons = SNACK_ITEMS.map(item => ({
  id: item.id,
  name: item.name,
  emoji: item.emoji
}));

const lemonadeMenuButtons = [
  { id: "classic", name: "Classic Lemonade", emoji: "🍋" },
  { id: "flavored", name: "Flavor Lemonade", emoji: "🧃" },
  { id: "specialty", name: "Specialty Lemonade", emoji: "⭐" }
];

const state = {
  date: "",
  liveDay: null,
  currentPayment: "cash",
  draftItems: [],
  draftCustomer: "",
  currentItemBuild: null
};

let historyCache = {};
let historyBound = false;
let liveTickInterval = null;
let liveListenerDate = "";

function money(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function todayLocalValue() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60000);
  return local.toISOString().split("T")[0];
}

function formatDateForDisplay(dateString) {
  if (!dateString) return "";
  const [year, month, day] = dateString.split("-");
  return `${month}/${day}/${year}`;
}

function formatTimer(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

async function ensureLiveDay(date) {
  const dayRef = ref(db, `astrosnaxxOrders/${date}`);
  const snap = await get(dayRef);

  if (!snap.exists()) {
    await set(dayRef, {
      date,
      openOrders: {},
      doneOrders: {}
    });
  }
}

function bindLiveDay(date) {
  if (liveListenerDate === date) return;
  liveListenerDate = date;

  onValue(ref(db, `astrosnaxxOrders/${date}`), snapshot => {
    state.liveDay = snapshot.val() || {
      date,
      openOrders: {},
      doneOrders: {}
    };

    renderQuickStats();
    renderOpenOrders();
    renderDoneOrders();
  });
}

function buildMenuRow(item, owner) {
  const row = document.createElement("div");
  row.className = "menu-row";

  row.innerHTML = `
    <div class="menu-left">
      <div class="menu-icon">${item.emoji}</div>
      <div class="menu-name">${item.name}</div>
    </div>
    <button class="menu-open-btn" type="button">Add</button>
  `;

  row.querySelector(".menu-open-btn").addEventListener("click", () => {
    handleMenuOpen(owner, item.id);
  });

  return row;
}

function renderMenus() {
  const snacksMenuList = document.getElementById("snacksMenuList");
  const lemonadeMenuList = document.getElementById("lemonadeMenuList");

  snacksMenuList.innerHTML = "";
  lemonadeMenuList.innerHTML = "";

  snackMenuButtons.forEach(item => {
    snacksMenuList.appendChild(buildMenuRow(item, "snacks"));
  });

  lemonadeMenuButtons.forEach(item => {
    lemonadeMenuList.appendChild(buildMenuRow(item, "lemonade"));
  });
}

function showScreen(id) {
  document.querySelectorAll(".main-screen").forEach(el => {
    el.classList.add("hidden-screen");
    el.classList.remove("active-screen");
  });

  document.getElementById(id).classList.remove("hidden-screen");
  document.getElementById(id).classList.add("active-screen");
}

function currentOpenOrdersArray() {
  return Object.entries(state.liveDay?.openOrders || {}).map(([id, order]) => ({
    id,
    ...order
  })).sort((a, b) => Number(a.createdAt || 0) - Number(b.createdAt || 0));
}

function currentDoneOrdersArray() {
  return Object.entries(state.liveDay?.doneOrders || {}).map(([id, order]) => ({
    id,
    ...order
  })).sort((a, b) => Number(b.handedOutAt || 0) - Number(a.handedOutAt || 0));
}

function orderTotal(items) {
  return items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
}

function renderQuickStats() {
  const openOrders = currentOpenOrdersArray();
  const doneOrders = currentDoneOrdersArray();
  const todaySales = doneOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const avgMs = doneOrders.length
    ? doneOrders.reduce((sum, order) => sum + Number(order.serviceMs || 0), 0) / doneOrders.length
    : 0;

  document.getElementById("openCount").textContent = openOrders.length;
  document.getElementById("completedCount").textContent = doneOrders.length;
  document.getElementById("todaySales").textContent = money(todaySales);
  document.getElementById("avgTime").textContent = formatTimer(avgMs);
}

function setDraftPayment(payment) {
  state.currentPayment = payment;
  document.getElementById("draftCashBtn").classList.toggle("active", payment === "cash");
  document.getElementById("draftDigitalBtn").classList.toggle("active", payment === "digital");
}

function renderDraft() {
  const wrap = document.getElementById("draftItems");
  document.getElementById("customerInput").value = state.draftCustomer;
  document.getElementById("draftTotal").textContent = money(orderTotal(state.draftItems));

  if (!state.draftItems.length) {
    wrap.className = "draft-items empty-state";
    wrap.textContent = "Add items to start the order.";
    return;
  }

  wrap.className = "draft-items";
  wrap.innerHTML = "";

  state.draftItems.forEach((item, index) => {
    const box = document.createElement("div");
    box.className = "draft-item";
    box.innerHTML = `
      <div class="draft-item-top">
        <span>${item.title}</span>
        <span>${money(item.amount)}</span>
      </div>
      ${item.sub ? `<div class="draft-item-sub">${item.sub}</div>` : ""}
      <div class="draft-item-actions">
        <button class="small-btn danger-btn remove-draft-btn" data-index="${index}" type="button">Remove</button>
      </div>
    `;
    wrap.appendChild(box);
  });

  wrap.querySelectorAll(".remove-draft-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      state.draftItems.splice(Number(btn.dataset.index), 1);
      renderDraft();
    });
  });
}

function resetDraft() {
  state.draftItems = [];
  state.draftCustomer = "";
  state.currentItemBuild = null;
  document.getElementById("customerInput").value = "";
  setDraftPayment("cash");
  renderDraft();
}

function handleMenuOpen(owner, id) {
  if (owner === "snacks") {
    const snack = SNACK_ITEMS.find(item => item.id === id);
    if (!snack) return;
    state.currentItemBuild = {
      owner: "snacks",
      title: snack.name,
      amount: snack.price,
      sub: snack.sub || ""
    };
    openItemPopup(snack.name, "Tap Add Item to add this snack.");
    document.getElementById("itemPopupOptions").innerHTML = `
      <button class="popup-option active" type="button">
        <div class="popup-option-title">${snack.name} • ${money(snack.price)}</div>
        ${snack.sub ? `<div class="popup-option-sub">${snack.sub}</div>` : ""}
      </button>
    `;
    updateItemPopupSummary(`${snack.name} • ${money(snack.price)}`);
    return;
  }

  if (id === "classic") openSimpleLemonade("Classic Lemonade", 6, "Regular classic lemonade");
  if (id === "flavored") openFlavorLemonade();
  if (id === "specialty") openSpecialtyLemonade();
}

function openItemPopup(title, stepTitle = "") {
  document.getElementById("itemPopupTitle").textContent = title;
  document.getElementById("itemPopupStepTitle").textContent = stepTitle;
  document.getElementById("itemPopupOptions").innerHTML = "";
  document.getElementById("itemPopupOverlay").classList.remove("hidden");
}

function closeItemPopup() {
  document.getElementById("itemPopupOverlay").classList.add("hidden");
  state.currentItemBuild = null;
}

function renderItemPopupOptions(options, onChoose) {
  const wrap = document.getElementById("itemPopupOptions");
  wrap.innerHTML = "";

  options.forEach((option, index) => {
    const btn = document.createElement("button");
    btn.className = "popup-option";
    btn.type = "button";
    btn.innerHTML = `
      <div class="popup-option-title">${option.name}</div>
      ${option.sub ? `<div class="popup-option-sub">${option.sub}</div>` : ""}
    `;
    btn.addEventListener("click", () => onChoose(option, index, btn));
    wrap.appendChild(btn);
  });
}

function updateItemPopupSummary(text) {
  document.getElementById("itemPopupSummary").textContent = text || "Nothing selected yet.";
}

function openSimpleLemonade(name, amount, sub = "") {
  state.currentItemBuild = {
    owner: "lemonade",
    title: name,
    amount,
    sub
  };
  openItemPopup(name, "Tap Add Item to add this lemonade.");
  document.getElementById("itemPopupOptions").innerHTML = `
    <button class="popup-option active" type="button">
      <div class="popup-option-title">${name} • ${money(amount)}</div>
      ${sub ? `<div class="popup-option-sub">${sub}</div>` : ""}
    </button>
  `;
  updateItemPopupSummary(`${name} • ${money(amount)}`);
}

function openFlavorLemonade() {
  const selectedFlavors = [];
  state.currentItemBuild = {
    owner: "lemonade",
    title: "Flavor Lemonade",
    amount: 0,
    sub: ""
  };

  openItemPopup("Flavor Lemonade", "Tap every flavor used. Each one adds $1.");

  renderItemPopupOptions(
    LEMONADE_FLAVORS.map(flavor => ({
      name: flavor,
      sub: "Adds $1"
    })),
    (choice, _, btn) => {
      const flavor = choice.name;
      const exists = selectedFlavors.includes(flavor);

      if (exists) {
        selectedFlavors.splice(selectedFlavors.indexOf(flavor), 1);
        btn.classList.remove("active");
      } else {
        selectedFlavors.push(flavor);
        btn.classList.add("active");
      }

      if (!selectedFlavors.length) {
        state.currentItemBuild.amount = 0;
        state.currentItemBuild.sub = "";
        updateItemPopupSummary("Nothing selected yet.");
        return;
      }

      state.currentItemBuild.amount = 6 + selectedFlavors.length;
      state.currentItemBuild.sub = selectedFlavors.join(", ");
      updateItemPopupSummary(`Flavor Lemonade - ${selectedFlavors.join(", ")} • ${money(state.currentItemBuild.amount)}`);
    }
  );
}

function openSpecialtyLemonade() {
  state.currentItemBuild = {
    owner: "lemonade",
    title: "Specialty Lemonade",
    amount: 0,
    sub: ""
  };

  openItemPopup("Specialty Lemonade", "Choose a specialty.");

  renderItemPopupOptions(
    SPECIALTY_LEMONADES.map(item => ({
      name: `${item.name} • $8`,
      sub: item.sub
    })),
    (choice, index) => {
      document.querySelectorAll("#itemPopupOptions .popup-option").forEach(el => el.classList.remove("active"));
      document.querySelectorAll("#itemPopupOptions .popup-option")[index].classList.add("active");

      const name = choice.name.replace(" • $8", "");
      state.currentItemBuild.amount = 8;
      state.currentItemBuild.sub = name;
      updateItemPopupSummary(`Specialty Lemonade - ${name} • $8`);
    }
  );
}

function confirmPopupItem() {
  if (!state.currentItemBuild || !state.currentItemBuild.amount) {
    alert("Choose an item first.");
    return;
  }

  state.draftItems.push({
    owner: state.currentItemBuild.owner,
    title: state.currentItemBuild.title,
    amount: Number(state.currentItemBuild.amount.toFixed(2)),
    sub: state.currentItemBuild.sub || ""
  });

  closeItemPopup();
  renderDraft();
}

function buildOrderId() {
  return `order_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function saveLiveDay() {
  await set(ref(db, `astrosnaxxOrders/${state.date}`), state.liveDay || {
    date: state.date,
    openOrders: {},
    doneOrders: {}
  });
}

async function sendDraftOrder() {
  if (!state.draftItems.length) {
    alert("Add at least one item first.");
    return;
  }

  if (!state.liveDay) {
    state.liveDay = { date: state.date, openOrders: {}, doneOrders: {} };
  }

  const orderId = buildOrderId();
  state.liveDay.openOrders[orderId] = {
    id: orderId,
    customerName: document.getElementById("customerInput").value.trim(),
    payment: state.currentPayment,
    items: state.draftItems,
    total: orderTotal(state.draftItems),
    createdAt: Date.now()
  };

  await saveLiveDay();
  resetDraft();
  showScreen("openScreen");
}

function renderOpenOrders() {
  const wrap = document.getElementById("openOrdersList");
  const orders = currentOpenOrdersArray();

  if (!orders.length) {
    wrap.innerHTML = `
      <div class="order-card">
        <div class="order-top">
          <span>No open orders</span>
          <span>📭</span>
        </div>
        <div class="order-sub">New orders will show here live.</div>
      </div>
    `;
    return;
  }

  wrap.innerHTML = "";
  orders.forEach(order => {
    const box = document.createElement("div");
    box.className = "order-card";

    const itemsHtml = order.items.map(item => `
      <div class="order-sub">• ${item.title}${item.sub ? ` - ${item.sub}` : ""} — ${money(item.amount)}</div>
    `).join("");

    box.innerHTML = `
      <div class="order-top">
        <span>${order.customerName || "Walk-up Order"}</span>
        <span>${money(order.total)}</span>
      </div>
      <div class="order-sub">Payment: ${order.payment}</div>
      ${itemsHtml}
      <div class="timer-pill">Timer: ${formatTimer(Date.now() - Number(order.createdAt || 0))}</div>
      <div class="order-actions">
        <button class="order-btn edit-btn" data-edit-id="${order.id}" type="button">Edit</button>
        <button class="order-btn done-btn" data-done-id="${order.id}" type="button">Handed Out</button>
        <button class="order-btn remove-btn" data-remove-id="${order.id}" type="button">Delete</button>
      </div>
    `;

    wrap.appendChild(box);
  });

  wrap.querySelectorAll("[data-done-id]").forEach(btn => {
    btn.addEventListener("click", () => markOrderDone(btn.dataset.doneId));
  });

  wrap.querySelectorAll("[data-remove-id]").forEach(btn => {
    btn.addEventListener("click", () => deleteOpenOrder(btn.dataset.removeId));
  });

  wrap.querySelectorAll("[data-edit-id]").forEach(btn => {
    btn.addEventListener("click", () => editOpenOrder(btn.dataset.editId));
  });
}

function renderDoneOrders() {
  const wrap = document.getElementById("handedOrdersList");
  const orders = currentDoneOrdersArray().filter(order => {
    return Date.now() - Number(order.handedOutAt || 0) < 60000;
  });

  if (!orders.length) {
    wrap.innerHTML = `
      <div class="order-card">
        <div class="order-top">
          <span>No recent handed out orders</span>
          <span>✨</span>
        </div>
        <div class="order-sub">Completed orders stay here for 1 minute.</div>
      </div>
    `;
    return;
  }

  wrap.innerHTML = "";
  orders.forEach(order => {
    const box = document.createElement("div");
    box.className = "order-card";

    const itemsHtml = order.items.map(item => `
      <div class="order-sub">• ${item.title}${item.sub ? ` - ${item.sub}` : ""} — ${money(item.amount)}</div>
    `).join("");

    box.innerHTML = `
      <div class="order-top">
        <span>${order.customerName || "Walk-up Order"}</span>
        <span>${money(order.total)}</span>
      </div>
      <div class="order-sub">Payment: ${order.payment}</div>
      <div class="timer-pill">Finished in ${formatTimer(Number(order.serviceMs || 0))}</div>
      ${itemsHtml}
    `;

    wrap.appendChild(box);
  });
}

async function markOrderDone(orderId) {
  const order = state.liveDay?.openOrders?.[orderId];
  if (!order) return;

  state.liveDay.doneOrders[orderId] = {
    ...order,
    handedOutAt: Date.now(),
    serviceMs: Date.now() - Number(order.createdAt || Date.now())
  };

  delete state.liveDay.openOrders[orderId];
  await saveLiveDay();
}

async function deleteOpenOrder(orderId) {
  if (!state.liveDay?.openOrders?.[orderId]) return;
  delete state.liveDay.openOrders[orderId];
  await saveLiveDay();
}

async function editOpenOrder(orderId) {
  const order = state.liveDay?.openOrders?.[orderId];
  if (!order) return;

  state.draftItems = JSON.parse(JSON.stringify(order.items || []));
  state.currentPayment = order.payment || "cash";
  state.draftCustomer = order.customerName || "";

  document.getElementById("customerInput").value = state.draftCustomer;
  setDraftPayment(state.currentPayment);
  renderDraft();

  delete state.liveDay.openOrders[orderId];
  await saveLiveDay();

  showScreen("buildScreen");
}

async function saveDaySnapshot() {
  const doneOrders = currentDoneOrdersArray();
  const snackTotal = doneOrders.flatMap(order => order.items).filter(item => item.owner === "snacks").reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const lemonadeTotal = doneOrders.flatMap(order => order.items).filter(item => item.owner === "lemonade").reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const cashTotal = doneOrders.filter(order => order.payment === "cash").reduce((sum, order) => sum + Number(order.total || 0), 0);
  const digitalTotal = doneOrders.filter(order => order.payment === "digital").reduce((sum, order) => sum + Number(order.total || 0), 0);
  const total = doneOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);

  const payload = {
    date: state.date,
    createdAt: Date.now(),
    snacksTotal: snackTotal,
    lemonadeTotal,
    cashTotal,
    digitalTotal,
    combinedTotal: total,
    orderCount: doneOrders.length,
    avgTimeMs: doneOrders.length
      ? doneOrders.reduce((sum, order) => sum + Number(order.serviceMs || 0), 0) / doneOrders.length
      : 0,
    orders: doneOrders
  };

  await set(ref(db, `astrosnaxxDailySales/${state.date}`), payload);
  alert("Day saved.");
}

function renderHistoryRows(data) {
  const historyList = document.getElementById("historyList");
  const rows = Object.values(data || {}).sort((a, b) => {
    if ((a?.date || "") < (b?.date || "")) return 1;
    if ((a?.date || "") > (b?.date || "")) return -1;
    return 0;
  });

  historyList.innerHTML = "";

  if (!rows.length) {
    historyList.innerHTML = `
      <div class="order-card">
        <div class="order-top">
          <span>No saved days yet.</span>
          <span>📂</span>
        </div>
      </div>
    `;
    return;
  }

  rows.forEach(day => {
    const row = document.createElement("div");
    row.className = "history-row";
    row.innerHTML = `
      <div class="history-date">
        <span>📅</span>
        <span>${formatDateForDisplay(day.date)}</span>
      </div>

      <div class="history-stat snacks">
        <div class="label">Snacks</div>
        <div class="value">${money(day.snacksTotal)}</div>
      </div>

      <div class="history-stat lemonade">
        <div class="label">Lemonades</div>
        <div class="value">${money(day.lemonadeTotal)}</div>
      </div>

      <div class="history-stat cash">
        <div class="label">Cash</div>
        <div class="value">${money(day.cashTotal)}</div>
      </div>

      <div class="history-stat digital">
        <div class="label">Digital</div>
        <div class="value">${money(day.digitalTotal)}</div>
      </div>

      <div class="history-stat total">
        <div class="label">Total</div>
        <div class="value">${money(day.combinedTotal)}</div>
      </div>

      <div class="history-arrow">›</div>
    `;
    row.addEventListener("click", () => openDayDetails(day));
    historyList.appendChild(row);
  });
}

function openDayDetails(day) {
  document.getElementById("detailTitle").textContent = `Day Details - ${formatDateForDisplay(day.date)}`;

  document.getElementById("detailTotals").innerHTML = `
    <div class="detail-total-box">
      <div class="small-label">Snacks</div>
      <div class="value">${money(day.snacksTotal)}</div>
    </div>
    <div class="detail-total-box">
      <div class="small-label">Lemonades</div>
      <div class="value">${money(day.lemonadeTotal)}</div>
    </div>
    <div class="detail-total-box">
      <div class="small-label">Cash</div>
      <div class="value">${money(day.cashTotal)}</div>
    </div>
    <div class="detail-total-box">
      <div class="small-label">Digital</div>
      <div class="value">${money(day.digitalTotal)}</div>
    </div>
    <div class="detail-total-box">
      <div class="small-label">Orders</div>
      <div class="value">${day.orderCount || 0}</div>
    </div>
  `;

  const entriesWrap = document.getElementById("detailEntries");
  entriesWrap.innerHTML = "";

  const orders = Array.isArray(day.orders) ? day.orders : [];

  if (!orders.length) {
    entriesWrap.innerHTML = `<div class="detail-entry"><div class="detail-entry-top">No saved order details for this day.</div></div>`;
  } else {
    orders.forEach(order => {
      const itemsHtml = (order.items || []).map(item => `
        <div class="detail-entry-sub">• ${item.title}${item.sub ? ` - ${item.sub}` : ""} — ${money(item.amount)}</div>
      `).join("");

      const box = document.createElement("div");
      box.className = "detail-entry";
      box.innerHTML = `
        <div class="detail-entry-top">
          <span>${order.customerName || "Walk-up Order"}</span>
          <span>${money(order.total || 0)}</span>
        </div>
        <div class="detail-entry-sub">Payment: ${order.payment}</div>
        <div class="detail-entry-sub">Time: ${formatTimer(order.serviceMs || 0)}</div>
        ${itemsHtml}
      `;
      entriesWrap.appendChild(box);
    });
  }

  document.getElementById("detailOverlay").classList.remove("hidden");
}

function closeDayDetails() {
  document.getElementById("detailOverlay").classList.add("hidden");
}

function loadHistory() {
  if (!historyBound) {
    onValue(
      ref(db, "astrosnaxxDailySales"),
      snapshot => {
        historyCache = snapshot.val() || {};
        renderHistoryRows(historyCache);
      },
      error => {
        console.error(error);
        document.getElementById("historyList").innerHTML = `
          <div class="order-card">
            <div class="order-top">
              <span>Could not load history.</span>
              <span>⚠️</span>
            </div>
          </div>
        `;
      }
    );
    historyBound = true;
  } else {
    renderHistoryRows(historyCache);
  }
}

function bindEvents() {
  document.getElementById("datePicker").addEventListener("change", async (e) => {
    state.date = e.target.value;
    await ensureLiveDay(state.date);
    bindLiveDay(state.date);
  });

  document.querySelectorAll("[data-screen]").forEach(btn => {
    btn.addEventListener("click", () => showScreen(btn.dataset.screen));
  });

  document.getElementById("draftCashBtn").addEventListener("click", () => setDraftPayment("cash"));
  document.getElementById("draftDigitalBtn").addEventListener("click", () => setDraftPayment("digital"));

  document.getElementById("customerInput").addEventListener("input", e => {
    state.draftCustomer = e.target.value;
  });

  document.getElementById("clearDraftBtn").addEventListener("click", resetDraft);
  document.getElementById("sendOrderBtn").addEventListener("click", sendDraftOrder);

  document.getElementById("closeItemPopupBtn").addEventListener("click", closeItemPopup);
  document.getElementById("itemPopupDoneBtn").addEventListener("click", confirmPopupItem);

  document.getElementById("saveDayBtn").addEventListener("click", saveDaySnapshot);
  document.getElementById("refreshHistoryBtn").addEventListener("click", loadHistory);

  document.getElementById("closeDetailBtn").addEventListener("click", closeDayDetails);

  document.getElementById("itemPopupOverlay").addEventListener("click", e => {
    if (e.target.id === "itemPopupOverlay") closeItemPopup();
  });

  document.getElementById("detailOverlay").addEventListener("click", e => {
    if (e.target.id === "detailOverlay") closeDayDetails();
  });
}

async function init() {
  renderMenus();
  bindEvents();

  document.getElementById("datePicker").value = todayLocalValue();
  state.date = document.getElementById("datePicker").value;

  setDraftPayment("cash");
  renderDraft();

  await ensureLiveDay(state.date);
  bindLiveDay(state.date);
  loadHistory();

  if (liveTickInterval) clearInterval(liveTickInterval);
  liveTickInterval = setInterval(() => {
    renderOpenOrders();
    renderDoneOrders();
    renderQuickStats();
  }, 1000);
}

init();
