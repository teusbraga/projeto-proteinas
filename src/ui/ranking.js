import { escapeHtml } from '../utils.js'
import { getCurrencySymbol } from '../calculator.js'
import { t } from '../i18n.js'

/**
 * Renderiza o ranking público de produtos no container especificado.
 *
 * @param {HTMLElement} container
 * @param {Array<Object>} products
 */
export function renderRankingList(container, products) {
  if (!container) return

  if (!products.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🥗</div>
        <div class="empty-state-title">${t('emptyRankingTitle')}</div>
        <div class="empty-state-sub">${t('emptyRankingSub')}</div>
      </div>`
    return
  }

  const list = document.createElement('div')
  list.className = 'ranking-list'

  products.forEach((product, i) => {
    const rank = i + 1
    const rankEl = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}°`
    const rankClass = rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : ''

    const card = document.createElement('div')
    card.className = `ranking-card ranking-card-global${rank === 1 ? ' rank-gold' : ''}`
    card.style.animationDelay = `${Math.min(i * 35, 300)}ms`

    const badgeClass = product.food_type === 'animal' ? 'badge-animal' : 'badge-vegetal'
    const badgeLabel = product.food_type === 'animal' ? t('badgeAnimal') : t('badgeVegetal')

    const locationText = product.store_name
      ? (product.city ? `${product.store_name} (${product.city})` : product.store_name)
      : (product.city || '')

    const locationHtml = locationText
      ? `<span class="rank-location">📍 ${escapeHtml(locationText)}</span>`
      : ''

    const distanceHtml = product.distance_km != null
      ? `<span class="badge badge-distance">📏 ${product.distance_km < 1 ? `${Math.round(product.distance_km * 1000)} m` : `${product.distance_km.toFixed(1)} km`}</span>`
      : ''

    const symbol = getCurrencySymbol(product.currency || 'BRL')

    card.innerHTML = `
      <div class="rank-number ${rankClass}">${rankEl}</div>
      <div class="rank-photo">
        ${product.photo_url
          ? `<img src="${escapeHtml(product.photo_url)}" alt="${escapeHtml(product.name)}" loading="lazy">`
          : (product.food_type === 'animal' ? '🥩' : '🌱')
        }
      </div>
      <div class="rank-info">
        <div class="rank-name">
          ${escapeHtml(product.name)}
          ${product.brand ? `<span class="rank-brand">· ${escapeHtml(product.brand)}</span>` : ''}
        </div>
        <div class="rank-meta">
          <span class="badge ${badgeClass}">${badgeLabel}</span>
          ${distanceHtml}
          ${locationHtml}
        </div>
      </div>
      <div class="rank-price">
        <div class="rank-price-value">${symbol} ${Number(product.price_per_g_protein).toFixed(4)}</div>
        <div class="rank-price-unit">${t('perGramUnit')}</div>
      </div>
    `
    list.appendChild(card)
  })

  container.innerHTML = ''
  container.appendChild(list)
}

/**
 * Renderiza os produtos da aba "Meu Ranking" (Locais e/ou salvos pelo usuário).
 *
 * @param {HTMLElement} container
 * @param {Array<Object>} products
 * @param {(productId: string, photoUrl: string|null) => Promise<void>} onDelete
 */
export function renderPersonalRankingList(container, products, onDelete) {
  if (!container) return

  if (!products.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📝</div>
        <div class="empty-state-title">${t('emptyPersonalTitle')}</div>
        <div class="empty-state-sub">${t('emptyPersonalSub')}</div>
      </div>`
    return
  }

  const list = document.createElement('div')
  list.className = 'ranking-list'

  products.forEach((product, i) => {
    const rank = i + 1
    const rankEl = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}°`
    const rankClass = rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : ''

    const card = document.createElement('div')
    card.className = `ranking-card ranking-card-personal${rank === 1 ? ' rank-gold' : ''}`
    card.style.animationDelay = `${Math.min(i * 35, 300)}ms`

    const badgeClass = product.food_type === 'animal' ? 'badge-animal' : 'badge-vegetal'
    const badgeLabel = product.food_type === 'animal' ? t('badgeAnimal') : t('badgeVegetal')

    const locationText = product.store_name
      ? (product.city ? `${product.store_name} (${product.city})` : product.store_name)
      : (product.city || '')

    const locationHtml = locationText
      ? `<span class="rank-location">📍 ${escapeHtml(locationText)}</span>`
      : ''

    const isLocalTag = product.is_local
      ? `<span class="badge badge-local">💾 ${t('badgeLocal')}</span>`
      : ''

    const distanceHtml = product.distance_km != null
      ? `<span class="badge badge-distance">📏 ${product.distance_km < 1 ? `${Math.round(product.distance_km * 1000)} m` : `${product.distance_km.toFixed(1)} km`}</span>`
      : ''

    const symbol = getCurrencySymbol(product.currency || 'BRL')

    card.innerHTML = `
      <div class="rank-number ${rankClass}">${rankEl}</div>
      <div class="rank-photo">
        ${product.photo_url
          ? `<img src="${escapeHtml(product.photo_url)}" alt="${escapeHtml(product.name)}" loading="lazy">`
          : (product.food_type === 'animal' ? '🥩' : '🌱')
        }
      </div>
      <div class="rank-info">
        <div class="rank-name">
          ${escapeHtml(product.name)}
          ${product.brand ? `<span class="rank-brand">· ${escapeHtml(product.brand)}</span>` : ''}
        </div>
        <div class="rank-meta">
          <span class="badge ${badgeClass}">${badgeLabel}</span>
          ${isLocalTag}
          ${distanceHtml}
          ${locationHtml}
        </div>
      </div>
      <div class="rank-price" style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">
        <div>
          <div class="rank-price-value">${symbol} ${Number(product.price_per_g_protein).toFixed(4)}</div>
          <div class="rank-price-unit">${t('perGramUnit')}</div>
        </div>
        ${onDelete ? `
          <button class="btn-danger btn-delete-personal" data-id="${product.id}" style="padding:3px 8px;font-size:0.75rem">
            ${t('btnDelete')}
          </button>
        ` : ''}
      </div>
    `

    if (onDelete) {
      card.querySelector('.btn-delete-personal')?.addEventListener('click', async (e) => {
        const confirmed = window.confirm(t('confirmDelete'))
        if (!confirmed) return
        const btn = e.currentTarget
        btn.disabled = true
        btn.textContent = '...'
        await onDelete(product.id, product.photo_url || null)
      })
    }

    list.appendChild(card)
  })

  container.innerHTML = ''
  container.appendChild(list)
}

/**
 * Renderiza a lista de produtos criados pelo usuário com ação de exclusão confirmada.
 *
 * @param {HTMLElement} container
 * @param {Array<Object>} products
 * @param {(productId: string, photoUrl: string|null) => Promise<void>} onDelete
 */
export function renderMyProductsList(container, products, onDelete) {
  if (!container) return

  if (!products.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📋</div>
        <div class="empty-state-title">${t('emptyMyProductsTitle')}</div>
      </div>`
    return
  }

  const list = document.createElement('div')
  list.className = 'my-products-list'

  products.forEach(product => {
    const row = document.createElement('div')
    row.className = 'my-product-row'
    row.dataset.id = product.id

    const badgeClass = product.food_type === 'animal' ? 'badge-animal' : 'badge-vegetal'
    const badgeLabel = product.food_type === 'animal' ? '🥩' : '🌱'

    const locationText = product.store_name
      ? (product.city ? `${product.store_name} (${product.city})` : product.store_name)
      : (product.city || '')

    const symbol = getCurrencySymbol(product.currency || 'BRL')

    row.innerHTML = `
      <div>
        <div class="my-product-name">${escapeHtml(product.name)}</div>
        <div class="my-product-sub">
          <span class="badge ${badgeClass}">${badgeLabel}</span>
          ${locationText ? `📍 ${escapeHtml(locationText)}` : ''}
        </div>
      </div>
      <div class="my-product-price">${symbol} ${Number(product.price_per_g_protein).toFixed(4)}/g</div>
      <button class="btn-danger btn-remove" data-id="${product.id}" aria-label="${t('btnDelete')} ${escapeHtml(product.name)}">
        ${t('btnDelete')}
      </button>
    `

    const btnRemove = row.querySelector('.btn-remove')
    btnRemove.addEventListener('click', async () => {
      const confirmed = window.confirm(t('confirmDelete'))
      if (!confirmed) return

      btnRemove.disabled = true
      btnRemove.textContent = '...'
      try {
        await onDelete(product.id, product.photo_url || null)
      } catch (err) {
        console.error('[Delete UI]', err)
        btnRemove.disabled = false
        btnRemove.textContent = t('btnDelete')
      }
    })

    list.appendChild(row)
  })

  container.innerHTML = ''
  container.appendChild(list)
}
