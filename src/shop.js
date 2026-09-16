export const SHOP_ITEMS = [
  {
    id: 'fly',
    name: 'Flyg',
    desc: 'Sväva 7 sek · bara denna runda',
    price: 90,
    icon: '✈',
  },
  {
    id: 'train',
    name: 'Tåg-hopp',
    desc: 'Hoppa på tåg · bara denna runda',
    price: 120,
    icon: '🚆',
  },
  {
    id: 'magnet',
    name: 'Magnet',
    desc: 'Sug in mynt 10 sek · bara denna runda',
    price: 75,
    icon: '🧲',
  },
  {
    id: 'shield',
    name: 'Sköld',
    desc: 'Överlev en träff 8 sek · bara denna runda',
    price: 130,
    icon: '🛡',
  },
  {
    id: 'double',
    name: 'Dubbla mynt',
    desc: '2× mynt 12 sek · bara denna runda',
    price: 95,
    icon: '✦',
  },
  {
    id: 'megaJump',
    name: 'Mega-hopp',
    desc: 'Högre hopp 10 sek · bara denna runda',
    price: 65,
    icon: '⬆',
  },
]

export const SHOP_PRICES = Object.fromEntries(SHOP_ITEMS.map((item) => [item.id, item.price]))

export function createShopUI({ onBuy, getCoins }) {
  const btn = document.getElementById('shop-btn')
  const panel = document.getElementById('shop-panel')
  const closeBtn = document.getElementById('shop-close')
  const list = document.getElementById('shop-list')
  const bal = document.getElementById('shop-balance')

  function refresh() {
    const coins = getCoins()
    bal.textContent = String(coins)
    list.querySelectorAll('[data-id]').forEach((el) => {
      const price = Number(el.dataset.price)
      const buy = el.querySelector('.shop-buy')
      const affordable = coins >= price
      buy.disabled = !affordable
      buy.textContent = affordable ? `${price} mynt` : `Saknar ${price - coins}`
    })
  }

  list.innerHTML = SHOP_ITEMS.map(
    (item) => `
    <div class="shop-item" data-id="${item.id}" data-price="${item.price}">
      <div class="shop-icon">${item.icon}</div>
      <div class="shop-info">
        <div class="shop-name">${item.name}</div>
        <div class="shop-desc">${item.desc}</div>
      </div>
      <button type="button" class="shop-buy">${item.price} mynt</button>
    </div>
  `,
  ).join('')

  list.addEventListener('click', (e) => {
    const buy = e.target.closest('.shop-buy')
    if (!buy || buy.disabled) return
    const row = buy.closest('.shop-item')
    const id = row.dataset.id
    const ok = onBuy(id)
    if (ok) refresh()
  })

  btn.addEventListener('click', (e) => {
    e.stopPropagation()
    panel.classList.toggle('hidden')
    refresh()
  })

  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    panel.classList.add('hidden')
  })

  panel.addEventListener('click', (e) => e.stopPropagation())

  return {
    refresh,
    close() {
      panel.classList.add('hidden')
    },
    open() {
      panel.classList.remove('hidden')
      refresh()
    },
    isOpen() {
      return !panel.classList.contains('hidden')
    },
  }
}
