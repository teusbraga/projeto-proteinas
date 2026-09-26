import { escapeHtml } from '../utils.js'

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
        <div class="empty-state-title">Nenhum produto cadastrado ainda.</div>
        <div class="empty-state-sub">Seja o primeiro a contribuir com a comunidade!</div>
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
    card.className = `ranking-card${rank === 1 ? ' rank-gold' : ''}`
    card.style.animationDelay = `${Math.min(i * 35, 300)}ms`

    const badgeClass = product.food_type === 'animal' ? 'badge-animal' : 'badge-vegetal'
    const badgeLabel = product.food_type === 'animal' ? '🥩 Animal' : '🌱 Vegetal'

    const locationText = product.store_name
      ? (product.city ? `${product.store_name} (${product.city})` : product.store_name)
      : (product.city || '')

    const locationHtml = locationText
      ? `<span class="rank-location">📍 ${escapeHtml(locationText)}</span>`
      : ''

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
          ${locationHtml}
        </div>
      </div>
      <div class="rank-price">
        <div class="rank-price-value">R$ ${Number(product.price_per_g_protein).toFixed(4)}</div>
        <div class="rank-price-unit">por g de proteína</div>
      </div>
    `
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
        <div class="empty-state-title">Sua lista está vazia.</div>
        <div class="empty-state-sub">Use o formulário acima para adicionar seu primeiro produto.</div>
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

    row.innerHTML = `
      <div>
        <div class="my-product-name">${escapeHtml(product.name)}</div>
        <div class="my-product-sub">
          <span class="badge ${badgeClass}">${badgeLabel}</span>
          ${locationText ? `📍 ${escapeHtml(locationText)}` : ''}
        </div>
      </div>
      <div class="my-product-price">R$ ${Number(product.price_per_g_protein).toFixed(4)}/g</div>
      <button class="btn-danger btn-remove" data-id="${product.id}" aria-label="Remover ${escapeHtml(product.name)}">
        Remover
      </button>
    `

    const btnRemove = row.querySelector('.btn-remove')
    btnRemove.addEventListener('click', async () => {
      // Confirmação para evitar exclusões acidentais no mobile/desktop
      const confirmed = window.confirm(`Deseja realmente remover "${product.name}"?`)
      if (!confirmed) return

      btnRemove.disabled = true
      btnRemove.textContent = '...'
      try {
        await onDelete(product.id, product.photo_url || null)
      } catch (err) {
        console.error('[Delete UI]', err)
        btnRemove.disabled = false
        btnRemove.textContent = 'Remover'
      }
    })

    list.appendChild(row)
  })

  container.innerHTML = ''
  container.appendChild(list)
}
