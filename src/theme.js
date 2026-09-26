/**
 * theme.js — Gerenciador de Tema (Light Mode / Dark Mode)
 * Suporta persistência em LocalStorage e sincronização com estilos do Mapbox.
 */

const THEME_KEY = 'proteinprice_theme'
const listeners = new Set()

/**
 * Obtém o tema atual ('light' ou 'dark')
 * @returns {'light' | 'dark'}
 */
export function getTheme() {
  const saved = localStorage.getItem(THEME_KEY)
  if (saved === 'dark' || saved === 'light') {
    return saved
  }
  // Se não houver preferência salva, verifica a do sistema
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark'
  }
  return 'light'
}

/**
 * Aplica um tema específico
 * @param {'light' | 'dark'} theme
 */
export function setTheme(theme) {
  const finalTheme = theme === 'dark' ? 'dark' : 'light'
  document.documentElement.setAttribute('data-theme', finalTheme)
  localStorage.setItem(THEME_KEY, finalTheme)

  updateThemeIcons(finalTheme)

  listeners.forEach(cb => {
    try { cb(finalTheme) } catch (err) { console.error('[theme] Erro no listener:', err) }
  })
}

/**
 * Alterna entre tema claro e escuro
 * @returns {'light' | 'dark'} o novo tema ativo
 */
export function toggleTheme() {
  const current = getTheme()
  const next = current === 'dark' ? 'light' : 'dark'
  setTheme(next)
  return next
}

/**
 * Registra um callback para mudanças de tema
 * @param {(theme: 'light' | 'dark') => void} callback
 * @returns {() => void} função para remover o listener
 */
export function onThemeChange(callback) {
  listeners.add(callback)
  return () => listeners.delete(callback)
}

/**
 * Atualiza ícones e textos dos botões de tema na interface
 * @param {'light' | 'dark'} theme
 */
function updateThemeIcons(theme) {
  const isDark = theme === 'dark'
  // Ícone no header desktop
  const headerIcon = document.getElementById('theme-toggle-icon')
  if (headerIcon) {
    headerIcon.textContent = isDark ? '☀️' : '🌙'
  }
  const headerBtn = document.getElementById('btn-theme-toggle')
  if (headerBtn) {
    headerBtn.setAttribute('title', isDark ? 'Mudar para Modo Claro' : 'Mudar para Modo Escuro')
  }

  // Ícone e texto no menu lateral mobile
  const drawerIcon = document.getElementById('drawer-theme-icon')
  if (drawerIcon) {
    drawerIcon.textContent = isDark ? '☀️' : '🌙'
  }
  const drawerText = document.getElementById('drawer-theme-text')
  if (drawerText) {
    drawerText.textContent = isDark ? 'Modo Claro' : 'Modo Escuro'
  }
}

/**
 * Inicializa o tema no carregamento da aplicação
 */
export function initTheme() {
  const current = getTheme()
  setTheme(current)

  // Escuta mudanças do sistema caso o usuário não tenha preferência salva
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!localStorage.getItem(THEME_KEY)) {
        setTheme(e.matches ? 'dark' : 'light')
      }
    })
  }
}
