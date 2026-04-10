const ITEMS = [
  { id: 'chip-locos', name: 'Chip locos', price: 8, img: 'images/chip-locos.png' },
  { id: 'chip-esquite', name: 'Chip Esquite', price: 9, img: 'images/chip-esquite.png' },
  { id: 'maruchan-preparada', name: 'Maruchan Preparada', price: 12, img: 'images/maruchan-preparada.png' },
  { id: 'churritos-locos', name: 'Churritos Locos', price: 8, img: 'images/churritos-locos.png' },
  { id: 'esquite-vaso', name: 'Esquite en Vaso', price: 6, img: 'images/esquite-en-vaso.png' },
  { id: 'esquite-cheetos', name: 'Esquite en Vaso con cheetos', price: 7, img: 'images/esquite-en-vaso-con-cheetos.png' },
  { id: 'classic-lemonade', name: 'Classic Lemonade', price: 6, img: 'images/classic-lemonade.png' },
  { id: 'speciality', name: 'Speciality', price: 8, img: 'images/speciality.png' }
];

const state = {
  counts: {},
  cash: 0,
  digital: 0,
  history: [],
  nextPaymentOverride: null,
  weekly: {}
};

const els = {
  cards: document.getElementById('cards'),
  totalItems: document.getElementById('totalItems'),
  totalSales: document.getElementById('totalSales'),
  cashTotal: document.getElementById('cashTotal'),
  digitalTotal: document.getElementById('digitalTotal'),
  weekSales: document.getElementById('weekSales'),
  weekItems: document.getElementById('weekItems'),
  weekTopSeller: document.getElementById('weekTopSeller'),
  weekTopQty: document.getElementById('weekTopQty'),
  weeklyBreakdown: document.getElementById('weeklyBreakdown'),
  paymentMode: document.getElementById('paymentMode'),
  undoBtn: document.getElementById('undoBtn'),
  splitHalfBtn: document.getElementById('splitHalfBtn'),
  splitCustomBtn: document.getElementById('splitCustomBtn'),
  cashBtn: document.getElementById('cashBtn'),
  digitalBtn: document.getElementById('digitalBtn'),
  resetBtn: document.getElementById('resetBtn'),
  saveWeekBtn: document.getElementById('saveWeekBtn'),
  weekPicker: document.getElementById('weekPicker'),
  tapSound: document.getElementById('tapSound')
};

function money(n) {
  return `$${n.toFixed(2).replace('.00', '')}`;
}

function currentWeekString() {
  const d = new Date();
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

function getSelectedWeek() {
  return els.weekPicker.value || currentWeekString();
}

function load() {
  const saved = JSON.parse(localStorage.getItem('antojitosTrackerV2') || 'null');
  if (saved) {
    state.counts = saved.counts || {};
    state.cash = saved.cash || 0;
    state.digital = saved.digital || 0;
    state.history = saved.history || [];
    state.nextPaymentOverride = saved.nextPaymentOverride || null;
    state.weekly = saved.weekly || {};
  }

  ITEMS.forEach(item => {
    if (typeof state.counts[item.id] !== 'number') state.counts[item.id] = 0;
  });

  els.weekPicker.value = currentWeekString();
}

function save(playConfetti = false) {
  localStorage.setItem('antojitosTrackerV2', JSON.stringify(state));
  if (playConfetti) fireConfetti();
}

function paymentType() {
  if (state.nextPaymentOverride) {
    const mode = state.nextPaymentOverride;
    state.nextPaymentOverride = null;
    return mode;
  }
  return els.paymentMode.value;
}

function playTap() {
  try {
    els.tapSound.currentTime = 0;
    els.tapSound.play();
  } catch (e) {}
}

function floating(el, text) {
  const f = document.createElement('div');
  f.className = 'floating';
  f.textContent = text;
  el.appendChild(f);
  setTimeout(() => f.remove(), 800);
}

function addPaymentAmount(amount, payType) {
  if (payType === 'cash') state.cash += amount;
  else state.digital += amount;
}

function subtractPaymentAmount(amount, payType) {
  if (payType === 'cash') state.cash = Math.max(0, state.cash - amount);
  else state.digital = Math.max(0, state.digital - amount);
}

function addSale(itemId, amount, source = 'tap') {
  const item = ITEMS.find(i => i.id === itemId);
  if (!item) return;

  state.counts[itemId] += 1;
  const payType = paymentType();
  addPaymentAmount(amount, payType);

  state.history.push({
    type: 'sale',
    itemId,
    amount,
    payType,
    source,
    time: Date.now()
  });

  updateUI();
  save();

  const card = document.querySelector(`[data-id="${itemId}"]`);
  if (card) floating(card.querySelector('.img-wrap'), `+${money(amount)}`);
  playTap();
}

function subtractSale(itemId) {
  if ((state.counts[itemId] || 0) <= 0) return;
  state.counts[itemId] -= 1;
  state.history.push({ type: 'manual-minus', itemId, time: Date.now() });
  updateUI();
  save();
}

function undoLast() {
  const last = state.history.pop();
  if (!last) return;

  if (last.type === 'sale') {
    state.counts[last.itemId] = Math.max(0, (state.counts[last.itemId] || 0) - 1);
    subtractPaymentAmount(last.amount, last.payType);
  } else if (last.type === 'split') {
    state.cash = Math.max(0, state.cash - last.cashAmount);
    state.digital = Math.max(0, state.digital - last.digitalAmount);
  } else if (last.type === 'manual-minus') {
    state.counts[last.itemId] += 1;
  } else if (last.type === 'weekly-save') {
    if (last.previousWeekData === null) {
      delete state.weekly[last.weekKey];
    } else {
      state.weekly[last.weekKey] = last.previousWeekData;
    }
  }

  updateUI();
  save();
}

function addSplitHalf() {
  const amount = Number(prompt('Total amount to split 50/50?', '8'));
  if (!amount || amount <= 0) return;
  const half = amount / 2;
  state.cash += half;
  state.digital += half;
  state.history.push({ type: 'split', cashAmount: half, digitalAmount: half, time: Date.now() });
  updateUI();
  save();
}

function addSplitCustom() {
  const total = Number(prompt('Total sale amount?', '8'));
  if (!total || total <= 0) return;

  const cashPart = Number(prompt(`How much cash out of ${total}?`, '4'));
  if (isNaN(cashPart) || cashPart < 0 || cashPart > total) {
    alert('Cash amount is not valid.');
    return;
  }

  const digitalPart = total - cashPart;
  state.cash += cashPart;
  state.digital += digitalPart;
  state.history.push({ type: 'split', cashAmount: cashPart, digitalAmount: digitalPart, time: Date.now() });
  updateUI();
  save();
}

function addFlavorToDrink(itemId) {
  const drinkIds = ['classic-lemonade', 'speciality'];
  if (!drinkIds.includes(itemId)) return;
  addSale(itemId, 1, 'flavor-add');
}

function saveWeek() {
  const weekKey = getSelectedWeek();
  const previousWeekData = structuredClone(state.weekly[weekKey] || null);

  state.weekly[weekKey] = {
    counts: structuredClone(state.counts),
    cash: state.cash,
    digital: state.digital,
    savedAt: Date.now()
  };

  state.history.push({
    type: 'weekly-save',
    weekKey,
    previousWeekData,
    time: Date.now()
  });

  updateWeeklyUI();
  save(true);
}

function resetDay() {
  if (!confirm("Reset today's counts and money? Weekly saves stay stored.")) return;

  ITEMS.forEach(item => {
    state.counts[item.id] = 0;
  });

  state.cash = 0;
  state.digital = 0;
  state.history = [];
  updateUI();
  save();
}

function buildCards() {
  els.cards.innerHTML = ITEMS.map(item => {
    const isDrink = item.id === 'classic-lemonade' || item.id === 'speciality';

    return `
      <div class="card" data-id="${item.id}">
        <div class="img-wrap">
          <img src="${item.img}" alt="${item.name}" onerror="this.src='https://via.placeholder.com/600x600?text=Add+PNG'">
          <div class="price-tag">$${item.price}</div>
        </div>

        <div class="count-bar">
          <div class="count-box" id="count-${item.id}">0 sold</div>
          <div class="mini-btns">
            <button class="btn-red" onclick="subtractSale('${item.id}')">−</button>
            <button class="btn-green" onclick="addSale('${item.id}', ${item.price})">+</button>
          </div>
        </div>

        <div class="tap-zone">
          <button class="tap-btn" onclick="addSale('${item.id}', ${item.price})">Tap to Add Sale</button>
        </div>

        ${isDrink ? `
          <div class="tap-zone" style="padding-top:0;">
            <button class="btn-yellow" style="width:100%;" onclick="addFlavorToDrink('${item.id}')">Add Flavor +$1</button>
          </div>
        ` : ''}
      </div>
    `;
  }).join('');
}

function updateUI() {
  let totalItems = 0;

  ITEMS.forEach(item => {
    const count = state.counts[item.id] || 0;
    totalItems += count;
    const countEl = document.getElementById(`count-${item.id}`);
    if (countEl) countEl.textContent = `${count} sold`;
  });

  const totalSales = state.cash + state.digital;
  els.totalItems.textContent = totalItems;
  els.totalSales.textContent = money(totalSales);
  els.cashTotal.textContent = money(state.cash);
  els.digitalTotal.textContent = money(state.digital);

  updateWeeklyUI();
}

function updateWeeklyUI() {
  const weekKey = getSelectedWeek();
  const week = state.weekly[weekKey];

  if (!week) {
    els.weekSales.textContent = '$0';
    els.weekItems.textContent = '0';
    els.weekTopSeller.textContent = '—';
    els.weekTopQty.textContent = '0';
    els.weeklyBreakdown.innerHTML = '<div class="small-note">No saved week yet. Tap Save Week when you want to lock this week in.</div>';
    return;
  }

  const counts = week.counts || {};
  const weekSales = (week.cash || 0) + (week.digital || 0);
  let weekItems = 0;
  let topName = '—';
  let topQty = 0;

  const rows = ITEMS.map(item => {
    const qty = counts[item.id] || 0;
    weekItems += qty;
    if (qty > topQty) {
      topQty = qty;
      topName = item.name;
    }
    return {
      name: item.name,
      qty,
      sales: qty * item.price
    };
  }).sort((a, b) => b.qty - a.qty);

  els.weekSales.textContent = money(weekSales);
  els.weekItems.textContent = weekItems;
  els.weekTopSeller.textContent = topName;
  els.weekTopQty.textContent = topQty;

  els.weeklyBreakdown.innerHTML = rows.map(r => `
    <div class="weekly-row">
      <div>${r.name}</div>
      <div>${r.qty} sold</div>
      <div>${money(r.sales)}</div>
    </div>
  `).join('');
}

function fireConfetti() {
  const canvas = document.getElementById('confetti');
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const pieces = Array.from({ length: 140 }, () => ({
    x: Math.random() * canvas.width,
    y: -20 - Math.random() * canvas.height * 0.3,
    w: 6 + Math.random() * 8,
    h: 8 + Math.random() * 10,
    vy: 2 + Math.random() * 4,
    vx: -2 + Math.random() * 4,
    rot: Math.random() * Math.PI,
    vr: -0.2 + Math.random() * 0.4,
    color: ['#ff5fa2', '#ffd84d', '#4caf50', '#4a90e2', '#8a4f2a'][Math.floor(Math.random() * 5)]
  }));

  let frame = 0;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    pieces.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    });

    frame++;
    if (frame < 160) {
      requestAnimationFrame(draw);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  draw();
}

els.undoBtn.addEventListener('click', undoLast);
els.splitHalfBtn.addEventListener('click', addSplitHalf);
els.splitCustomBtn.addEventListener('click', addSplitCustom);
els.cashBtn.addEventListener('click', () => state.nextPaymentOverride = 'cash');
els.digitalBtn.addEventListener('click', () => state.nextPaymentOverride = 'digital');
els.resetBtn.addEventListener('click', resetDay);
els.saveWeekBtn.addEventListener('click', saveWeek);
els.weekPicker.addEventListener('change', updateWeeklyUI);

load();
buildCards();
updateUI();

window.addSale = addSale;
window.subtractSale = subtractSale;
window.addFlavorToDrink = addFlavorToDrink;
