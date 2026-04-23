import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-app.js";
import {
  getDatabase,
  ref,
  set,
  onValue,
  get
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

// MENUS
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

// STATE
const state = {
  date: "",
  live: {
    openOrders: {},
    doneOrders: {}
  },
  draft: {
    customerName: "",
    payment: "cash",
    items: []
  }
};

const popupState = {
  owner: "",
  mode: "",
  selectedLabel: "",
  selectedAmount: 0
};

let liveBoundDate = "";
let liveTickInterval = null;

// HELPERS
function money(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function todayLocalValue() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60000);
  return local.toISOString().split("T")[0];
}

function formatTimer(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function activeScreenButton(btnId) {
  ["buildTabBtn", "openTabBtn", "doneTabBtn"].forEach(id => {
    document.getElementById(id).classList.remove("active-tab-btn");
  });
  document.getElementById(btnId).classList.add("active-tab-btn");
}

function showScreen(screenId, btnId) {
  ["buildScreen", "openScreen", "doneScreen"].forEach(id => {
    document.getElementById(id).classList.remove("active-screen");
  });
  document.getElementById(screenId).classList.add("active-screen");
  activeScreenButton(btnId);
}

function draftTotal() {
  return state.draft.items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
}

function currentOpenOrdersArray() {
  return Object.entries(state.live.openOrders || {}).map(([id, order]) => ({
    id,
    ...order
  })).sort((a, b) => Number(a.createdAt || 0) - Number(b.createdAt || 0));
}

function currentDoneOrdersArray() {
  return Object.entries(state.live.doneOrders || {}).map(([id, order]) => ({
    id,
    ...order
  })).sort((a, b) => Number(b.handedOutAt || 0) - Number(a.handedOutAt || 0));
}

function buildDisplayTime(order) {
  if (!order.createdAt) return "0:00";
  return formatTimer(Date.now() - Number(order.createdAt));
}

function makeOrderId() {
  return `order_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// LIVE SYNC
async function saveLiveState() {
  if (!state.date) return;
  await set(ref(db, `astrosnaxxOrders/${state.date}`), state.live);
}

function bindLiveState(date) {
  if (liveBoundDate === date) return;
  liveBoundDate = date;

  onValue(ref(db, `astrosnaxxOrders/${date}`), snapshot => {
    const data = snapshot.val() || { openOrders: {}, doneOrders: {} };
    state.live = {
      openOrders: data.openOrders || {},
      doneOrders: data.doneOrders || {}
    };
    renderOpenOrders();
    renderDoneOrders();
  });
}

// MENUS
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

function handleMenuOpen(owner, id) {
  if (owner === "snacks") {
    const snack = SNACK_ITEMS.find(item => item.id === id);
    if (snack) openSimpleItem("snacks", snack.name, snack.price, snack.sub);
    return;
  }

  if (id === "classic") openSimpleItem("lemonade", "Classic Lemonade", 6, "Regular classic lemonade");
  if (id === "flavored") openFlavorLemonade();
  if (id === "specialty") openSpecialtyLemonade();
}

// POPUP
function openPopup(title, stepTitle = "") {
  document.getElementById("popupTitle").textContent = title;
  document.getElementById("popupStepTitle").textContent = stepTitle;
  document.getElementById("popupOptions").innerHTML = "";
  document.getElementById("popupOverlay").classList.remove("hidden");

  popupState.selectedLabel = "";
  popupState.selectedAmount = 0;
  updatePopupSummary();
}

function closePopup() {
  document.getElementById("popupOverlay").classList.add("hidden");
}

function renderPopupOptions(options, onChoose) {
  const wrap = document.getElementById("popupOptions");
  wrap.innerHTML = "";

  options.forEach((option, index) => {
    const btn = document.createElement("button");
    btn.className = "popup-option";
    btn.type = "button";
    btn.innerHTML = `
      <div class="popup-option-title">${option.name}</div>
      ${option.sub ? `<div class="popup-option-sub">${option.sub}</div>` : ""}
    `;
    btn.addEventListener("click", () => {
      onChoose(option, index);
    });
    wrap.appendChild(btn);
  });
}

function updatePopupSummary() {
  const box = document.getElementById("popupSummary");
  if (!popupState.selectedLabel) {
    box.textContent = "Nothing selected yet.";
    return;
  }
  box.textContent = `${popupState.selectedLabel} • ${money(popupState.selectedAmount)}`;
}

function openSimpleItem(owner, name, amount, sub = "") {
  popupState.owner = owner;
  popupState.mode = "simple";
  openPopup(name, "Tap Add Item to add this to the order.");

  popupState.selectedLabel = name;
  popupState.selectedAmount = amount;
  updatePopupSummary();

  document.getElementById("popupOptions").innerHTML = `
    <button class="popup-option active" type="button">
      <div class="popup-option-title">${name} • ${money(amount)}</div>
      ${sub ? `<div class="popup-option-sub">${sub}</div>` : ""}
    </button>
  `;
}

function openFlavorLemonade() {
  popupState.owner = "lemonade";
  popupState.mode = "flavored";
  openPopup("Flavor Lemonade", "Tap every flavor used. Each one adds $1.");

  const selectedFlavors = [];

  renderPopupOptions(
    LEMONADE_FLAVORS.map(flavor => ({
      name: flavor,
      sub: "Adds $1"
    })),
    (choice, index) => {
      const optionButtons = document.querySelectorAll(".popup-option");
      const clickedBtn = optionButtons[index];
      const flavorName = choice.name;

      const alreadySelected = selectedFlavors.includes(flavorName);

      if (alreadySelected) {
        const removeIndex = selectedFlavors.indexOf(flavorName);
        selectedFlavors.splice(removeIndex, 1);
        clickedBtn.classList.remove("active");
      } else {
        selectedFlavors.push(flavorName);
        clickedBtn.classList.add("active");
      }

      if (selectedFlavors.length === 0) {
        popupState.selectedLabel = "";
        popupState.selectedAmount = 0;
      } else {
        popupState.selectedLabel = `Flavor Lemonade - ${selectedFlavors.join(", ")}`;
        popupState.selectedAmount = 6 + selectedFlavors.length;
      }

      updatePopupSummary();
    }
  );
}

function openSpecialtyLemonade() {
  popupState.owner = "lemonade";
  popupState.mode = "specialty";
  openPopup("Specialty Lemonade", "Choose a specialty.");

  renderPopupOptions(
    SPECIALTY_LEMONADES.map(item => ({
      name: `${item.name} • $8`,
      sub: item.sub
    })),
    (choice) => {
      const name = choice.name.replace(" • $8", "");
      popupState.selectedLabel = `Specialty Lemonade - ${name}`;
      popupState.selectedAmount = 8;
      updatePopupSummary();
    }
  );
}

function confirmPopupItem() {
  if (!popupState.selectedLabel || !popupState.selectedAmount) {
    alert("Choose an item first.");
    return;
  }

  state.draft.items.push({
    owner: popupState.owner,
    label: popupState.selectedLabel,
    amount: Number(popupState.selectedAmount.toFixed(2))
  });

  renderDraft();
  closePopup();
}

// DRAFT
function renderDraft() {
  const wrap = document.getElementById("draftItems");
  const totalEl = document.getElementById("draftTotal");

  if (!state.draft.items.length) {
    wrap.innerHTML = `
      <div class="detail-entry">
        <div class="detail-entry-top">
          <span>No items yet</span>
          <span>$0.00</span>
        </div>
        <div class="detail-entry-sub">Add snacks or lemonades to build an order.</div>
      </div>
    `;
    totalEl.textContent = "$0.00";
    return;
  }

  wrap.innerHTML = "";
  state.draft.items.forEach((item, index) => {
    const box = document.createElement("div");
    box.className = "detail-entry";
    box.innerHTML = `
      <div class="detail-entry-top">
        <span>${item.label}</span>
        <span>${money(item.amount)}</span>
      </div>
      <div class="detail-entry-sub">${item.owner === "snacks" ? "Snack" : "Lemonade"}</div>
      <div class="order-card-actions">
        <button class="order-small-btn remove-btn" data-remove-index="${index}" type="button">Remove</button>
      </div>
    `;
    wrap.appendChild(box);
  });

  wrap.querySelectorAll("[data-remove-index]").forEach(btn => {
    btn.addEventListener("click", () => {
      const index = Number(btn.dataset.removeIndex);
      state.draft.items.splice(index, 1);
      renderDraft();
    });
  });

  totalEl.textContent = money(draftTotal());
}

function clearDraft() {
  state.draft.items = [];
  state.draft.customerName = "";
  document.getElementById("customerNameInput").value = "";
  renderDraft();
}

async function sendDraftOrder() {
  if (!state.draft.items.length) {
    alert("Add at least one item first.");
    return;
  }

  const orderId = makeOrderId();
  const order = {
    id: orderId,
    customerName: document.getElementById("customerNameInput").value.trim(),
    payment: state.draft.payment,
    items: state.draft.items,
    total: draftTotal(),
    createdAt: Date.now()
  };

  state.live.openOrders[orderId] = order;
  await saveLiveState();

  clearDraft();
  showScreen("openScreen", "openTabBtn");
}

// OPEN / DONE
function renderOpenOrders() {
  const wrap = document.getElementById("openOrdersList");
  const orders = currentOpenOrdersArray();

  if (!orders.length) {
    wrap.innerHTML = `
      <div class="order-card">
        <div class="order-card-top">
          <span>No open orders</span>
          <span>📭</span>
        </div>
        <div class="order-card-sub">New orders will show here live.</div>
      </div>
    `;
    return;
  }

  wrap.innerHTML = "";
  orders.forEach(order => {
    const box = document.createElement("div");
    box.className = "order-card";

    const itemsHtml = order.items.map(item => `
      <div class="order-card-sub">• ${item.label} — ${money(item.amount)}</div>
    `).join("");

    box.innerHTML = `
      <div class="order-card-top">
        <span>${order.customerName || "Walk-up Order"}</span>
        <span>${money(order.total)}</span>
      </div>
      <div class="order-card-sub">Payment: ${order.payment}</div>
      ${itemsHtml}
      <div class="timer-chip">Timer: ${buildDisplayTime(order)}</div>
      <div class="order-card-actions">
        <button class="order-small-btn edit-btn" data-edit-id="${order.id}" type="button">Edit</button>
        <button class="order-small-btn done-btn" data-done-id="${order.id}" type="button">Handed Out</button>
        <button class="order-small-btn remove-btn" data-remove-id="${order.id}" type="button">Delete</button>
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
  const wrap = document.getElementById("doneOrdersList");
  const orders = currentDoneOrdersArray().filter(order => {
    return Date.now() - Number(order.handedOutAt || 0) < 60000;
  });

  if (!orders.length) {
    wrap.innerHTML = `
      <div class="order-card">
        <div class="order-card-top">
          <span>No recent handed out orders</span>
          <span>✨</span>
        </div>
        <div class="order-card-sub">Completed orders stay here for 1 minute.</div>
      </div>
    `;
    return;
  }

  wrap.innerHTML = "";
  orders.forEach(order => {
    const box = document.createElement("div");
    box.className = "order-card";

    const itemsHtml = order.items.map(item => `
      <div class="order-card-sub">• ${item.label} — ${money(item.amount)}</div>
    `).join("");

    box.innerHTML = `
      <div class="order-card-top">
        <span>${order.customerName || "Walk-up Order"}</span>
        <span>${money(order.total)}</span>
      </div>
      <div class="order-card-sub">Payment: ${order.payment}</div>
      <div class="timer-chip">Finished in ${formatTimer(Number(order.handedOutAt || 0) - Number(order.createdAt || 0))}</div>
      ${itemsHtml}
    `;

    wrap.appendChild(box);
  });
}

async function markOrderDone(orderId) {
  const order = state.live.openOrders[orderId];
  if (!order) return;

  const doneOrder = {
    ...order,
    handedOutAt: Date.now()
  };

  state.live.doneOrders[orderId] = doneOrder;
  delete state.live.openOrders[orderId];

  await saveLiveState();
}

async function deleteOpenOrder(orderId) {
  if (!state.live.openOrders[orderId]) return;
  delete state.live.openOrders[orderId];
  await saveLiveState();
}

async function editOpenOrder(orderId) {
  const order = state.live.openOrders[orderId];
  if (!order) return;

  state.draft.items = JSON.parse(JSON.stringify(order.items || []));
  state.draft.payment = order.payment || "cash";
  document.getElementById("customerNameInput").value = order.customerName || "";
  setDraftPayment(state.draft.payment);

  delete state.live.openOrders[orderId];
  await saveLiveState();

  renderDraft();
  showScreen("buildScreen", "buildTabBtn");
}

// PAYMENT
function setDraftPayment(method) {
  state.draft.payment = method;
  document.getElementById("draftCashBtn").classList.toggle("active", method === "cash");
  document.getElementById("draftDigitalBtn").classList.toggle("active", method === "digital");
}

// EVENTS
function bindEvents() {
  document.getElementById("datePicker").addEventListener("change", (e) => {
    state.date = e.target.value;
    bindLiveState(state.date);
  });

  document.getElementById("buildTabBtn").addEventListener("click", () => showScreen("buildScreen", "buildTabBtn"));
  document.getElementById("openTabBtn").addEventListener("click", () => showScreen("openScreen", "openTabBtn"));
  document.getElementById("doneTabBtn").addEventListener("click", () => showScreen("doneScreen", "doneTabBtn"));

  document.getElementById("draftCashBtn").addEventListener("click", () => setDraftPayment("cash"));
  document.getElementById("draftDigitalBtn").addEventListener("click", () => setDraftPayment("digital"));

  document.getElementById("clearDraftBtn").addEventListener("click", clearDraft);
  document.getElementById("sendOrderBtn").addEventListener("click", sendDraftOrder);

  document.getElementById("closePopupBtn").addEventListener("click", closePopup);
  document.getElementById("popupDoneBtn").addEventListener("click", confirmPopupItem);

  document.getElementById("popupOverlay").addEventListener("click", (e) => {
    if (e.target.id === "popupOverlay") closePopup();
  });
}

// INIT
async function init() {
  const datePicker = document.getElementById("datePicker");
  datePicker.value = todayLocalValue();
  state.date = datePicker.value;

  renderMenus();
  bindEvents();
  setDraftPayment("cash");
  renderDraft();
  bindLiveState(state.date);

  const existing = await get(ref(db, `astrosnaxxOrders/${state.date}`));
  if (!existing.exists()) {
    await saveLiveState();
  }

  if (liveTickInterval) clearInterval(liveTickInterval);
  liveTickInterval = setInterval(() => {
    renderOpenOrders();
    renderDoneOrders();
  }, 1000);
}

init();
