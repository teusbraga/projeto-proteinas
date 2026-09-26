/** @type {HTMLElement} */
const container = document.getElementById('toast-container')

/**
 * Exibe uma notificação temporária.
 *
 * @param {string} message
 * @param {'success'|'error'|'info'} [type='info']
 * @param {number} [duration=4000] - ms até desaparecer
 */
export function showToast(message, type = 'info', duration = 4000) {
  const icons = { success: '✅', error: '❌', info: 'ℹ️' }

  const toast = document.createElement('div')
  toast.className = `toast toast-${type}`
  toast.setAttribute('role', 'alert')
  toast.innerHTML = `<span aria-hidden="true">${icons[type] ?? '•'}</span><span>${message}</span>`

  container.appendChild(toast)

  // Auto-remove com fade
  const timer = setTimeout(() => removeToast(toast), duration)

  // Clique para fechar antes do tempo
  toast.addEventListener('click', () => {
    clearTimeout(timer)
    removeToast(toast)
  }, { once: true })
}

function removeToast(toast) {
  toast.style.opacity = '0'
  toast.style.transform = 'translateX(16px)'
  toast.style.transition = 'opacity 0.25s, transform 0.25s'
  setTimeout(() => toast.remove(), 260)
}
