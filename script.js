import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-app.js";
import {
  getDatabase,
  ref,
  set,
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

// SNACKS
const SNACK_ITEMS = [
  { id: "chip_locos", name: "Chip Locos", emoji: "🌶️", price: 8, sub: "Pepino, jicama, cueritos, mango, cacahuates, chaca chaca, chamoy, limon, tajin" },
  { id: "chip_esquite", name: "Chip Esquite", emoji: "🌽", price: 9, sub: "Elote, mayonesa, mantequilla, queso" },
  { id: "maruchan_preparada", name: "Maruchan Preparada", emoji: "🍜", price: 12, sub: "Chips, elote, mayonesa, mantequilla, queso" },
  { id: "churritos_locos", name: "Churritos Locos", emoji: "🔥", price: 8, sub: "Pepino, jicama, cueritos, cacahuates, chaca chaca, clamato, chamoy, limon, tajin" },
  { id: "esquite_vaso", name: "Esquite Vaso", emoji: "🥣", price: 6, sub: "Regular" },
  { id: "esquite_cheetos", name: "Esquite Con Cheetos", emoji: "🧀", price: 7, sub: "With Cheetos" }
];

// LEMONADES
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
  snacksTotal: 0,
  lemonadeTotal: 0,
  cashTotal: 0,
  digitalTotal: 0,
  tips: 0,
  entries: []
};

const popupState = {
  owner: "",
  payment: "cash",
  selectedLabel: "",
  selectedAmount: 0
};

let historyCache = {};
let historyBound = false;

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

function setDefaultDate() {
  const datePicker = document.getElementById("datePicker");
  if (!datePicker.value) {
    datePicker.value = todayLocalValue();
  }
  state.date = datePicker.value;
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

function buildMenuRow(item, owner) {
  const row = document.createElement("div");
  row.className = "menu-row";

  row.innerHTML = `
    <div class="menu-left">
      <div class="menu-icon">${item.emoji}</div>
      <div class="menu-name">${item.name}</div>
    </div>
    <button class="menu-open-btn" type="button">Open</button>
  `;

  row.querySelector(".menu-open-btn").addEventListener("click", () => {
    handleMenuOpen(owner, item.id);
  });

  return row;
}

function handleMenuOpen(owner, id) {
  if (owner === "snacks") {
    const snack = SNACK_ITEMS.find(item => item.id === id);
    if (snack) openSimpleSale("snacks", snack.name, snack.price, snack.sub);
    return;
  }

  if (id === "classic") openSimpleSale("lemonade", "Classic Lemonade", 6, "Regular classic lemonade");
  if (id === "flavored") openFlavorLemonade();
  if (id === "specialty") openSpecialtyLemonade();
}

function openPopup(title, stepTitle = "") {
  document.getElementById("popupTitle").textContent = title;
  document.getElementById("popupStepTitle").textContent = stepTitle;
  document.getElementById("popupOptions").innerHTML = "";
  document.getElementById("popupOverlay").classList.remove("hidden");

  popupState.payment = "cash";
  popupState.selectedLabel = "";
  popupState.selectedAmount = 0;

  setPopupPayment("cash");
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
      document.querySelectorAll(".popup-option").forEach(el => el.classList.remove("active"));
      btn.classList.add("active");
      onChoose(option, index);
    });
    wrap.appendChild(btn);
  });
}

function setPopupPayment(method) {
  popupState.payment = method;
  document.getElementById("popupCashBtn").classList.toggle("active", method === "cash");
  document.getElementById("popupDigitalBtn").classList.toggle("active", method === "digital");
}

function updatePopupSummary() {
  const box = document.getElementById("popupSummary");

  if (!popupState.selectedLabel) {
    box.textContent = "Nothing selected yet.";
    return;
  }

  box.textContent = `${popupState.selectedLabel} • ${money(popupState.selectedAmount)} • ${popupState.payment}`;
}

function openSimpleSale(owner, name, amount, sub = "") {
  popupState.owner = owner;
  openPopup(name, "Choose payment, then tap Add to Total.");

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
  openPopup("Flavor Lemonade", "Choose one flavor.");

  renderPopupOptions(
    LEMONADE_FLAVORS.map(flavor => ({
      name: `${flavor} • $7`,
      sub: "Base $6 + flavor $1"
    })),
    (choice) => {
      const name = choice.name.replace(" • $7", "");
      popupState.selectedLabel = `Flavor Lemonade - ${name}`;
      popupState.selectedAmount = 7;
      updatePopupSummary();
    }
  );
}

function openSpecialtyLemonade() {
  popupState.owner = "lemonade";
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

function confirmPopupSale() {
  if (!popupState.owner || !popupState.selectedAmount) {
    alert("Choose an item first.");
    return;
  }

  if (popupState.owner === "snacks") {
    state.snacksTotal += popupState.selectedAmount;
  } else {
    state.lemonadeTotal += popupState.selectedAmount;
  }

  if (popupState.payment === "cash") {
    state.cashTotal += popupState.selectedAmount;
  } else {
    state.digitalTotal += popupState.selectedAmount;
  }

  state.entries.push({
    owner: popupState.owner === "snacks" ? "Snacks" : "Lemonades",
    item: popupState.selectedLabel,
    amount: Number(popupState.selectedAmount.toFixed(2)),
    payment: popupState.payment
  });

  updateTotalsUI();
  closePopup();
}

function updateTotalsUI() {
  const combined = state.snacksTotal + state.lemonadeTotal;
  state.tips = Number(document.getElementById("tipsInput").value || 0);

  document.getElementById("snacksTotal").textContent = money(state.snacksTotal);
  document.getElementById("lemonadeTotal").textContent = money(state.lemonadeTotal);
  document.getElementById("cashTotal").textContent = money(state.cashTotal);
  document.getElementById("digitalTotal").textContent = money(state.digitalTotal);
  document.getElementById("tipsTotal").textContent = money(state.tips);
  document.getElementById("summarySnacks").textContent = money(state.snacksTotal);
  document.getElementById("summaryLemonade").textContent = money(state.lemonadeTotal);
  document.getElementById("combinedTotal").textContent = money(combined);
  document.getElementById("summaryTips").textContent = money(state.tips);
}

async function saveDay() {
  const date = document.getElementById("datePicker").value;

  if (!date) {
    alert("Please select a date first.");
    return;
  }

  state.date = date;
  state.tips = Number(document.getElementById("tipsInput").value || 0);

  const payload = {
    date,
    createdAt: Date.now(),
    snacksTotal: Number(state.snacksTotal.toFixed(2)),
    lemonadeTotal: Number(state.lemonadeTotal.toFixed(2)),
    combinedTotal: Number((state.snacksTotal + state.lemonadeTotal).toFixed(2)),
    cashTotal: Number(state.cashTotal.toFixed(2)),
    digitalTotal: Number(state.digitalTotal.toFixed(2)),
    tips: Number(state.tips.toFixed(2)),
    entries: state.entries
  };

  try {
    await set(ref(db, `astrosnaxxDailySales/${date}`), payload);
    alert("Day saved.");
  } catch (error) {
    console.error(error);
    alert("Could not save the day. Check your Firebase setup.");
  }
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
      <div class="history-row">
        <div class="history-date">No saved days yet.</div>
      </div>
    `;
    return;
  }

  rows.slice(0, 5).forEach(day => {
    const row = buildDayRow(day);
    historyList.appendChild(row);
  });
}

function buildDayRow(day) {
  const row = document.createElement("div");
  row.className = "day-list-row";

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

    <div class="history-stat tips">
      <div class="label">Tips</div>
      <div class="value">${money(day.tips)}</div>
    </div>

    <div class="history-arrow">›</div>
  `;

  row.addEventListener("click", () => openDayDetails(day));
  return row;
}

function renderAllDaysList() {
  const list = document.getElementById("allDaysList");
  const rows = Object.values(historyCache || {}).sort((a, b) => {
    if ((a?.date || "") < (b?.date || "")) return 1;
    if ((a?.date || "") > (b?.date || "")) return -1;
    return 0;
  });

  list.innerHTML = "";

  if (!rows.length) {
    list.innerHTML = `<div class="history-row"><div class="history-date">No saved days yet.</div></div>`;
    return;
  }

  rows.forEach(day => {
    list.appendChild(buildDayRow(day));
  });
}

function openAllDays() {
  renderAllDaysList();
  document.getElementById("daysOverlay").classList.remove("hidden");
}

function closeAllDays() {
  document.getElementById("daysOverlay").classList.add("hidden");
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
      <div class="small-label">Tips</div>
      <div class="value">${money(day.tips)}</div>
    </div>
  `;

  const entriesWrap = document.getElementById("detailEntries");
  entriesWrap.innerHTML = "";

  const entries = Array.isArray(day.entries) ? day.entries : [];

  if (!entries.length) {
    entriesWrap.innerHTML = `<div class="detail-entry"><div class="detail-entry-top">No item details saved for this day.</div></div>`;
  } else {
    entries.forEach(entry => {
      const box = document.createElement("div");
      box.className = "detail-entry";
      box.innerHTML = `
        <div class="detail-entry-top">
          <span>${entry.owner}</span>
          <span>${money(entry.amount)}</span>
        </div>
        <div class="detail-entry-sub">${entry.item}</div>
        <div class="detail-entry-sub">Payment: ${entry.payment}</div>
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
  const historyList = document.getElementById("historyList");

  if (!historyBound) {
    historyList.innerHTML = `
      <div class="history-row">
        <div class="history-date">Loading...</div>
      </div>
    `;

    onValue(
      ref(db, "astrosnaxxDailySales"),
      (snapshot) => {
        historyCache = snapshot.val() || {};
        renderHistoryRows(historyCache);
      },
      (error) => {
        console.error(error);
        historyList.innerHTML = `
          <div class="history-row">
            <div class="history-date">Could not load history.</div>
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
  document.getElementById("datePicker").addEventListener("change", (e) => {
    state.date = e.target.value;
  });

  document.getElementById("tipsInput").addEventListener("input", () => {
    updateTotalsUI();
  });

  document.getElementById("saveDayBtn").addEventListener("click", saveDay);
  document.getElementById("viewDaysBtn").addEventListener("click", openAllDays);
  document.getElementById("refreshHistoryBtn").addEventListener("click", loadHistory);

  document.getElementById("closePopupBtn").addEventListener("click", closePopup);
  document.getElementById("popupDoneBtn").addEventListener("click", confirmPopupSale);
  document.getElementById("popupCashBtn").addEventListener("click", () => {
    setPopupPayment("cash");
    updatePopupSummary();
  });
  document.getElementById("popupDigitalBtn").addEventListener("click", () => {
    setPopupPayment("digital");
    updatePopupSummary();
  });

  document.getElementById("closeDaysBtn").addEventListener("click", closeAllDays);
  document.getElementById("closeDetailBtn").addEventListener("click", closeDayDetails);

  document.getElementById("popupOverlay").addEventListener("click", (e) => {
    if (e.target.id === "popupOverlay") closePopup();
  });

  document.getElementById("daysOverlay").addEventListener("click", (e) => {
    if (e.target.id === "daysOverlay") closeAllDays();
  });

  document.getElementById("detailOverlay").addEventListener("click", (e) => {
    if (e.target.id === "detailOverlay") closeDayDetails();
  });
}

function init() {
  renderMenus();
  bindEvents();
  setDefaultDate();
  updateTotalsUI();
  loadHistory();
}

init();
