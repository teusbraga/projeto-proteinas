/**
 * i18n.js — Internacionalização da aplicação ProteinPrice (Português & English)
 * Gerencia traduções, persistência no LocalStorage e atualização dinâmica da UI.
 */

const LANG_KEY = 'proteinprice_lang'
const listeners = new Set()

export const translations = {
  pt: {
    // Header & Brand
    brandName: 'ProteinPrice',
    brandDesc: 'A proteína mais barata da sua cidade',
    navRanking: '🏆 Ranking',
    loginHeader: 'Entrar com Google',
    loginMobile: 'Entrar',
    signOut: 'Sair',
    themeToggleTitleLight: 'Mudar para Modo Claro',
    themeToggleTitleDark: 'Mudar para Modo Escuro',
    themeTextLight: 'Modo Claro',
    themeTextDark: 'Modo Escuro',
    langToggleTitle: 'Switch to English',
    langCode: 'EN',
    langName: 'English',

    // Mobile Drawer
    drawerTitle: 'ProteinPrice',
    drawerRanking: 'Ranking Global',
    drawerPersonal: 'Meu Ranking Pessoal',
    drawerMap: 'Mapa Comunitário',
    drawerAdd: 'Adicionar Alimento',
    drawerGuestTitle: 'Modo Visitante',
    drawerGuestText: 'Faça login com Google para salvar seus produtos na nuvem e colaborar com o Ranking Global.',
    drawerSignOut: '🚪 Sair da Conta',
    drawerConnected: '🟢 Conectado',

    // Hero
    heroBadge: '🔬 Calculadora de Custo-Benefício',
    heroTitlePre: 'Quanto custa cada grama de',
    heroTitleHighlight: 'proteína',
    heroTitlePost: '?',
    heroSubtitle: 'Calcule, compare e compartilhe o custo-benefício de qualquer alimento. Juntos, encontramos o melhor preço da cidade.',
    heroStatCheapest: 'Mais barata encontrada:',
    heroStatTotal: 'alimentos cadastrados',
    heroStatNone: 'Nenhum alimento cadastrado ainda.',

    // Formulário Adicionar
    formTitle: '➕ Adicionar Alimento',
    formNoticeGuest: '💡 <strong>Modo Visitante:</strong> seus produtos serão salvos no <em>Meu Ranking</em> deste navegador. Faça login com o Google para publicar no Ranking Global!',
    formQuickLogin: 'Fazer Login',
    fNameLabel: 'Nome do Produto *',
    fNamePlaceholder: 'Ex: Peito de Frango',
    fBrandLabel: 'Marca',
    fBrandPlaceholder: 'Ex: Sadia',
    fTypeLabel: 'Tipo de Proteína *',
    fTypeSelect: 'Selecione...',
    fTypeAnimal: '🥩 Proteína Animal',
    fTypeVegetal: '🌱 Proteína Vegetal',
    fCurrencyLabel: 'Moeda *',
    fCurrencyBRL: '🇧🇷 Real Brasileiro (R$)',
    fCurrencyUSD: '🇺🇸 Dólar Americano ($)',
    fCurrencyEUR: '🇪🇺 Euro (€)',
    fPriceLabel: 'Preço Total ({symbol}) *',
    fPricePlaceholder: 'Ex: 19.90',
    fWeightLabel: 'Peso Total da Embalagem (g) *',
    fWeightPlaceholder: 'Ex: 500',
    fPortionLabel: 'Peso da Porção (g) *',
    fPortionPlaceholder: 'Ex: 100',
    fProteinLabel: 'Proteína na Porção (g) *',
    fProteinPlaceholder: 'Ex: 31',
    calcPreviewLabel: '💡 Preço por grama de proteína',
    photoFieldLabel: 'Foto do Produto / Tabela Nutricional',
    photoFieldOptional: '(opcional)',
    photoUploadLabel: '📸 Tirar foto com a câmera ou escolher da galeria',
    locationFieldLabel: 'Local de Compra',
    locationFieldOptional: '(opcional)',
    locationBtnDefault: 'Selecionar local no mapa',
    btnSubmitGlobal: '🚀 Adicionar ao Ranking Global',
    btnSubmitLocal: '💾 Salvar no Meu Ranking',
    btnSubmitting: 'Salvando...',

    // Mapa Global
    globalMapTitle: '🗺️ Mapa Comunitário de Proteínas',
    globalMapSubtitle: 'Últimos pontos de compra cadastrados pela comunidade',

    // Ranking & Filtros
    tabGlobal: '🌍 Ranking Global',
    tabPersonal: '👤 Meu Ranking',
    filterAll: 'Todos',
    filterAnimal: '🥩 Animal',
    filterVegetal: '🌱 Vegetal',
    filterCurrencyLabel: '💰 Moeda:',
    filterCurrencyAll: 'Todas as Moedas',
    filterCityLabel: '🏙️ Cidade:',
    filterCityPlaceholder: 'Ex: São Paulo, SP',
    btnProximity: 'Perto de mim',
    radius5: 'Raio: 5 km',
    radius10: 'Raio: 10 km',
    radius25: 'Raio: 25 km',
    radius50: 'Raio: 50 km',
    radius100: 'Raio: 100 km',
    btnSearch: 'Buscar',

    // Lista de Produtos e Cards
    perGramUnit: 'por g de proteína',
    badgeAnimal: '🥩 Animal',
    badgeVegetal: '🌱 Vegetal',
    badgeLocal: 'Salvo neste navegador',
    emptyRankingTitle: 'Nenhum produto encontrado.',
    emptyRankingSub: 'Tente alterar os filtros de cidade, distância ou moeda.',
    emptyPersonalTitle: 'Seu ranking pessoal ainda está vazio.',
    emptyPersonalSub: 'Cadastre seus alimentos no formulário para comparar seu custo-benefício pessoal!',
    emptyMyProductsTitle: 'Você ainda não cadastrou nenhum produto.',
    btnDelete: 'Excluir',
    confirmDelete: 'Tem certeza que deseja remover este alimento?',

    // Banner de Sincronização
    syncBannerTitle: 'Produtos locais encontrados!',
    syncBannerDesc: 'Você possui {count} produto(s) salvos no navegador. Deseja sincronizá-los com sua conta na nuvem?',
    btnSyncNow: 'Sincronizar Agora',
    btnSyncDismiss: 'Dispensar',

    // Modal de Mapa
    modalMapTitle: '📍 Onde você viu esse produto?',
    btnConfirmLocation: 'Confirmar Local',

    // Validações e Toasts
    valRequiredNumbers: 'Todos os campos numéricos devem ser maiores que zero.',
    valProteinGreater: 'A proteína por porção não pode ser maior que o peso da porção.',
    valPriceHigh: 'Preço parece muito alto. Verifique o valor.',
    valWeightHigh: 'Peso total parece muito alto. Verifique o valor em gramas.',
    toastProductSavedGlobal: 'Produto adicionado ao Ranking Global com sucesso!',
    toastProductSavedLocal: 'Produto adicionado ao seu ranking pessoal!',
    toastDuplicateLocal: 'Este produto já está cadastrado no seu ranking pessoal.',
    toastSignOutSuccess: 'Sessão encerrada.',
    toastSignOutError: 'Erro ao sair.',
    toastSyncSuccess: 'Produtos sincronizados com sucesso!',
    toastSyncError: 'Erro ao sincronizar produtos com a nuvem.',
    toastDeleteSuccess: 'Produto removido com sucesso.',
    toastDeleteError: 'Erro ao remover produto.',
    toastGpsDenied: 'Não foi possível obter sua localização GPS.',

    // Footer
    footerText: '💪 ProteinPrice — feito pela comunidade, para a comunidade',
  },

  en: {
    // Header & Brand
    brandName: 'ProteinPrice',
    brandDesc: 'The most cost-effective protein in your city',
    navRanking: '🏆 Leaderboard',
    loginHeader: 'Sign in with Google',
    loginMobile: 'Sign In',
    signOut: 'Sign Out',
    themeToggleTitleLight: 'Switch to Light Mode',
    themeToggleTitleDark: 'Switch to Dark Mode',
    themeTextLight: 'Light Mode',
    themeTextDark: 'Dark Mode',
    langToggleTitle: 'Mudar para Português',
    langCode: 'PT',
    langName: 'Português',

    // Mobile Drawer
    drawerTitle: 'ProteinPrice',
    drawerRanking: 'Global Leaderboard',
    drawerPersonal: 'My Personal Ranking',
    drawerMap: 'Community Map',
    drawerAdd: 'Add Food Item',
    drawerGuestTitle: 'Guest Mode',
    drawerGuestText: 'Sign in with Google to save products to the cloud and contribute to the Global Leaderboard.',
    drawerSignOut: '🚪 Sign Out',
    drawerConnected: '🟢 Connected',

    // Hero
    heroBadge: '🔬 Cost-Benefit Calculator',
    heroTitlePre: 'How much does each gram of',
    heroTitleHighlight: 'protein',
    heroTitlePost: ' cost?',
    heroSubtitle: 'Calculate, compare, and share the nutritional cost-benefit of any food. Together, we find the best price in town.',
    heroStatCheapest: 'Cheapest found:',
    heroStatTotal: 'foods submitted',
    heroStatNone: 'No food items submitted yet.',

    // Formulário Adicionar
    formTitle: '➕ Add Food Item',
    formNoticeGuest: '💡 <strong>Guest Mode:</strong> your foods will be saved to <em>My Ranking</em> on this browser. Sign in with Google to publish to the Global Leaderboard!',
    formQuickLogin: 'Sign In',
    fNameLabel: 'Product Name *',
    fNamePlaceholder: 'e.g. Chicken Breast',
    fBrandLabel: 'Brand',
    fBrandPlaceholder: 'e.g. Kirkland',
    fTypeLabel: 'Protein Source *',
    fTypeSelect: 'Select...',
    fTypeAnimal: '🥩 Animal Protein',
    fTypeVegetal: '🌱 Plant Protein',
    fCurrencyLabel: 'Currency *',
    fCurrencyBRL: '🇧🇷 Brazilian Real (R$)',
    fCurrencyUSD: '🇺🇸 US Dollar ($)',
    fCurrencyEUR: '🇪🇺 Euro (€)',
    fPriceLabel: 'Total Price ({symbol}) *',
    fPricePlaceholder: 'e.g. 19.90',
    fWeightLabel: 'Total Package Weight (g) *',
    fWeightPlaceholder: 'e.g. 500',
    fPortionLabel: 'Serving Size (g) *',
    fPortionPlaceholder: 'e.g. 100',
    fProteinLabel: 'Protein per Serving (g) *',
    fProteinPlaceholder: 'e.g. 31',
    calcPreviewLabel: '💡 Cost per gram of protein',
    photoFieldLabel: 'Product / Nutrition Label Photo',
    photoFieldOptional: '(optional)',
    photoUploadLabel: '📸 Take a photo with camera or choose from gallery',
    locationFieldLabel: 'Purchase Location',
    locationFieldOptional: '(optional)',
    locationBtnDefault: 'Pin location on map',
    btnSubmitGlobal: '🚀 Add to Global Leaderboard',
    btnSubmitLocal: '💾 Save to My Ranking',
    btnSubmitting: 'Saving...',

    // Mapa Global
    globalMapTitle: '🗺️ Community Protein Map',
    globalMapSubtitle: 'Recent store purchase locations shared by the community',

    // Ranking & Filtros
    tabGlobal: '🌍 Global Leaderboard',
    tabPersonal: '👤 My Ranking',
    filterAll: 'All',
    filterAnimal: '🥩 Animal',
    filterVegetal: '🌱 Plant',
    filterCurrencyLabel: '💰 Currency:',
    filterCurrencyAll: 'All Currencies',
    filterCityLabel: '🏙️ City:',
    filterCityPlaceholder: 'e.g. New York, NY',
    btnProximity: 'Near me',
    radius5: 'Radius: 5 km',
    radius10: 'Radius: 10 km',
    radius25: 'Radius: 25 km',
    radius50: 'Radius: 50 km',
    radius100: 'Radius: 100 km',
    btnSearch: 'Search',

    // Lista de Produtos e Cards
    perGramUnit: 'per g of protein',
    badgeAnimal: '🥩 Animal',
    badgeVegetal: '🌱 Plant',
    badgeLocal: 'Saved on this browser',
    emptyRankingTitle: 'No food items found.',
    emptyRankingSub: 'Try adjusting your city, proximity, or currency filters.',
    emptyPersonalTitle: 'Your personal ranking is currently empty.',
    emptyPersonalSub: 'Add food items through the form to compare your personal cost-benefit!',
    emptyMyProductsTitle: 'You have not submitted any food items yet.',
    btnDelete: 'Delete',
    confirmDelete: 'Are you sure you want to remove this food item?',

    // Banner de Sincronização
    syncBannerTitle: 'Local browser items found!',
    syncBannerDesc: 'You have {count} item(s) saved in this browser. Would you like to sync them with your cloud account?',
    btnSyncNow: 'Sync Now',
    btnSyncDismiss: 'Dismiss',

    // Modal de Mapa
    modalMapTitle: '📍 Where did you find this product?',
    btnConfirmLocation: 'Confirm Location',

    // Validações e Toasts
    valRequiredNumbers: 'All numeric fields must be greater than zero.',
    valProteinGreater: 'Protein per serving cannot exceed serving size.',
    valPriceHigh: 'Price seems too high. Please verify the value.',
    valWeightHigh: 'Total weight seems too high. Verify value in grams.',
    toastProductSavedGlobal: 'Product added to the Global Leaderboard successfully!',
    toastProductSavedLocal: 'Product added to your personal ranking!',
    toastDuplicateLocal: 'This product is already in your personal ranking.',
    toastSignOutSuccess: 'Session signed out.',
    toastSignOutError: 'Error signing out.',
    toastSyncSuccess: 'Products synced successfully!',
    toastSyncError: 'Error syncing products to cloud.',
    toastDeleteSuccess: 'Product deleted successfully.',
    toastDeleteError: 'Error deleting product.',
    toastGpsDenied: 'Could not access your GPS location.',

    // Footer
    footerText: '💪 ProteinPrice — built by the community, for the community',
  }
}

/**
 * Obtém o idioma atual ('pt' ou 'en')
 * @returns {'pt' | 'en'}
 */
export function getLanguage() {
  const saved = localStorage.getItem(LANG_KEY)
  if (saved === 'en' || saved === 'pt') return saved

  // Fallback baseado no navegador do usuário
  const browserLang = navigator.language?.toLowerCase() || ''
  if (browserLang.startsWith('en')) return 'en'
  return 'pt'
}

/**
 * Traduz uma chave com interpolação de parâmetros opcionais
 * @param {string} key
 * @param {Record<string, string|number>} [params]
 * @returns {string}
 */
export function t(key, params = {}) {
  const lang = getLanguage()
  let text = translations[lang]?.[key] || translations['pt']?.[key] || key

  for (const [k, v] of Object.entries(params)) {
    text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v))
  }
  return text
}

/**
 * Aplica um novo idioma e atualiza todos os elementos estáticos e listeners
 * @param {'pt' | 'en'} lang
 */
export function setLanguage(lang) {
  const finalLang = lang === 'en' ? 'en' : 'pt'
  localStorage.setItem(LANG_KEY, finalLang)
  document.documentElement.lang = finalLang === 'en' ? 'en' : 'pt-BR'

  updateLanguageControls(finalLang)
  applyTranslations()

  listeners.forEach(cb => {
    try { cb(finalLang) } catch (err) { console.error('[i18n] Erro no listener:', err) }
  })
}

/**
 * Alterna entre Português e Inglês
 * @returns {'pt' | 'en'}
 */
export function toggleLanguage() {
  const current = getLanguage()
  const next = current === 'en' ? 'pt' : 'en'
  setLanguage(next)
  return next
}

/**
 * Registra um callback para mudanças de idioma
 * @param {(lang: 'pt' | 'en') => void} callback
 * @returns {() => void}
 */
export function onLanguageChange(callback) {
  listeners.add(callback)
  return () => listeners.delete(callback)
}

/**
 * Atualiza os botões de idioma no Header e no Drawer
 * @param {'pt' | 'en'} lang
 */
function updateLanguageControls(lang) {
  const isEn = lang === 'en'

  // Header Desktop
  const headerBtn = document.getElementById('btn-lang-toggle')
  if (headerBtn) {
    headerBtn.setAttribute('title', isEn ? 'Mudar para Português' : 'Switch to English')
    headerBtn.setAttribute('aria-label', isEn ? 'Mudar para Português' : 'Switch to English')
    const flag = headerBtn.querySelector('.lang-flag')
    const code = headerBtn.querySelector('.lang-code')
    if (flag) flag.textContent = isEn ? '🇧🇷' : '🇺🇸'
    if (code) code.textContent = isEn ? 'PT' : 'EN'
  }

  // Drawer Mobile
  const drawerLangIcon = document.getElementById('drawer-lang-icon')
  const drawerLangText = document.getElementById('drawer-lang-text')
  if (drawerLangIcon) drawerLangIcon.textContent = isEn ? '🇧🇷' : '🇺🇸'
  if (drawerLangText) drawerLangText.textContent = isEn ? 'Português' : 'English'
}

/**
 * Aplica as traduções em todos os elementos do DOM marcados com atributos data-i18n
 */
export function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n')
    if (key) {
      el.innerHTML = t(key)
    }
  })

  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder')
    if (key) {
      el.placeholder = t(key)
    }
  })

  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.getAttribute('data-i18n-title')
    if (key) {
      el.title = t(key)
    }
  })

  document.querySelectorAll('[data-i18n-aria]').forEach(el => {
    const key = el.getAttribute('data-i18n-aria')
    if (key) {
      el.setAttribute('aria-label', t(key))
    }
  })
}

/**
 * Inicializa o módulo i18n
 */
export function initI18n() {
  const current = getLanguage()
  setLanguage(current)
}
