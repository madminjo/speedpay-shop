const state = {
	products: [],
	news: [],
	highlights: [],
	requisites: [],
	tg: { channel: '', bot: '', botUsername: '' },
	cart: JSON.parse(localStorage.getItem('cart') || '[]'),
	currency: 'KGS',
}

const f = new Intl.NumberFormat('ru-RU', {
	style: 'currency',
	currency: 'KGS',
	maximumFractionDigits: 0,
})

const els = {
	products: () => document.getElementById('products'),
	setProducts: () => document.getElementById('setproducts'),
	news: () => document.getElementById('newsList'),
	highlights: () => document.getElementById('highlights'),
	requisites: () => document.getElementById('requisites'),
	cartCount: () => document.getElementById('cartCount'),
	cartItems: () => document.getElementById('cartItems'),
	cartTotal: () => document.getElementById('cartTotal'),
}

function saveCart() {
	localStorage.setItem('cart', JSON.stringify(state.cart))
}
function addToCart(p) {
	const existing = state.cart.find(i => i.id === p.id)
	if (existing) existing.qty += 1
	else state.cart.push({ id: p.id, title: p.title, price: p.price, qty: 1 })
	renderCartBadge()
	saveCart()
}
function removeFromCart(id) {
	state.cart = state.cart.filter(i => i.id !== id)
	renderCart()
	saveCart()
}
function changeQty(id, d) {
	const item = state.cart.find(i => i.id === id)
	if (!item) return
	item.qty += d
	if (item.qty < 1) item.qty = 1
	renderCart()
	saveCart()
}
function cartTotal() {
	return state.cart.reduce((s, i) => s + i.price * i.qty, 0)
}

function renderCartBadge() {
	els.cartCount().textContent = state.cart.reduce((s, i) => s + i.qty, 0)
}
function renderCart() {
	renderCartBadge()
	const root = els.cartItems()
	root.innerHTML = ''
	state.cart.forEach(i => {
		const div = document.createElement('div')
		div.className = 'border rounded-xl p-3 flex items-center gap-3'
		div.innerHTML = `
          <div class="flex-1">
            <div class="font-semibold">${i.title}</div>
            <div class="text-sm text-zinc-600">${f.format(i.price)} × ${
			i.qty
		}</div>
          </div>
          <div class="flex items-center gap-2">
            <button class="px-2 py-1 rounded-lg border" data-action="dec">−</button>
            <button class="px-2 py-1 rounded-lg border" data-action="inc">+</button>
            <button class="px-2 py-1 rounded-lg border" data-action="rm">✕</button>
          </div>`
		div.querySelector('[data-action="dec"]').onclick = () => changeQty(i.id, -1)
		div.querySelector('[data-action="inc"]').onclick = () => changeQty(i.id, +1)
		div.querySelector('[data-action="rm"]').onclick = () => removeFromCart(i.id)
		root.appendChild(div)
	})
	els.cartTotal().textContent = f.format(cartTotal())
}

function renderProducts() {
	const root = els.products()
	root.innerHTML = ''
	state.products.forEach(p => {
		const card = document.createElement('div')
		card.className = 'bg-white rounded-2xl border p-4 flex flex-col'
		card.innerHTML = `
          <div class="text-sm text-zinc-500">#${p.id}</div>
          <div class="mt-1 text-lg font-semibold">${p.title}</div>
          <div class="text-sm text-zinc-600">${p.subtitle || ''}</div>
          <div class="mt-3 text-2xl font-bold">${f.format(p.price)}</div>
          <button class="mt-3 bg-black text-white rounded-xl py-2 font-semibold">В корзину</button>`
		card.querySelector('button').onclick = () => {
			addToCart(p)
		}
		root.appendChild(card)
	})
}

function renderNews() {
	const root = els.news()
	root.innerHTML = ''
	state.news.forEach(n => {
		const card = document.createElement('a')
		card.href = n.link || '#'
		card.target = n.link ? '_blank' : ''
		card.className = 'bg-white rounded-2xl border p-4 block'
		card.innerHTML = `
          <div class="text-xs text-zinc-500">${new Date(
						n.date
					).toLocaleDateString('ru-RU')}</div>
          <div class="mt-1 font-semibold">${n.title}</div>
          <div class="text-sm text-zinc-600">${n.text || ''}</div>`
		root.appendChild(card)
	})
}

function renderHighlights() {
	const root = els.highlights()
	root.innerHTML = ''
	state.highlights.forEach(h => {
		const li = document.createElement('li')
		li.className = 'bg-white/10 rounded-xl px-3 py-2'
		li.textContent = h
		root.appendChild(li)
	})
}

function renderRequisites() {
	const root = els.requisites()
	root.innerHTML = ''
	state.requisites.forEach(r => {
		const li = document.createElement('li')
		li.innerHTML = `<span class="font-semibold">${r.label}:</span> ${r.value}`
		root.appendChild(li)
	})
}

async function loadConfig() {
	const res = await fetch('shop-config.json')
	const cfg = await res.json()
	state.products = cfg.products
	state.news = cfg.news
	state.highlights = cfg.highlights || []
	state.requisites = cfg.requisites || []
	state.tg = cfg.telegram || {}
	state.currency = cfg.currency || 'KGS'
	document.getElementById('year').textContent = new Date().getFullYear()
	document.getElementById('tgChannelLink').href = state.tg.channel
	document.getElementById('tgBotLink').href = state.tg.bot
	document.getElementById('contactChannel').href = state.tg.channel
	document.getElementById('contactBot').href = state.tg.bot
	document.getElementById('channelHandle').textContent = state.tg.channel
	document.getElementById('botHandle').textContent = state.tg.bot
	renderProducts()
	renderNews()
	renderHighlights()
	renderRequisites()
	renderCart()
}

// Drawer events
document.getElementById('openCart').onclick = () => {
	document.getElementById('cartDrawer').classList.remove('hidden')
	renderCart()
}
document.getElementById('closeCart').onclick = () => {
	document.getElementById('cartDrawer').classList.add('hidden')
}

// Checkout → POST в Cloudflare Worker (прокси на Telegram)
document.getElementById('checkoutForm').addEventListener('submit', async e => {
	e.preventDefault()
	if (state.cart.length === 0) return alert('Корзина пуста')
	const fd = new FormData(e.target)
	const payload = {
		tg_id: fd.get('tg_id'),
		contact: fd.get('contact') || '',
		comment: fd.get('comment') || '',
		items: state.cart,
		total: cartTotal(),
		currency: state.currency,
	}
	try {
		const endpoint = (await fetch('shop-config.json').then(r => r.json()))
			.telegram_proxy_url
		if (!endpoint)
			throw new Error(
				'telegram_proxy_url пуст. Укажите URL Cloudflare Worker в shop-config.json'
			)
		const res = await fetch(endpoint, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload),
		})
		if (!res.ok) throw new Error('Ошибка отправки заказа')
		const data = await res.json()
		alert('Заказ отправлен! Мы свяжемся в Telegram.')
		state.cart = []
		saveCart()
		renderCart()
		document.getElementById('cartDrawer').classList.add('hidden')
	} catch (err) {
		alert(err.message)
	}
})

loadConfig()
renderCartBadge()
