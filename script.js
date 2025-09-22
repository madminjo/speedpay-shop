const state = {
  products: [],
  setproducts: [], // спецпредложения
  news: [],
  highlights: [],
  requisites: [],
  tg: { channel: '', bot: '', botUsername: '' },
  cart: JSON.parse(localStorage.getItem('cart') || '[]'),
  currency: 'KGS'
};

let nf = new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'KGS', maximumFractionDigits: 0 });
const formatPrice = (v) => {
  try { return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: state.currency || 'KGS', maximumFractionDigits: 0 }).format(v); }
  catch { return nf.format(v); }
};

const els = {
  products: () => document.getElementById('products'),
  setProducts: () => document.getElementById('setProducts'),
  news: () => document.getElementById('newsList'),
  highlights: () => document.getElementById('highlights'),
  requisites: () => document.getElementById('requisites'),
  cartCount: () => document.getElementById('cartCount'),
  cartItems: () => document.getElementById('cartItems'),
  cartTotal: () => document.getElementById('cartTotal'),
  receiptInput: () => document.getElementById('receiptInput'),
};

function saveCart(){ localStorage.setItem('cart', JSON.stringify(state.cart)); }
function addToCart(p){
  const existing = state.cart.find(i => i.id === p.id);
  if (existing) existing.qty += 1; else state.cart.push({ id: p.id, title: p.title, price: p.price, qty: 1 });
  renderCartBadge(); saveCart();
}
function removeFromCart(id){ state.cart = state.cart.filter(i => i.id !== id); renderCart(); saveCart(); }
function changeQty(id, d){
  const item = state.cart.find(i => i.id === id); if(!item) return;
  item.qty += d; if(item.qty < 1) item.qty = 1; renderCart(); saveCart();
}
function cartTotal(){ return state.cart.reduce((s,i)=> s + i.price * i.qty, 0); }

function renderCartBadge(){ els.cartCount().textContent = state.cart.reduce((s,i)=> s+i.qty, 0); }
function renderCart(){
  renderCartBadge();
  const root = els.cartItems(); root.innerHTML = '';
  state.cart.forEach(i => {
    const div = document.createElement('div');
    div.className = 'border rounded-xl p-3 flex items-center gap-3';
    div.innerHTML = `
      <div class="flex-1">
        <div class="font-semibold">${i.title}</div>
        <div class="text-sm text-zinc-600">${formatPrice(i.price)} × ${i.qty}</div>
      </div>
      <div class="flex items-center gap-2">
        <button class="px-2 py-1 rounded-lg border" data-action="dec">−</button>
        <button class="px-2 py-1 rounded-lg border" data-action="inc">+</button>
        <button class="px-2 py-1 rounded-lg border" data-action="rm">✕</button>
      </div>`;
    div.querySelector('[data-action="dec"]').onclick = () => changeQty(i.id, -1);
    div.querySelector('[data-action="inc"]').onclick = () => changeQty(i.id, +1);
    div.querySelector('[data-action="rm"]').onclick = () => removeFromCart(i.id);
    root.appendChild(div);
  });
  els.cartTotal().textContent = formatPrice(cartTotal());
}

function productCard(p){
  const card = document.createElement('div');
  card.className = 'bg-white rounded-2xl border p-4 flex flex-col';
  card.innerHTML = `
    <div class="text-sm text-zinc-500">#${p.id}</div>
    <div class="mt-1 text-lg font-semibold">${p.title}</div>
    <div class="text-sm text-zinc-600">${p.subtitle||''}</div>
    <div class="mt-3 text-2xl font-bold">${formatPrice(p.price)}</div>
    <button class="mt-3 bg-black text-white rounded-xl py-2 font-semibold">В корзину</button>`;
  card.querySelector('button').onclick = () => addToCart(p);
  return card;
}

function renderProducts(){
  const root = els.products(); root.innerHTML = '';
  state.products.forEach(p => root.appendChild(productCard(p)));
}

function renderSetProducts(){
  const root = els.setProducts(); if(!root) return;
  root.innerHTML = '';
  (state.setproducts || []).forEach(p => root.appendChild(productCard(p)));
}

function renderNews(){
  const root = els.news(); root.innerHTML = '';
  (state.news || []).forEach(n => {
    const card = document.createElement('a');
    card.href = n.link || '#'; card.target = n.link ? '_blank' : '';
    card.className = 'bg-white rounded-2xl border p-4 block';
    card.innerHTML = `
      <div class="text-xs text-zinc-500">${new Date(n.date).toLocaleDateString('ru-RU')}</div>
      <div class="mt-1 font-semibold">${n.title}</div>
      <div class="text-sm text-zinc-600">${n.text||''}</div>`;
    root.appendChild(card);
  });
}

function renderHighlights(){
  const root = els.highlights(); root.innerHTML = '';
  (state.highlights || []).forEach(h => {
    const li = document.createElement('li');
    li.className = 'bg-white/10 rounded-xl px-3 py-2';
    li.textContent = h; root.appendChild(li);
  });
}

function renderRequisites(){
  const root = els.requisites(); root.innerHTML = '';
  (state.requisites || []).forEach(r => {
    const li = document.createElement('li');
    li.innerHTML = `<span class="font-semibold">${r.label}:</span> ${r.value}`;
    root.appendChild(li);
  });
}

async function loadConfig(){
  const res = await fetch('shop-config.json');
  const cfg = await res.json();
  state.products = cfg.products || [];
  state.setproducts = cfg.setproducts || [];
  state.news = cfg.news || [];
  state.highlights = cfg.highlights || [];
  state.requisites = cfg.requisites || [];
  state.tg = cfg.telegram || {};
  state.currency = cfg.currency || 'KGS';
  nf = new Intl.NumberFormat('ru-RU', { style: 'currency', currency: state.currency, maximumFractionDigits: 0 });

  document.getElementById('year').textContent = new Date().getFullYear();
  document.getElementById('tgChannelLink').href = state.tg.channel || '#';
  document.getElementById('tgBotLink').href = state.tg.bot || '#';
  document.getElementById('contactChannel').href = state.tg.channel || '#';
  document.getElementById('contactBot').href = state.tg.bot || '#';
  document.getElementById('channelHandle').textContent = state.tg.channel || '';
  document.getElementById('botHandle').textContent = state.tg.bot || '';

  renderProducts(); renderSetProducts(); renderNews(); renderHighlights(); renderRequisites(); renderCart();
}

// Drawer events
document.getElementById('openCart').onclick = () => { document.getElementById('cartDrawer').classList.remove('hidden'); renderCart(); };
document.getElementById('closeCart').onclick = () => { document.getElementById('cartDrawer').classList.add('hidden'); };

// Checkout → JSON (без фото) или multipart/form-data (с фото)
document.getElementById('checkoutForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (state.cart.length === 0) return alert('Корзина пуста');

  // читаем конфиг для URL воркера
  const { telegram_proxy_url: endpoint } = await fetch('shop-config.json').then(r => r.json());
  if (!endpoint) return alert('telegram_proxy_url пуст. Укажите URL Cloudflare Worker в shop-config.json');

  const fd = new FormData(e.target);
  const receiptFile = els.receiptInput() && els.receiptInput().files[0];

  try {
    let res;
    if (receiptFile) {
      // multipart + items как JSON-строка
      const form = new FormData();
      form.append('tg_id', fd.get('tg_id'));
      form.append('contact', fd.get('contact') || '');
      form.append('comment', fd.get('comment') || '');
      form.append('total', String(cartTotal()));
      form.append('currency', state.currency || 'KGS');
      form.append('items', JSON.stringify(state.cart));
      form.append('receipt', receiptFile);

      res = await fetch(endpoint, { method: 'POST', body: form });
    } else {
      // обычный JSON
      const payload = {
        tg_id: fd.get('tg_id'),
        contact: fd.get('contact') || '',
        comment: fd.get('comment') || '',
        items: state.cart,
        total: cartTotal(),
        currency: state.currency
      };
      res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    }

    if (!res.ok) {
      const t = await res.text().catch(()=> '');
      throw new Error(t || 'Ошибка отправки заказа');
    }

    alert('Заказ отправлен! Мы свяжемся в Telegram.');
    state.cart = []; saveCart(); renderCart(); document.getElementById('cartDrawer').classList.add('hidden');
  } catch (err) {
    alert(err.message);
  }
});

loadConfig(); renderCartBadge();
