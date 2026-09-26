import { initMap, destroyMap, getSelectedLocation } from '../map.js'

let mapInitialized = false

/**
 * Abre o modal do mapa.
 *
 * @param {(location: {lat, lng, placeName}|null) => void} onConfirm
 *   Callback chamado com a localização selecionada (ou null se fechar sem confirmar).
 */
export function openMapModal(onConfirm) {
  const overlay = document.getElementById('map-modal-overlay')
  overlay.classList.remove('hidden')
  document.body.style.overflow = 'hidden' // evita scroll por baixo

  // Inicializa o mapa com delay para garantir que o DOM do modal esteja visível
  // (o Mapbox precisa do container com dimensões reais para renderizar)
  if (!mapInitialized) {
    setTimeout(() => {
      initMap('map', 'geocoder-container')
      mapInitialized = true
    }, 80)
  }

  // Trocar o listener do botão confirmar a cada abertura (evita múltiplos listeners)
  const oldBtn = document.getElementById('btn-confirm-location')
  const newBtn = oldBtn.cloneNode(true)
  oldBtn.parentNode.replaceChild(newBtn, oldBtn)

  newBtn.addEventListener('click', () => {
    const loc = getSelectedLocation()
    closeMapModal()
    onConfirm(loc)
  }, { once: true })
}

/** Fecha o modal do mapa. Não destrói o mapa para reuso rápido. */
export function closeMapModal() {
  const overlay = document.getElementById('map-modal-overlay')
  overlay.classList.add('hidden')
  document.body.style.overflow = ''
}

/** Destrói o mapa completamente (chamar quando o produto for submetido). */
export function resetMapModal() {
  destroyMap()
  mapInitialized = false
  const display = document.getElementById('selected-location-display')
  if (display) display.textContent = ''
}
