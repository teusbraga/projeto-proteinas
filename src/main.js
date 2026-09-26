/**
 * main.js — Orquestrador central da aplicação ProteinPrice
 *
 * Responsabilidades:
 * 1. Inicializar autenticação e reagir a mudanças de sessão
 * 2. Renderizar o formulário (ou login prompt) dependendo do auth state
 * 3. Gerenciar o ciclo de vida do formulário: validação, compressão, submit
 * 4. Carregar e renderizar o ranking público
 * 5. Carregar e renderizar a lista pessoal do usuário
 * 6. Configurar modais, filtros e eventos globais
 */

import { supabase } from './supabase.js'
import { signInWithGoogle, signOut, onAuthChange } from './auth.js'
import { calcularPrecoPorGrama, formatarPreco, validarCampos } from './calculator.js'
import { saveProduct, getMyProducts, getRanking, deleteProduct, getStats, subscribeRanking } from './products.js'
import { openMapModal, closeMapModal, resetMapModal } from './ui/modal.js'
import { showToast } from './ui/toast.js'
import { getSelectedLocation } from './map.js'

// ============================================================
// ESTADO GLOBAL DA APLICAÇÃO
// ============================================================

const state = {
  user:          null,    // User | null
  filter:        'all',   // 'all' | 'animal' | 'vegetal'
  photoFile:     null,    // File | null
  location:      null,    // { lat, lng, placeName } | null
}

// ============================================================
// INICIALIZAÇÃO
// ============================================================

async function init() {
  setupGlobalEvents()
  setupFilters()

  // Ouve mudanças de autenticação — dispara imediatamente com estado atual
  // e também processa automaticamente o callback OAuth do Google
  onAuthChange(async (user) => {
    state.user = user

    // Limpa a URL poluída com #access_token=... após o Supabase capturar a sessão
    if (window.location.hash && (window.location.hash.includes('access_token=') || window.location.hash.includes('error='))) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search)
    }

    renderAuthWidget(user)
    renderAddSection(user)

    if (user) {
      document.getElementById('section-my-products').classList.remove('hidden')
      loadMyProducts()
    } else {
      document.getElementById('section-my-products').classList.add('hidden')
      document.getElementById('my-products-container').innerHTML = ''
    }
  })

  // Ranking e stats podem carregar em paralelo sem depender de auth
  await Promise.all([loadRanking(), loadStats()])

  // Realtime: atualiza ranking quando alguém insere/altera/remove um produto
  subscribeRanking(() => {
    loadRanking()
    loadStats()
  })
}

// ============================================================
// AUTH WIDGET (header)
// ============================================================

function renderAuthWidget(user) {
  const widget = document.getElementById('auth-widget')

  if (user) {
    const firstName = user.user_metadata?.full_name?.split(' ')[0]
      ?? user.user_metadata?.name?.split(' ')[0]
      ?? 'Usuário'
    const avatar = user.user_metadata?.avatar_url ?? ''

    widget.innerHTML = `
      <div class="user-widget">
        ${avatar ? `<img class="avatar-img" src="${avatar}" alt="Avatar de ${firstName}" referrerpolicy="no-referrer">` : ''}
        <span class="avatar-name">${firstName}</span>
        <button class="btn-ghost" id="btn-signout">Sair</button>
      </div>
    `
    document.getElementById('btn-signout').addEventListener('click', async () => {
      try {
        await signOut()
        showToast('Sessão encerrada.', 'info')
      } catch {
        showToast('Erro ao sair.', 'error')
      }
    })
  } else {
    widget.innerHTML = `
      <button class="btn-primary" id="btn-login-header">
        ${googleIcon()}
        Entrar com Google
      </button>
    `
    document.getElementById('btn-login-header').addEventListener('click', () => signInWithGoogle())
  }
}

// ============================================================
// SEÇÃO: ADICIONAR PRODUTO
// ============================================================

function renderAddSection(user) {
  const card = document.getElementById('add-product-card')

  if (!user) {
    card.innerHTML = `
      <div class="login-prompt">
        <div class="login-prompt-icon">🔐</div>
        <div class="login-prompt-title">Entre para contribuir com a comunidade</div>
        <div class="login-prompt-subtitle">
          Cadastre produtos, marque o local onde você encontrou e ajude a comunidade
          a encontrar a proteína mais barata da cidade.
        </div>
        <button class="btn-primary" id="btn-login-card">
          ${googleIcon()}
          Entrar com Google
        </button>
      </div>
    `
    document.getElementById('btn-login-card').addEventListener('click', () => signInWithGoogle())
    return
  }

  // Reset de estado do formulário ao recarregar
  state.photoFile = null
  state.location = null

  card.innerHTML = `
    <h2 class="form-title">➕ Adicionar Produto</h2>
    <form id="product-form" novalidate autocomplete="off">
      <div class="form-grid">

        <!-- Nome -->
        <div class="form-group">
          <label for="f-name">Nome do Produto *</label>
          <input type="text" id="f-name" placeholder="Ex: Peito de Frango" required maxlength="100" autocomplete="off">
        </div>

        <!-- Marca -->
        <div class="form-group">
          <label for="f-brand">Marca</label>
          <input type="text" id="f-brand" placeholder="Ex: Sadia" maxlength="60" autocomplete="off">
        </div>

        <!-- Tipo -->
        <div class="form-group">
          <label for="f-type">Tipo de Proteína *</label>
          <select id="f-type" required>
            <option value="">Selecione...</option>
            <option value="animal">🥩 Proteína Animal</option>
            <option value="vegetal">🌱 Proteína Vegetal</option>
          </select>
        </div>

        <!-- Preço -->
        <div class="form-group">
          <label for="f-price">Preço Total (R$) *</label>
          <input type="number" id="f-price" placeholder="Ex: 19.90" required step="0.01" min="0.01">
        </div>

        <!-- Peso total -->
        <div class="form-group">
          <label for="f-weight">Peso Total (g) *</label>
          <input type="number" id="f-weight" placeholder="Ex: 500" required step="0.1" min="0.1">
        </div>

        <!-- Porção -->
        <div class="form-group">
          <label for="f-portion">Peso da Porção (g) *</label>
          <input type="number" id="f-portion" placeholder="Ex: 100" required step="0.1" min="0.1">
        </div>

        <!-- Proteína por porção -->
        <div class="form-group">
          <label for="f-protein">Proteína na Porção (g) *</label>
          <input type="number" id="f-protein" placeholder="Ex: 31" required step="0.1" min="0.1">
        </div>

        <!-- Preview em tempo real do cálculo -->
        <div class="form-group full-width" id="calc-preview-wrapper" style="display:none">
          <div class="calc-preview">
            <span class="calc-preview-label">💡 Preço por grama de proteína</span>
            <span class="calc-preview-value" id="calc-preview-value">—</span>
          </div>
        </div>

        <!-- Foto -->
        <div class="form-group full-width">
          <label>Foto do Produto <span style="color:var(--text-3);font-weight:400">(opcional, máx. 5MB)</span></label>
          <div class="photo-upload-wrapper" id="photo-upload-area">
            <input class="photo-input" type="file" id="f-photo" accept="image/jpeg,image/png,image/webp">
            <span class="photo-upload-label" id="photo-label">📸 Clique para adicionar uma foto</span>
            <img class="photo-preview-img" id="photo-preview" alt="Preview da foto">
          </div>
        </div>

        <!-- Localização -->
        <div class="form-group full-width">
          <label>Local de Compra <span style="color:var(--text-3);font-weight:400">(opcional)</span></label>
          <button type="button" class="location-btn" id="btn-add-location">
            📍 <span id="location-text">Selecionar local no mapa</span>
          </button>
        </div>

        <!-- Ações -->
        <div class="form-actions">
          <button type="submit" class="btn-primary" id="btn-submit">
            🚀 Adicionar ao Ranking
          </button>
        </div>

      </div>
    </form>
  `

  setupFormEvents()
}

// ============================================================
// EVENTOS DO FORMULÁRIO
// ============================================================

function setupFormEvents() {
  // Preview de cálculo em tempo real
  ;['f-price', 'f-weight', 'f-portion', 'f-protein'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', updateCalcPreview)
  })

  // Upload de foto
  document.getElementById('f-photo')?.addEventListener('change', handlePhotoChange)

  // Botão de localização
  document.getElementById('btn-add-location')?.addEventListener('click', () => {
    openMapModal((loc) => {
      state.location = loc
      const btn = document.getElementById('btn-add-location')
      const text = document.getElementById('location-text')
      if (loc && btn && text) {
        btn.classList.add('has-location')
        text.textContent = loc.placeName.length > 55
          ? loc.placeName.slice(0, 55) + '…'
          : loc.placeName
      }
    })
  })

  // Submit
  document.getElementById('product-form')?.addEventListener('submit', handleFormSubmit)
}

function updateCalcPreview() {
  const preco   = parseFloat(document.getElementById('f-price')?.value)
  const peso    = parseFloat(document.getElementById('f-weight')?.value)
  const porcao  = parseFloat(document.getElementById('f-portion')?.value)
  const proteina = parseFloat(document.getElementById('f-protein')?.value)

  const wrapper = document.getElementById('calc-preview-wrapper')
  const valueEl = document.getElementById('calc-preview-value')

  if (wrapper && valueEl && [preco, peso, porcao, proteina].every(v => v > 0)) {
    wrapper.style.display = 'block'
    const result = calcularPrecoPorGrama(preco, peso, porcao, proteina)
    valueEl.textContent = formatarPreco(result)
  } else if (wrapper) {
    wrapper.style.display = 'none'
  }
}

function handlePhotoChange(e) {
  const file = e.target.files?.[0]
  if (!file) return

  if (file.size > 10 * 1024 * 1024) {
    showToast('Foto muito grande! O limite é 10MB.', 'error')
    e.target.value = ''
    return
  }

  state.photoFile = file

  const reader = new FileReader()
  reader.onload = (ev) => {
    const preview = document.getElementById('photo-preview')
    const label   = document.getElementById('photo-label')
    if (preview && label) {
      preview.src = ev.target.result
      preview.style.display = 'block'
      label.style.display = 'none'
    }
  }
  reader.readAsDataURL(file)
}

async function handleFormSubmit(e) {
  e.preventDefault()

  const name    = document.getElementById('f-name')?.value.trim()
  const brand   = document.getElementById('f-brand')?.value.trim()
  const type    = document.getElementById('f-type')?.value
  const preco   = parseFloat(document.getElementById('f-price')?.value)
  const peso    = parseFloat(document.getElementById('f-weight')?.value)
  const porcao  = parseFloat(document.getElementById('f-portion')?.value)
  const proteina = parseFloat(document.getElementById('f-protein')?.value)

  // Validação
  if (!name || name.length < 2) {
    showToast('Nome do produto é obrigatório (mínimo 2 caracteres).', 'error')
    return
  }
  if (!type) {
    showToast('Selecione o tipo de proteína.', 'error')
    return
  }
  const validationError = validarCampos({ preco, peso, porcao, proteina })
  if (validationError) {
    showToast(validationError, 'error')
    return
  }

  // UI: loading state
  const btn = document.getElementById('btn-submit')
  if (btn) {
    btn.disabled = true
    btn.textContent = '⏳ Salvando...'
  }

  try {
    // Garante que o token/sessão do Supabase está ativo antes de tentar gravar
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) {
      showToast('Sessão expirada. Faça login novamente.', 'error')
      state.user = null
      renderAuthWidget(null)
      renderAddSection(null)
      return
    }
    state.user = session.user

    // Comprime a foto se necessário (> 1.5MB → reduz para ~800KB JPEG)
    let photoFile = state.photoFile
    if (photoFile && photoFile.size > 1.5 * 1024 * 1024) {
      photoFile = await compressImage(photoFile)
    }

    await saveProduct({
      userId:    session.user.id,
      name,
      foodType:  type,
      brand:     brand || null,
      price:     preco,
      weightG:   peso,
      portionG:  porcao,
      proteinG:  proteina,
      photoFile,
      storeName: state.location?.placeName ?? null,
      latitude:  state.location?.lat ?? null,
      longitude: state.location?.lng ?? null,
    })

    showToast('Produto adicionado ao ranking! 🎉', 'success')

    // Reset do formulário e estado
    document.getElementById('product-form').reset()
    state.photoFile = null
    state.location  = null
    resetMapModal()

    const preview = document.getElementById('photo-preview')
    const label   = document.getElementById('photo-label')
    if (preview) { preview.src = ''; preview.style.display = 'none' }
    if (label)   { label.style.display = 'block' }

    const locBtn  = document.getElementById('btn-add-location')
    const locText = document.getElementById('location-text')
    if (locBtn)  { locBtn.classList.remove('has-location') }
    if (locText) { locText.textContent = 'Selecionar local no mapa' }

    const calcWrapper = document.getElementById('calc-preview-wrapper')
    if (calcWrapper) calcWrapper.style.display = 'none'

    // Recarrega listas
    await Promise.all([loadRanking(), loadMyProducts()])

    // Scroll suave para o ranking
    setTimeout(() => {
      document.getElementById('section-ranking')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 300)

  } catch (err) {
    console.error('[Submit]', err)
    const isStorageError = err.message?.includes('storage')
    showToast(
      isStorageError
        ? 'Erro ao enviar foto. Tente sem a imagem.'
        : 'Erro ao salvar. Verifique sua conexão e tente novamente.',
      'error'
    )
  } finally {
    if (btn) {
      btn.disabled = false
      btn.textContent = '🚀 Adicionar ao Ranking'
    }
  }
}

// ============================================================
// COMPRESSÃO DE IMAGEM (client-side)
// ============================================================

/**
 * Redimensiona e comprime a imagem no browser antes do upload.
 * Evita enviar fotos de 10MB para o Supabase Storage.
 */
function compressImage(file, maxWidth = 1200, quality = 0.82) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width)
        const canvas = document.createElement('canvas')
        canvas.width  = Math.round(img.width  * scale)
        canvas.height = Math.round(img.height * scale)

        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

        canvas.toBlob(
          (blob) => resolve(new File([blob], file.name, { type: 'image/jpeg' })),
          'image/jpeg',
          quality
        )
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  })
}

// ============================================================
// RANKING
// ============================================================

async function loadRanking() {
  const container = document.getElementById('ranking-container')
  if (!container) return

  // Skeleton loading
  container.innerHTML = Array.from({ length: 4 }, (_, i) => `
    <div class="loading-pulse ranking-skeleton" style="animation-delay:${i * 80}ms;margin-bottom:10px"></div>
  `).join('')

  try {
    const products = await getRanking({ foodType: state.filter })
    renderRanking(products)
  } catch (err) {
    console.error('[Ranking]', err)
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⚠️</div>
        <div class="empty-state-title">Erro ao carregar o ranking.</div>
        <div class="empty-state-sub">Verifique sua conexão e recarregue a página.</div>
      </div>`
  }
}

function renderRanking(products) {
  const container = document.getElementById('ranking-container')
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

    const locationHtml = product.store_name
      ? `<span class="rank-location">📍 ${escapeHtml(product.store_name)}</span>`
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

// ============================================================
// MINHA LISTA
// ============================================================

async function loadMyProducts() {
  if (!state.user) return
  const container = document.getElementById('my-products-container')
  if (!container) return

  container.innerHTML = `<div class="loading-pulse" style="height:72px;border-radius:12px"></div>`

  try {
    const products = await getMyProducts(state.user.id)
    renderMyProducts(products)
  } catch (err) {
    console.error('[MyProducts]', err)
    container.innerHTML = `<div class="empty-state"><div class="empty-state-title">Erro ao carregar sua lista.</div></div>`
  }
}

function renderMyProducts(products) {
  const container = document.getElementById('my-products-container')
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

    row.innerHTML = `
      <div>
        <div class="my-product-name">${escapeHtml(product.name)}</div>
        <div class="my-product-sub">
          <span class="badge ${badgeClass}">${badgeLabel}</span>
          ${product.store_name ? `📍 ${escapeHtml(product.store_name)}` : ''}
        </div>
      </div>
      <div class="my-product-price">R$ ${Number(product.price_per_g_protein).toFixed(4)}/g</div>
      <button class="btn-danger btn-remove" data-id="${product.id}" aria-label="Remover ${escapeHtml(product.name)}">
        Remover
      </button>
    `

    row.querySelector('.btn-remove').addEventListener('click', async (e) => {
      const id = e.currentTarget.getAttribute('data-id')
      e.currentTarget.disabled = true
      e.currentTarget.textContent = '...'
      try {
        await deleteProduct(id)
        showToast('Produto removido.', 'info')
        await Promise.all([loadMyProducts(), loadRanking()])
      } catch (err) {
        console.error('[Delete]', err)
        showToast('Erro ao remover. Tente novamente.', 'error')
        e.currentTarget.disabled = false
        e.currentTarget.textContent = 'Remover'
      }
    })

    list.appendChild(row)
  })

  container.innerHTML = ''
  container.appendChild(list)
}

// ============================================================
// STATS (hero)
// ============================================================

async function loadStats() {
  try {
    const stats = await getStats()
    const el = document.getElementById('hero-stats')
    if (!el) return

    const parts = []

    if (stats.totalProducts > 0) {
      parts.push(`
        <div class="stat-item">
          <div class="stat-value">${stats.totalProducts}</div>
          <div class="stat-label">Produtos catalogados</div>
        </div>`)
    }

    if (stats.cheapestPricePerG) {
      parts.push(`
        <div class="stat-item">
          <div class="stat-value">R$ ${Number(stats.cheapestPricePerG).toFixed(4)}</div>
          <div class="stat-label">Melhor preço/g proteína</div>
        </div>`)
    }

    el.innerHTML = parts.length > 0
      ? parts.join('')
      : '<div class="stat-item"><div class="stat-label" style="color:var(--text-3)">Seja o primeiro a cadastrar!</div></div>'

  } catch {
    // Stats são opcionais — não bloquear a UX
  }
}

// ============================================================
// FILTROS DO RANKING
// ============================================================

function setupFilters() {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'))
      btn.classList.add('active')
      state.filter = btn.getAttribute('data-filter')
      await loadRanking()
    })
  })
}

// ============================================================
// EVENTOS GLOBAIS
// ============================================================

function setupGlobalEvents() {
  // Scroll para ranking
  document.getElementById('btn-scroll-ranking')?.addEventListener('click', () => {
    document.getElementById('section-ranking')?.scrollIntoView({ behavior: 'smooth' })
  })

  // Fechar modal do mapa
  document.getElementById('btn-close-modal')?.addEventListener('click', () => closeMapModal())

  // Clicar fora do modal fecha ele
  document.getElementById('map-modal-overlay')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeMapModal()
  })

  // ESC fecha o modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMapModal()
  })
}

// ============================================================
// UTILITÁRIOS
// ============================================================

/** Escapa caracteres HTML para evitar XSS em conteúdo gerado dinamicamente. */
function escapeHtml(str) {
  if (!str) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

/** SVG do ícone do Google para os botões de login. */
function googleIcon() {
  return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>`
}

// ============================================================
// START
// ============================================================
init()
