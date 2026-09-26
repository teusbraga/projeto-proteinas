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
import { calcularPrecoPorGrama, formatarPreco, validarCampos, getCurrencySymbol } from './calculator.js'
import { saveProduct, getMyProducts, getRanking, getLatestPins, deleteProduct, getStats, subscribeRanking } from './products.js'
import { openMapModal, closeMapModal, resetMapModal } from './ui/modal.js'
import { showToast } from './ui/toast.js'
import { renderRankingList, renderPersonalRankingList, renderMyProductsList } from './ui/ranking.js'
import { compressImage, escapeHtml, googleIcon, calculateDistanceKm } from './utils.js'
import { initGlobalMap } from './map.js'
import { getLocalProducts, saveLocalProduct, deleteLocalProduct, clearLocalProducts } from './localRanking.js'

// ============================================================
// ESTADO GLOBAL DA APLICAÇÃO
// ============================================================

const state = {
  user:            null,    // User | null
  activeTab:       'global',// 'global' | 'personal'
  filter:          'all',   // 'all' | 'animal' | 'vegetal'
  currency:        'BRL',   // 'BRL' | 'USD' | 'EUR' | 'all'
  city:            'all',   // 'all' | string
  userCoords:      null,    // { lat, lng } | null
  radiusKm:        25,      // raio padrão em km
  proximityActive: false,   // boolean
  photoFile:       null,    // File | null
  location:        null,    // { lat, lng, placeName, city } | null
}

// ============================================================
// INICIALIZAÇÃO
// ============================================================

async function init() {
  setupGlobalEvents()
  setupFilters()
  setupTabs()
  setupMobileFab()

  // Ouve mudanças de autenticação — dispara imediatamente com estado atual
  // e também processa automaticamente o callback OAuth do Google (PKCE ou Hash)
  onAuthChange(async (user) => {
    state.user = user

    // Limpa qualquer vestígio de autenticação (?code=... ou #...) mantendo a URL 100% limpa
    if (window.location.hash || window.location.search.includes('code=')) {
      window.history.replaceState(null, '', window.location.pathname)
    }

    renderAuthWidget(user)
    renderAddSection(user)
    checkSyncBanner()

    if (user) {
      document.getElementById('section-my-products').classList.remove('hidden')
      loadMyProducts()
    } else {
      document.getElementById('section-my-products').classList.add('hidden')
      document.getElementById('my-products-container').innerHTML = ''
    }

    if (state.activeTab === 'personal') {
      loadPersonalRanking()
    }
  })

  // Carrega em paralelo: Ranking Global, Mapa Global com 100 pins, Stats do Hero e Meu Ranking
  await Promise.all([loadRanking(), loadGlobalMap(), loadStats(), loadPersonalRanking()])

  // Realtime: atualiza ranking quando alguém insere/altera/remove um produto
  subscribeRanking(() => {
    loadRanking()
    loadStats()
    loadGlobalMap()
  })
}

// ============================================================
// ============================================================
// AUTH WIDGET (header & mobile drawer)
// ============================================================

function renderAuthWidget(user) {
  const widget = document.getElementById('auth-widget')
  const mobileRight = document.getElementById('header-mobile-right')
  const drawerAuth = document.getElementById('drawer-auth-section')

  if (user) {
    const firstName = user.user_metadata?.full_name?.split(' ')[0]
      ?? user.user_metadata?.name?.split(' ')[0]
      ?? 'Usuário'
    const avatar = user.user_metadata?.avatar_url ?? ''
    const fullName = user.user_metadata?.full_name || user.user_metadata?.name || firstName
    const email = user.email || ''

    // 1. Desktop Header
    if (widget) {
      widget.innerHTML = `
        <div class="user-widget">
          ${avatar ? `<img class="avatar-img" src="${avatar}" alt="Avatar de ${firstName}" referrerpolicy="no-referrer">` : ''}
          <span class="avatar-name">${firstName}</span>
          <button class="btn-ghost" id="btn-signout">Sair</button>
        </div>
      `
      document.getElementById('btn-signout')?.addEventListener('click', handleSignOut)
    }

    // 2. Mobile Top Bar Right (Avatar clicável que abre o menu lateral)
    if (mobileRight) {
      mobileRight.innerHTML = `
        <button class="btn-mobile-avatar" id="btn-mobile-avatar" aria-label="Abrir menu do perfil">
          ${avatar ? `<img class="avatar-img-sm" src="${avatar}" alt="Avatar" referrerpolicy="no-referrer">` : `<span class="avatar-letter">${firstName[0]}</span>`}
        </button>
      `
      document.getElementById('btn-mobile-avatar')?.addEventListener('click', openDrawer)
    }

    // 3. Mobile Drawer (Perfil completo + Botão Sair espaçoso que não quebra o topo)
    if (drawerAuth) {
      drawerAuth.innerHTML = `
        <div class="drawer-user-card">
          <div class="drawer-avatar-wrap">
            ${avatar
              ? `<img class="drawer-avatar-img" src="${avatar}" alt="Avatar de ${firstName}" referrerpolicy="no-referrer">`
              : `<div class="drawer-avatar-placeholder">${firstName[0]}</div>`}
          </div>
          <div class="drawer-user-info">
            <div class="drawer-user-name">${escapeHtml(fullName)}</div>
            <div class="drawer-user-email">${escapeHtml(email)}</div>
            <span class="drawer-user-badge">🟢 Conectado</span>
          </div>
        </div>
        <button class="btn-drawer-signout" id="btn-drawer-signout">
          🚪 Sair da Conta
        </button>
      `
      document.getElementById('btn-drawer-signout')?.addEventListener('click', handleSignOut)
    }

  } else {
    // 1. Desktop Header
    if (widget) {
      widget.innerHTML = `
        <button class="btn-primary" id="btn-login-header">
          ${googleIcon()}
          Entrar com Google
        </button>
      `
      document.getElementById('btn-login-header')?.addEventListener('click', () => signInWithGoogle())
    }

    // 2. Mobile Top Bar Right (Botão Entrar discreto)
    if (mobileRight) {
      mobileRight.innerHTML = `
        <button class="btn-mobile-login" id="btn-mobile-login" aria-label="Fazer Login">
          Entrar
        </button>
      `
      document.getElementById('btn-mobile-login')?.addEventListener('click', () => signInWithGoogle())
    }

    // 3. Mobile Drawer
    if (drawerAuth) {
      drawerAuth.innerHTML = `
        <div class="drawer-guest-card">
          <div class="drawer-guest-icon">👋</div>
          <div class="drawer-guest-content">
            <div class="drawer-guest-title">Modo Visitante</div>
            <p class="drawer-guest-text">Faça login com Google para salvar seus produtos na nuvem e colaborar com o Ranking Global.</p>
          </div>
        </div>
        <button class="btn-primary btn-drawer-login" id="btn-drawer-login">
          ${googleIcon()}
          Entrar com Google
        </button>
      `
      document.getElementById('btn-drawer-login')?.addEventListener('click', () => {
        closeDrawer()
        signInWithGoogle()
      })
    }
  }
}

async function handleSignOut() {
  try {
    closeDrawer()
    await signOut()
    showToast('Sessão encerrada.', 'info')
  } catch {
    showToast('Erro ao sair.', 'error')
  }
}

// ============================================================
// SEÇÃO: ADICIONAR PRODUTO
// ============================================================

function renderAddSection(user) {
  const card = document.getElementById('add-product-card')
  if (!card) return

  // Reset de estado do formulário ao recarregar
  state.photoFile = null
  state.location = null

  const authNotice = !user
    ? `<div style="background:var(--primary-light);border:1px solid rgba(255,107,74,0.3);padding:10px 14px;border-radius:10px;font-size:0.85rem;color:var(--primary-dark);margin-bottom:18px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
         <span>💡 <strong>Modo Visitante:</strong> seus produtos serão salvos no <em>Meu Ranking</em> deste navegador. Faça login com o Google para publicar no Ranking Global!</span>
         <button type="button" class="btn-primary" id="btn-quick-login" style="padding:4px 10px;font-size:0.75rem">Fazer Login</button>
       </div>`
    : ''

  card.innerHTML = `
    <div class="form-header-row">
      <h2 class="form-title">➕ Adicionar Produto</h2>
      <button type="button" class="btn-close-product-modal" id="btn-close-product-modal" aria-label="Fechar formulário">&times;</button>
    </div>
    ${authNotice}
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

        <!-- Moeda -->
        <div class="form-group">
          <label for="f-currency">Moeda *</label>
          <select id="f-currency" required>
            <option value="BRL" selected>🇧🇷 Real Brasileiro (R$)</option>
            <option value="USD">🇺🇸 Dólar Americano ($)</option>
            <option value="EUR">🇪🇺 Euro (€)</option>
          </select>
        </div>

        <!-- Preço -->
        <div class="form-group">
          <label for="f-price" id="lbl-price">Preço Total (R$) *</label>
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

        <!-- Foto & Câmera -->
        <div class="form-group full-width">
          <label>Foto do Produto / Tabela Nutricional <span style="color:var(--text-3);font-weight:400">(opcional)</span></label>
          <div class="photo-upload-wrapper" id="photo-upload-area">
            <input class="photo-input" type="file" id="f-photo" accept="image/*">
            <span class="photo-upload-label" id="photo-label">📸 Tirar foto com a câmera ou escolher da galeria</span>
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
            ${user ? '🚀 Adicionar ao Ranking Global' : '💾 Salvar no Meu Ranking'}
          </button>
        </div>

      </div>
    </form>
  `

  document.getElementById('btn-quick-login')?.addEventListener('click', () => signInWithGoogle())
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

  // Mudança da moeda no formulário
  document.getElementById('f-currency')?.addEventListener('change', (e) => {
    const sym = getCurrencySymbol(e.target.value)
    const lbl = document.getElementById('lbl-price')
    if (lbl) lbl.textContent = `Preço Total (${sym}) *`
    updateCalcPreview()
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

  // Fechar modal do formulário no mobile
  document.getElementById('btn-close-product-modal')?.addEventListener('click', closeProductModal)

  // Submit
  document.getElementById('product-form')?.addEventListener('submit', handleFormSubmit)
}

function updateCalcPreview() {
  const preco    = parseFloat(document.getElementById('f-price')?.value)
  const peso     = parseFloat(document.getElementById('f-weight')?.value)
  const porcao   = parseFloat(document.getElementById('f-portion')?.value)
  const proteina = parseFloat(document.getElementById('f-protein')?.value)
  const currency = document.getElementById('f-currency')?.value || 'BRL'

  const wrapper = document.getElementById('calc-preview-wrapper')
  const valueEl = document.getElementById('calc-preview-value')

  if (wrapper && valueEl && [preco, peso, porcao, proteina].every(v => v > 0)) {
    wrapper.style.display = 'block'
    const result = calcularPrecoPorGrama(preco, peso, porcao, proteina)
    valueEl.textContent = formatarPreco(result, currency)
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

  const name     = document.getElementById('f-name')?.value.trim()
  const brand    = document.getElementById('f-brand')?.value.trim()
  const type     = document.getElementById('f-type')?.value
  const currency = document.getElementById('f-currency')?.value || 'BRL'
  const preco    = parseFloat(document.getElementById('f-price')?.value)
  const peso     = parseFloat(document.getElementById('f-weight')?.value)
  const porcao   = parseFloat(document.getElementById('f-portion')?.value)
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

  const precoPorGrama = calcularPrecoPorGrama(preco, peso, porcao, proteina)

  // UI: loading state
  const btn = document.getElementById('btn-submit')
  if (btn) {
    btn.disabled = true
    btn.textContent = '⏳ Salvando...'
  }

  try {
    // 1. USUÁRIO NÃO LOGADO: Salva no LocalStorage (Meu Ranking)
    if (!state.user) {
      const res = saveLocalProduct({
        name,
        brand,
        food_type: type,
        currency,
        price: preco,
        weight_g: peso,
        portion_g: porcao,
        protein_g: proteina,
        price_per_g_protein: precoPorGrama,
        store_name: state.location?.placeName ?? null,
        city: state.location?.city ?? null,
        latitude: state.location?.lat ?? null,
        longitude: state.location?.lng ?? null,
      })

      if (res.duplicated) {
        showToast('Este produto já está cadastrado no seu ranking!', 'error')
        return
      }

      showToast('Salvo no seu ranking pessoal! 🎉', 'success')
      resetFormUI()
      switchTab('personal')
      await loadPersonalRanking()
      return
    }

    // 2. USUÁRIO LOGADO: Salva no Supabase (Ranking Global + Nuvem)
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
      currency,
      brand:     brand || null,
      price:     preco,
      weightG:   peso,
      portionG:  porcao,
      proteinG:  proteina,
      photoFile,
      storeName: state.location?.placeName ?? null,
      city:      state.location?.city ?? null,
      latitude:  state.location?.lat ?? null,
      longitude: state.location?.lng ?? null,
    })

    showToast('Produto adicionado ao ranking global! 🎉', 'success')
    resetFormUI()

    // Recarrega listas, mapa e atualiza cidades disponíveis
    await Promise.all([
      loadRanking(),
      loadMyProducts(),
      loadGlobalMap(),
      loadPersonalRanking(),
      refreshCityDropdown(),
      loadStats(state.currency),
    ])

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
      btn.textContent = state.user ? '🚀 Adicionar ao Ranking Global' : '💾 Salvar no Meu Ranking'
    }
  }
}

function resetFormUI() {
  document.getElementById('product-form')?.reset()
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

  closeProductModal()
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
    let products = await getRanking({
      foodType: state.filter,
      currency: state.currency,
      city: state.city,
    })

    // Se o filtro de proximidade estiver ativo, calcula a distância e filtra pelo raio
    if (state.proximityActive && state.userCoords) {
      products = products
        .map(p => {
          const dist = (p.latitude != null && p.longitude != null)
            ? calculateDistanceKm(state.userCoords.lat, state.userCoords.lng, p.latitude, p.longitude)
            : null
          return { ...p, distance_km: dist }
        })
        .filter(p => p.distance_km != null && p.distance_km <= state.radiusKm)
    }

    renderRankingList(container, products)
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
    renderMyProductsList(container, products, async (productId, photoUrl) => {
      await deleteProduct(productId, photoUrl)
      showToast('Produto removido.', 'info')
      await Promise.all([loadMyProducts(), loadRanking()])
    })
  } catch (err) {
    console.error('[MyProducts]', err)
    container.innerHTML = `<div class="empty-state"><div class="empty-state-title">Erro ao carregar sua lista.</div></div>`
  }
}

// ============================================================
// STATS (hero)
// ============================================================

async function loadStats(currency = state.currency) {
  try {
    const stats = await getStats(currency)
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
      const sym = getCurrencySymbol(stats.cheapestCurrency || currency || 'BRL')
      parts.push(`
        <div class="stat-item">
          <div class="stat-value">${sym} ${Number(stats.cheapestPricePerG).toFixed(4)}</div>
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
// MAPA GLOBAL (Últimos 100 pins)
// ============================================================

async function loadGlobalMap() {
  try {
    const pins = await getLatestPins(100)
    await initGlobalMap('global-map-container', pins)
  } catch (err) {
    console.warn('[GlobalMap] Erro ao carregar pins:', err)
  }
}

// ============================================================
// ABAS DE RANKING & MEU RANKING
// ============================================================

function setupTabs() {
  document.getElementById('tab-global')?.addEventListener('click', () => switchTab('global'))
  document.getElementById('tab-personal')?.addEventListener('click', () => switchTab('personal'))
}

function switchTab(tabName) {
  state.activeTab = tabName

  const tabGlobal = document.getElementById('tab-global')
  const tabPersonal = document.getElementById('tab-personal')
  const globalView = document.getElementById('ranking-container')
  const personalView = document.getElementById('my-ranking-container')

  if (tabName === 'global') {
    tabGlobal?.classList.add('active')
    tabPersonal?.classList.remove('active')
    globalView?.classList.remove('hidden')
    personalView?.classList.add('hidden')
    loadRanking()
  } else {
    tabGlobal?.classList.remove('active')
    tabPersonal?.classList.add('active')
    globalView?.classList.add('hidden')
    personalView?.classList.remove('hidden')
    loadPersonalRanking()
  }
}

async function loadPersonalRanking() {
  const container = document.getElementById('my-ranking-container')
  if (!container) return

  // 1. Obtém os produtos locais do LocalStorage
  const localProducts = getLocalProducts()

  // Atualiza badge de contagem (desktop tabs e drawer mobile)
  const badge = document.getElementById('local-count-badge')
  const drawerBadge = document.getElementById('drawer-badge-personal')
  if (localProducts.length > 0) {
    if (badge) {
      badge.textContent = localProducts.length
      badge.classList.remove('hidden')
    }
    if (drawerBadge) {
      drawerBadge.textContent = localProducts.length
      drawerBadge.classList.remove('hidden')
    }
  } else {
    badge?.classList.add('hidden')
    drawerBadge?.classList.add('hidden')
  }

  // Se o usuário estiver logado, mescla com os produtos salvos na conta dele
  let allPersonal = [...localProducts]

  if (state.user) {
    try {
      const remoteProducts = await getMyProducts(state.user.id)
      // Evita duplicar se já foi sincronizado
      remoteProducts.forEach(remote => {
        const alreadyIn = allPersonal.some(p =>
          p.name.trim().toLowerCase() === remote.name.trim().toLowerCase() &&
          Math.abs(Number(p.price) - Number(remote.price)) < 0.01
        )
        if (!alreadyIn) {
          allPersonal.push({ ...remote, is_local: false })
        }
      })
    } catch (err) {
      console.warn('[PersonalRanking] Erro ao carregar remotos:', err)
    }
  }

  // Ordena pelo menor preço por grama
  allPersonal.sort((a, b) => Number(a.price_per_g_protein) - Number(b.price_per_g_protein))

  // Filtra por tipo (all, animal, vegetal)
  if (state.filter && state.filter !== 'all') {
    allPersonal = allPersonal.filter(p => p.food_type === state.filter)
  }

  // Filtra por moeda
  if (state.currency && state.currency !== 'all') {
    allPersonal = allPersonal.filter(p => (p.currency || 'BRL').toUpperCase() === state.currency.toUpperCase())
  }

  // Filtra por cidade
  if (state.city && state.city !== 'all') {
    allPersonal = allPersonal.filter(p => p.city && p.city.toLowerCase().includes(state.city.toLowerCase()))
  }

  // Filtra por proximidade (se GPS ativo)
  if (state.proximityActive && state.userCoords) {
    allPersonal = allPersonal
      .map(p => {
        const dist = (p.latitude != null && p.longitude != null)
          ? calculateDistanceKm(state.userCoords.lat, state.userCoords.lng, p.latitude, p.longitude)
          : null
        return { ...p, distance_km: dist }
      })
      .filter(p => p.distance_km != null && p.distance_km <= state.radiusKm)
  }

  renderPersonalRankingList(container, allPersonal, async (productId, photoUrl) => {
    if (productId.startsWith('local_')) {
      deleteLocalProduct(productId)
      showToast('Item local removido.', 'info')
    } else {
      await deleteProduct(productId, photoUrl)
      showToast('Produto removido da nuvem.', 'info')
      await loadMyProducts()
    }
    await Promise.all([loadPersonalRanking(), loadRanking()])
    checkSyncBanner()
  })
}

// ============================================================
// SINCRONIZAÇÃO LOCALSTORAGE -> SUPABASE
// ============================================================

function checkSyncBanner() {
  const bannerContainer = document.getElementById('sync-banner-container')
  if (!bannerContainer) return

  const localItems = getLocalProducts()

  // Só exibe o banner se o usuário estiver logado e houver itens locais a sincronizar
  if (state.user && localItems.length > 0) {
    bannerContainer.innerHTML = `
      <div class="sync-banner">
        <div class="sync-banner-text">
          🔄 Você tem <strong>${localItems.length} produto(s)</strong> no seu dispositivo. Deseja sincronizá-los com sua conta na nuvem?
        </div>
        <div class="sync-banner-actions">
          <button class="btn-primary" id="btn-sync-now" style="padding:6px 14px;font-size:0.82rem">Sincronizar Agora</button>
          <button class="btn-ghost" id="btn-sync-dismiss" style="padding:6px 12px;font-size:0.82rem">Descartar Locais</button>
        </div>
      </div>
    `

    document.getElementById('btn-sync-now')?.addEventListener('click', () => syncLocalToSupabase())
    document.getElementById('btn-sync-dismiss')?.addEventListener('click', () => {
      clearLocalProducts()
      bannerContainer.innerHTML = ''
      loadPersonalRanking()
      showToast('Produtos locais descartados.', 'info')
    })
  } else {
    bannerContainer.innerHTML = ''
  }
}

async function syncLocalToSupabase() {
  const localItems = getLocalProducts()
  if (!localItems.length || !state.user) return

  const syncBtn = document.getElementById('btn-sync-now')
  if (syncBtn) {
    syncBtn.disabled = true
    syncBtn.textContent = 'Sincronizando...'
  }

  try {
    let syncedCount = 0

    // Pega produtos remotos existentes para aplicar regra anti-duplicidade na nuvem
    const remoteProducts = await getMyProducts(state.user.id)

    for (const item of localItems) {
      const isAlreadySaved = remoteProducts.some(r =>
        r.name.trim().toLowerCase() === item.name.trim().toLowerCase() &&
        Math.abs(Number(r.price) - Number(item.price)) < 0.01 &&
        Math.abs(Number(r.weight_g) - Number(item.weight_g)) < 0.01
      )

      if (!isAlreadySaved) {
        await saveProduct({
          userId:    state.user.id,
          name:      item.name,
          foodType:  item.food_type,
          currency:  item.currency || 'BRL',
          brand:     item.brand,
          price:     item.price,
          weightG:   item.weight_g,
          portionG:  item.portion_g,
          proteinG:  item.protein_g,
          storeName: item.store_name,
          city:      item.city,
          latitude:  item.latitude,
          longitude: item.longitude,
        })
        syncedCount++
      }
    }

    clearLocalProducts()
    showToast(`${syncedCount} produto(s) sincronizado(s) com sucesso! 🎉`, 'success')

    document.getElementById('sync-banner-container').innerHTML = ''
    await Promise.all([loadRanking(), loadMyProducts(), loadPersonalRanking(), loadGlobalMap()])

  } catch (err) {
    console.error('[Sync]', err)
    showToast('Erro ao sincronizar produtos. Tente novamente.', 'error')
    if (syncBtn) {
      syncBtn.disabled = false
      syncBtn.textContent = 'Sincronizar Agora'
    }
  }
}

// ============================================================
// POPUP MODAL DO FORMULÁRIO DE PRODUTO (Mobile)
// ============================================================

export function openProductModal() {
  const addSection = document.getElementById('section-add')
  if (!addSection) return
  addSection.classList.add('mobile-modal-open')
  document.body.classList.add('modal-open-lock')
  setTimeout(() => {
    document.getElementById('f-name')?.focus()
  }, 150)
}

export function closeProductModal() {
  const addSection = document.getElementById('section-add')
  if (!addSection) return
  addSection.classList.remove('mobile-modal-open')
  document.body.classList.remove('modal-open-lock')
}

// ============================================================
// DRAWER LATERAL MÓVEL (Menu Hambúrguer 3 tracinhos)
// ============================================================

export function openDrawer() {
  const drawer = document.getElementById('mobile-drawer')
  const overlay = document.getElementById('drawer-overlay')
  const btn = document.getElementById('btn-hamburger')
  if (!drawer || !overlay) return

  drawer.classList.add('open')
  drawer.setAttribute('aria-hidden', 'false')
  overlay.classList.remove('hidden')
  overlay.setAttribute('aria-hidden', 'false')
  btn?.setAttribute('aria-expanded', 'true')
  document.body.classList.add('drawer-open-lock')
}

export function closeDrawer() {
  const drawer = document.getElementById('mobile-drawer')
  const overlay = document.getElementById('drawer-overlay')
  const btn = document.getElementById('btn-hamburger')
  if (!drawer || !overlay) return

  drawer.classList.remove('open')
  drawer.setAttribute('aria-hidden', 'true')
  overlay.classList.add('hidden')
  overlay.setAttribute('aria-hidden', 'true')
  btn?.setAttribute('aria-expanded', 'false')
  document.body.classList.remove('drawer-open-lock')
}

// ============================================================
// BOTÃO FLUTUANTE MÓVEL (+)
// ============================================================

function setupMobileFab() {
  const fab = document.getElementById('mobile-fab')
  if (!fab) return

  fab.addEventListener('click', () => {
    openProductModal()
  })
}

// ============================================================
// FILTROS DO RANKING
// ============================================================

function setupFilters() {
  // Filtros de Tipo (Todos, Animal, Vegetal)
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'))
      btn.classList.add('active')
      state.filter = btn.getAttribute('data-filter')
      await reloadActiveRanking()
    })
  })

  // Filtro de Moeda (BRL, USD, EUR, all)
  const currencySelect = document.getElementById('filter-currency')
  currencySelect?.addEventListener('change', async (e) => {
    state.currency = e.target.value
    await Promise.all([reloadActiveRanking(), loadStats(state.currency)])
  })

  // Filtro de Cidade — autocomplete via Mapbox Geocoding API
  setupCityAutocomplete()

  // Filtro de Proximidade (Perto de mim)
  const btnProximity = document.getElementById('btn-proximity')
  const radiusSelect = document.getElementById('filter-radius')
  const clearProximityBtn = document.getElementById('btn-clear-proximity')

  btnProximity?.addEventListener('click', () => {
    if (state.proximityActive) {
      return
    }

    if (!navigator.geolocation) {
      showToast('Geolocalização não é suportada pelo seu navegador.', 'error')
      return
    }

    btnProximity.classList.add('loading')
    const textSpan = btnProximity.querySelector('.proximity-text')
    if (textSpan) textSpan.textContent = 'Obtendo GPS...'

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        state.userCoords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }
        state.proximityActive = true

        btnProximity.classList.remove('loading')
        btnProximity.classList.add('active')
        if (textSpan) textSpan.textContent = 'Perto de mim'
        radiusSelect?.classList.remove('hidden')
        clearProximityBtn?.classList.remove('hidden')

        showToast(`📍 GPS ativo! Exibindo produtos até ${state.radiusKm} km.`, 'success')
        await reloadActiveRanking()
      },
      (err) => {
        btnProximity.classList.remove('loading')
        if (textSpan) textSpan.textContent = 'Perto de mim'
        console.warn('[Geolocation]', err)
        showToast('Não foi possível obter sua localização. Permita o acesso ao GPS.', 'error')
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    )
  })

  // Mudança do Raio KM
  radiusSelect?.addEventListener('change', async (e) => {
    state.radiusKm = Number(e.target.value) || 25
    if (state.proximityActive) {
      showToast(`Raio atualizado para ${state.radiusKm} km.`, 'info')
      await reloadActiveRanking()
    }
  })

  // Desativar Proximidade
  clearProximityBtn?.addEventListener('click', async () => {
    state.proximityActive = false
    state.userCoords = null
    btnProximity?.classList.remove('active')
    radiusSelect?.classList.add('hidden')
    clearProximityBtn?.classList.add('hidden')
    showToast('Filtro por proximidade desativado.', 'info')
    await reloadActiveRanking()
  })

  // Inicializa lista de cidades no dropdown
  refreshCityDropdown()
}

async function reloadActiveRanking() {
  if (state.activeTab === 'global') {
    await loadRanking()
  } else {
    await loadPersonalRanking()
  }
}

// ============================================================
// AUTOCOMPLETE DE CIDADE (Mapbox Geocoding API)
// ============================================================

function setupCityAutocomplete() {
  const input = document.getElementById('filter-city')
  const suggestionsList = document.getElementById('city-suggestions')
  const clearBtn = document.getElementById('btn-clear-city')
  if (!input || !suggestionsList) return

  const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN
  let debounceTimer = null

  // Fecha sugestões ao clicar fora
  document.addEventListener('click', (e) => {
    if (!input.contains(e.target) && !suggestionsList.contains(e.target)) {
      hideSuggestions()
    }
  })

  // Limpar filtro de cidade
  clearBtn?.addEventListener('click', () => {
    input.value = ''
    state.city = 'all'
    clearBtn.classList.add('hidden')
    hideSuggestions()
    reloadActiveRanking()
  })

  input.addEventListener('input', () => {
    const query = input.value.trim()

    // Mostra/oculta o botão de limpar
    if (query.length > 0) {
      clearBtn?.classList.remove('hidden')
    } else {
      clearBtn?.classList.add('hidden')
      state.city = 'all'
      reloadActiveRanking()
      hideSuggestions()
      return
    }

    // Debounce de 350ms para não spam a API
    clearTimeout(debounceTimer)
    debounceTimer = setTimeout(async () => {
      if (query.length < 2) return
      try {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json` +
          `?types=place,locality,district&language=pt&limit=5&access_token=${MAPBOX_TOKEN}`
        const res = await fetch(url)
        if (!res.ok) throw new Error('Geocoding API error')
        const data = await res.json()
        renderSuggestions(data.features || [])
      } catch (err) {
        console.warn('City geocoding failed:', err)
        hideSuggestions()
      }
    }, 350)
  })

  input.addEventListener('keydown', (e) => {
    const items = suggestionsList.querySelectorAll('.city-suggestion-item')
    const active = suggestionsList.querySelector('.city-suggestion-item.active')
    let idx = Array.from(items).indexOf(active)

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      idx = (idx + 1) % items.length
      items.forEach(i => i.classList.remove('active'))
      items[idx]?.classList.add('active')
      items[idx]?.scrollIntoView({ block: 'nearest' })
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      idx = (idx - 1 + items.length) % items.length
      items.forEach(i => i.classList.remove('active'))
      items[idx]?.classList.add('active')
      items[idx]?.scrollIntoView({ block: 'nearest' })
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (active) active.click()
    } else if (e.key === 'Escape') {
      hideSuggestions()
    }
  })

  function renderSuggestions(features) {
    if (!features.length) {
      hideSuggestions()
      return
    }
    suggestionsList.innerHTML = ''
    features.forEach(feature => {
      const li = document.createElement('li')
      li.className = 'city-suggestion-item'
      li.setAttribute('role', 'option')
      li.textContent = feature.place_name
      li.dataset.placeName = feature.place_name
      li.addEventListener('click', () => {
        // Extrai o nome principal da cidade (antes da vírgula)
        const cityName = feature.text || feature.place_name.split(',')[0].trim()
        input.value = feature.place_name
        state.city = cityName
        hideSuggestions()
        clearBtn?.classList.remove('hidden')
        reloadActiveRanking()
      })
      suggestionsList.appendChild(li)
    })
    suggestionsList.classList.remove('hidden')
  }

  function hideSuggestions() {
    suggestionsList.classList.add('hidden')
    suggestionsList.innerHTML = ''
  }
}

// ============================================================
// EVENTOS GLOBAIS
// ============================================================

function setupGlobalEvents() {
  // Scroll para ranking no desktop header
  document.getElementById('btn-scroll-ranking')?.addEventListener('click', () => {
    document.getElementById('section-ranking')?.scrollIntoView({ behavior: 'smooth' })
  })

  // Menu Hambúrguer (3 tracinhos no lado esquerdo)
  document.getElementById('btn-hamburger')?.addEventListener('click', () => {
    openDrawer()
  })

  // Fechar Drawer
  document.getElementById('btn-close-drawer')?.addEventListener('click', () => {
    closeDrawer()
  })
  document.getElementById('drawer-overlay')?.addEventListener('click', () => {
    closeDrawer()
  })

  // Navegação dentro do Drawer Lateral
  document.getElementById('drawer-nav-ranking')?.addEventListener('click', () => {
    closeDrawer()
    switchTab('global')
    document.getElementById('section-ranking')?.scrollIntoView({ behavior: 'smooth' })
  })
  document.getElementById('drawer-nav-personal')?.addEventListener('click', () => {
    closeDrawer()
    switchTab('personal')
    document.getElementById('section-ranking')?.scrollIntoView({ behavior: 'smooth' })
  })
  document.getElementById('drawer-nav-map')?.addEventListener('click', () => {
    closeDrawer()
    document.getElementById('section-global-map')?.scrollIntoView({ behavior: 'smooth' })
  })
  document.getElementById('drawer-nav-add')?.addEventListener('click', () => {
    closeDrawer()
    openProductModal()
  })

  // Clicar fora do card de produto no modal mobile fecha ele
  const addSection = document.getElementById('section-add')
  addSection?.addEventListener('click', (e) => {
    if (e.target === addSection || e.target.classList.contains('modal-container-mobile')) {
      closeProductModal()
    }
  })

  // Fechar modal do mapa
  document.getElementById('btn-close-modal')?.addEventListener('click', () => closeMapModal())

  // Clicar fora do modal do mapa fecha ele
  document.getElementById('map-modal-overlay')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeMapModal()
  })

  // ESC fecha qualquer modal aberto ou drawer
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeMapModal()
      closeProductModal()
      closeDrawer()
    }
  })
}

// ============================================================
// START
// ============================================================
init()
