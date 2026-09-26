import { initMap, destroyMap, getSelectedLocation, resizeMap, setUserLocationOnMap } from '../map.js'
import { showToast } from './toast.js'
import { t } from '../i18n.js'

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
  } else {
    setTimeout(() => {
      resizeMap()
    }, 60)
  }

  // Botão "Meu local" — obtém o GPS do usuário, centraliza o mapa e define o marcador
  const btnMyLocation = document.getElementById('btn-modal-my-location')
  if (btnMyLocation) {
    const newGpsBtn = btnMyLocation.cloneNode(true)
    btnMyLocation.parentNode.replaceChild(newGpsBtn, btnMyLocation)
    newGpsBtn.addEventListener('click', async () => {
      newGpsBtn.classList.add('loading')
      const originalHtml = newGpsBtn.innerHTML
      newGpsBtn.innerHTML = `<span>⏳</span><span>${t('btnModalMyLocationLoading') || 'Obtendo GPS...'}</span>`
      try {
        await setUserLocationOnMap()
        showToast(t('toastLocationFound') || 'Localização detectada via GPS!', 'success')
      } catch (err) {
        showToast(t('toastGpsDenied') || 'Não foi possível obter sua localização GPS.', 'error')
      } finally {
        newGpsBtn.classList.remove('loading')
        newGpsBtn.innerHTML = originalHtml
      }
    })
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
