const tapSound = new Audio("sounds/tap.mp3");
tapSound.preload = "auto";

function playTapSound() {
  tapSound.currentTime = 0;
  tapSound.play().catch(() => {});
}

let data = {
  corn: { count: Number(localStorage.getItem("cornCount")) || 0, price: 6 },
  corncheetos: { count: Number(localStorage.getItem("corncheetosCount")) || 0, price: 7 },
  chiplocos: { count: Number(localStorage.getItem("chiplocosCount")) || 0, price: 8 },
  chipesquite: { count: Number(localStorage.getItem("chipesquiteCount")) || 0, price: 9 },
  maruchan: { count: Number(localStorage.getItem("maruchanCount")) || 0, price: 12 },
  churritos: { count: Number(localStorage.getItem("churritosCount")) || 0, price: 8 },
  lemonadeclassic: { count: Number(localStorage.getItem("lemonadeclassicCount")) || 0, price: 6 },
  lemonadeflavor: { count: Number(localStorage.getItem("lemonadeflavorCount")) || 0, price: 7 },
  lemonadespecial: { count: Number(localStorage.getItem("lemonadespecialCount")) || 0, price: 8 }
};

let history = JSON.parse(localStorage.getItem("antojitosSalesHistory")) || [];

const ids = [
  "corn",
  "corncheetos",
  "chiplocos",
  "chipesquite",
  "maruchan",
  "churritos",
  "lemonadeclassic",
  "lemonadeflavor",
  "lemonadespecial"
];

function formatMoney(amount) {
  return `$${amount.toFixed(2)}`;
}

function getTodayLabel() {
  return new Date().toLocaleDateString();
}

function saveCurrentData() {
  ids.forEach((id) => {
    localStorage.setItem(`${id}Count`, data[id].count);
  });
  localStorage.setItem("antojitosSalesHistory", JSON.stringify(history));
}

function getGrandTotal() {
  return ids.reduce((sum, id) => sum + data[id].count * data[id].price, 0);
}

function getTotalItems() {
  return ids.reduce((sum, id) => sum + data[id].count, 0);
}

function updateScreen() {
  ids.forEach((id) => {
    document.getElementById(`${id}Count`).textContent = data[id].count;
  });

  document.getElementById("grandTotal").textContent = formatMoney(getGrandTotal());
  document.getElementById("totalItems").textContent = getTotalItems();
  document.getElementById("todayDate").textContent = getTodayLabel();
}

function renderHistory() {
  const historyListEl = document.getElementById("historyList");

  if (history.length === 0) {
    historyListEl.innerHTML = "<p>No saved days yet.</p>";
    return;
  }

  historyListEl.innerHTML = "";

  const newestFirst = [...history].reverse();

  newestFirst.forEach((day) => {
    const entry = document.createElement("div");
    entry.className = "history-entry";

    entry.innerHTML = `
      <h3>${day.date}</h3>
      <p>Corn in Cup: ${day.cornCount} (${formatMoney(day.cornSales)})</p>
      <p>Corn + Cheetos: ${day.corncheetosCount} (${formatMoney(day.corncheetosSales)})</p>
      <p>Chip Locos: ${day.chiplocosCount} (${formatMoney(day.chiplocosSales)})</p>
      <p>Chip Esquite: ${day.chipesquiteCount} (${formatMoney(day.chipesquiteSales)})</p>
      <p>Maruchan Preparada: ${day.maruchanCount} (${formatMoney(day.maruchanSales)})</p>
      <p>Churritos Locos: ${day.churritosCount} (${formatMoney(day.churritosSales)})</p>
      <p>Lemonade Classic: ${day.lemonadeclassicCount} (${formatMoney(day.lemonadeclassicSales)})</p>
      <p>Lemonade Flavor: ${day.lemonadeflavorCount} (${formatMoney(day.lemonadeflavorSales)})</p>
      <p>Lemonade Specialty: ${day.lemonadespecialCount} (${formatMoney(day.lemonadespecialSales)})</p>
      <p><strong>Total Items:</strong> ${day.totalItems}</p>
      <p><strong>Total Sales:</strong> ${formatMoney(day.grandTotal)}</p>
    `;

    historyListEl.appendChild(entry);
  });
}

function changeCount(item, amount) {
  data[item].count += amount;

  if (data[item].count < 0) {
    data[item].count = 0;
  }

  playTapSound();
  saveCurrentData();
  updateScreen();
}

function resetDay() {
  const confirmReset = confirm("Are you sure you want to reset today's counts without saving?");
  if (!confirmReset) return;

  ids.forEach((id) => {
    data[id].count = 0;
  });

  saveCurrentData();
  updateScreen();
}

function saveDay() {
  const totalItems = getTotalItems();

  if (totalItems === 0) {
    alert("You have nothing to save yet for today.");
    return;
  }

  const today = getTodayLabel();

  const alreadySaved = history.find((entry) => entry.date === today);
  if (alreadySaved) {
    const overwrite = confirm("Today's numbers were already saved. Do you want to replace them?");
    if (!overwrite) return;

    history = history.filter((entry) => entry.date !== today);
  }

  const daySummary = {
    date: today,

    cornCount: data.corn.count,
    cornSales: data.corn.count * data.corn.price,

    corncheetosCount: data.corncheetos.count,
    corncheetosSales: data.corncheetos.count * data.corncheetos.price,

    chiplocosCount: data.chiplocos.count,
    chiplocosSales: data.chiplocos.count * data.chiplocos.price,

    chipesquiteCount: data.chipesquite.count,
    chipesquiteSales: data.chipesquite.count * data.chipesquite.price,

    maruchanCount: data.maruchan.count,
    maruchanSales: data.maruchan.count * data.maruchan.price,

    churritosCount: data.churritos.count,
    churritosSales: data.churritos.count * data.churritos.price,

    lemonadeclassicCount: data.lemonadeclassic.count,
    lemonadeclassicSales: data.lemonadeclassic.count * data.lemonadeclassic.price,

    lemonadeflavorCount: data.lemonadeflavor.count,
    lemonadeflavorSales: data.lemonadeflavor.count * data.lemonadeflavor.price,

    lemonadespecialCount: data.lemonadespecial.count,
    lemonadespecialSales: data.lemonadespecial.count * data.lemonadespecial.price,

    totalItems: totalItems,
    grandTotal: getGrandTotal()
  };

  history.push(daySummary);

  ids.forEach((id) => {
    data[id].count = 0;
  });

  saveCurrentData();
  updateScreen();
  renderHistory();

  alert("Day saved and reset for tomorrow.");
}

updateScreen();
renderHistory();
