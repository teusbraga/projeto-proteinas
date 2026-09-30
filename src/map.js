import 'mapbox-gl/dist/mapbox-gl.css'
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css'
import { escapeHtml } from './utils.js'
import { getTheme } from './theme.js'
import { getLanguage, t } from './i18n.js'
import { getCurrencySymbol } from './calculator.js'

const TOKEN = import.meta.env.VITE_MAPBOX_TOKEN

/** @type {any} */
let mapboxglModule = null
/** @type {any} */
let MapboxGeocoderModule = null

/** @type {any} */
let map = null
/** @type {any} */
let marker = null
/** @type {{ lat: number, lng: number, placeName: string, city: string|null }|null} */
let selectedLocation = null

// ============================================================
// API pública do módulo
// ============================================================

/** @type {any} */
let globalMap = null
/** @type {Array<any>} */
let globalMapMarkers = []

/**
 * Retorna o estilo do Mapbox adequado ao tema atual.
 * @returns {string}
 */
export function getMapboxStyle() {
  return getTheme() === 'dark'
    ? 'mapbox://styles/mapbox/dark-v11'
    : 'mapbox://styles/mapbox/light-v11'
}

/**
 * Atualiza o estilo de todos os mapas ativos na tela quando o tema muda.
 * @param {'light'|'dark'} theme
 */
export function updateMapTheme(theme) {
  const style = theme === 'dark'
    ? 'mapbox://styles/mapbox/dark-v11'
    : 'mapbox://styles/mapbox/light-v11'

  if (globalMap) {
    globalMap.setStyle(style)
  }
  if (map) {
    map.setStyle(style)
  }
}

/**
 * Inicializa ou atualiza o mapa global na página inicial com os últimos alfinetes.
 *
 * @param {string} containerId - ID do elemento do mapa global
 * @param {Array<Object>} pins - Lista dos últimos pins
 * @param {Array<number>|null} [targetCoords] - [lng, lat] opcionais para centralizar o mapa
 */
export async function initGlobalMap(containerId, pins = [], targetCoords = null) {
  if (!TOKEN) return null

  if (!mapboxglModule) {
    const mbModule = await import('mapbox-gl')
    mapboxglModule = mbModule.default || mbModule
  }
  const mapboxgl = mapboxglModule

  mapboxgl.accessToken = TOKEN

  const container = document.getElementById(containerId)
  if (!container) return null

  // Identifica o menor preço para destacar o alfinete dourado (campeão do custo-benefício)
  const validPinsWithPrice = pins.filter(p => p.latitude && p.longitude && p.price_per_g != null && Number(p.price_per_g) > 0)
  const minPrice = validPinsWithPrice.length > 0
    ? Math.min(...validPinsWithPrice.map(p => Number(p.price_per_g)))
    : null

  const cheapestPin = validPinsWithPrice.find(p => minPrice != null && Math.abs(Number(p.price_per_g) - minPrice) < 0.0001)

  // Centraliza no campeão de melhor preço ou no primeiro pin com coordenadas
  const firstValid = cheapestPin || pins.find(p => p.latitude && p.longitude)

  if (!globalMap) {
    const initialCenter = targetCoords
      ? targetCoords
      : (firstValid
          ? [Number(firstValid.longitude), Number(firstValid.latitude)]
          : [-46.6333, -23.5505])

    globalMap = new mapboxgl.Map({
      container: containerId,
      style: getMapboxStyle(),
      center: initialCenter,
      zoom: targetCoords ? 12 : (firstValid ? 11 : 4),
      cooperativeGestures: true, // melhora scroll em celulares
    })

    // Adiciona controles de navegação
    globalMap.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right')

    // Alterna exibição: pontos compactos quando afastado, preços detalhados quando aproxima
    const ZOOM_PRICE_THRESHOLD = 11.5

    const updateZoomDisplay = () => {
      if (!globalMap || !container) return
      const currentZoom = globalMap.getZoom()
      if (currentZoom >= ZOOM_PRICE_THRESHOLD) {
        container.classList.add('map-show-prices')
        container.classList.remove('map-compact-dots')
      } else {
        container.classList.add('map-compact-dots')
        container.classList.remove('map-show-prices')
      }
    }

    globalMap.on('zoom', updateZoomDisplay)
    globalMap.on('load', updateZoomDisplay)
    updateZoomDisplay()
  }

  // Limpa marcadores anteriores do mapa global
  globalMapMarkers.forEach(m => m.remove())
  globalMapMarkers = []

  // Plota os pins personalizados com preços
  pins.forEach(pin => {
    if (!pin.latitude || !pin.longitude) return

    const priceNum = pin.price_per_g ? Number(pin.price_per_g) : null
    const isCheapest = minPrice != null && priceNum != null && Math.abs(priceNum - minPrice) < 0.0001
    const isPersonal = Boolean(pin.is_local)
    const symbol = getCurrencySymbol(pin.currency || 'BRL')

    // Elemento HTML customizado para o Pin (Pílula de Preço estilo Airbnb)
    const el = document.createElement('div')
    const classes = ['map-pin-pill']
    if (isCheapest) classes.push('pin-cheapest')
    if (isPersonal) classes.push('pin-personal')
    el.className = classes.join(' ')
    el.setAttribute('tabindex', '0')
    el.setAttribute('role', 'button')
    el.setAttribute('aria-label', `${pin.product_name}: ${symbol} ${priceNum?.toFixed(4) || '—'}`)

    let badgeIcon = ''
    if (isCheapest) {
      badgeIcon = `<span class="pin-crown" title="${t('badgeCheapest', { defaultValue: 'Melhor Custo-Benefício' })}">👑</span>`
    } else if (isPersonal) {
      badgeIcon = `<span class="pin-personal-icon" title="${t('badgePersonalPin', { defaultValue: 'Meu Registro Pessoal' })}">👤</span>`
    }

    const badgeContent = badgeIcon
      ? `${badgeIcon}<span class="pin-price-text">${symbol} ${priceNum ? priceNum.toFixed(4) : '—'}</span>`
      : `<span class="pin-price-text">${priceNum ? `${symbol} ${priceNum.toFixed(4)}` : '—'}</span>`

    el.innerHTML = `
      <div class="pin-pill-content">
        ${badgeContent}
      </div>
      <div class="pin-pill-tail"></div>
    `

    const priceFormatted = priceNum != null
      ? `<strong>${symbol} ${priceNum.toFixed(4)}</strong> ${t('perGramUnit')}`
      : ''

    const popupHtml = `
      <div class="map-popup-card">
        ${isCheapest ? `<div class="popup-badge-gold">👑 ${t('badgeCheapest', { defaultValue: 'Campeão do Custo-Benefício' })}</div>` : ''}
        ${isPersonal ? `<div class="popup-badge-personal">👤 ${t('badgePersonalPin', { defaultValue: 'Meu Registro Pessoal' })}</div>` : ''}
        <h4 class="popup-product-title">${escapeHtml(pin.product_name || 'Produto')}</h4>
        <p class="popup-place-name">📍 ${escapeHtml(pin.place_name || 'Local informado')}${pin.city ? ` — ${escapeHtml(pin.city)}` : ''}</p>
        ${priceFormatted ? `<div class="popup-price-tag">${priceFormatted}</div>` : ''}
      </div>
    `

    const popup = new mapboxgl.Popup({ offset: [0, -18], closeButton: true, maxWidth: '280px' })
      .setHTML(popupHtml)

    const markerInstance = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
      .setLngLat([Number(pin.longitude), Number(pin.latitude)])
      .setPopup(popup)
      .addTo(globalMap)

    globalMapMarkers.push(markerInstance)
  })

  // Se houver coordenadas alvo (cidade selecionada no autocomplete ou flyTo), voa suavemente
  if (targetCoords && Array.isArray(targetCoords) && targetCoords.length === 2) {
    globalMap.flyTo({
      center: [Number(targetCoords[0]), Number(targetCoords[1])],
      zoom: 12,
      essential: true,
      speed: 1.2
    })
  } else if (cheapestPin) {
    globalMap.flyTo({
      center: [Number(cheapestPin.longitude), Number(cheapestPin.latitude)],
      zoom: 11.5,
      essential: true,
      speed: 1.2
    })
  }

  return globalMap
}

/**
 * Move suavemente o mapa global para uma coordenada específica (ex: cidade buscada).
 * @param {number} lng
 * @param {number} lat
 * @param {number} [zoom=12]
 */
export function flyGlobalMapTo(lng, lat, zoom = 12) {
  if (globalMap) {
    globalMap.flyTo({
      center: [lng, lat],
      zoom,
      essential: true,
      speed: 1.2
    })
  }
}

/** Retorna a localização selecionada atualmente (ou null). */
export function getSelectedLocation() {
  return selectedLocation
}

/** Limpa a localização selecionada. */
export function resetLocation() {
  selectedLocation = null
  marker?.remove()
  marker = null
}

/**
 * Inicializa o mapa dentro do elemento #map via dynamic import.
 * Carrega mapbox-gl e geocoder sob demanda para não pesar o bundle inicial.
 *
 * @param {string} mapContainerId      - ID do elemento do mapa
 * @param {string} geocoderContainerId - ID do elemento para o geocoder
 */
export async function initMap(mapContainerId, geocoderContainerId) {
  if (!TOKEN) {
    console.warn('[Map] VITE_MAPBOX_TOKEN não configurado. Mapa desabilitado.')
    document.getElementById(mapContainerId).innerHTML = `
      <div style="height:100%;display:flex;align-items:center;justify-content:center;color:#94a3b8;flex-direction:column;gap:12px">
        <span style="font-size:2rem">🗺️</span>
        <span>Configure VITE_MAPBOX_TOKEN para habilitar o mapa.</span>
      </div>`
    return
  }

  // Carrega bibliotecas pesadas de mapa apenas quando o modal for aberto
  if (!mapboxglModule || !MapboxGeocoderModule) {
    const [mbModule, geoModule] = await Promise.all([
      import('mapbox-gl'),
      import('@mapbox/mapbox-gl-geocoder')
    ])
    mapboxglModule = mbModule.default || mbModule
    MapboxGeocoderModule = geoModule.default || geoModule
  }

  const mapboxgl = mapboxglModule
  const MapboxGeocoder = MapboxGeocoderModule

  mapboxgl.accessToken = TOKEN

  map = new mapboxgl.Map({
    container: mapContainerId,
    style: getMapboxStyle(),
    center: [-46.6333, -23.5505], // São Paulo como padrão
    zoom: 12,
  })

  const lang = getLanguage()

  // Geocoder (busca de endereço/estabelecimento)
  const geocoder = new MapboxGeocoder({
    accessToken: TOKEN,
    mapboxgl,
    placeholder: lang === 'en' ? 'Search grocery store, pharmacy, address...' : 'Buscar mercado, farmácia, loja, endereço...',
    language: lang === 'en' ? 'en' : 'pt-BR',
    country: lang === 'en' ? undefined : 'BR',
    types: 'poi,address,place,locality,neighborhood',
    trackProximity: true,
    externalGeocoder: searchOpenStreetMapPOIs,
  })

  // Tenta usar a geolocalização do usuário para centrar o mapa e orientar a busca
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        map?.setCenter([coords.longitude, coords.latitude])
        geocoder.setProximity({ longitude: coords.longitude, latitude: coords.latitude })
      },
      () => {} // silencia erro de permissão negada
    )
  }

  const geocoderEl = document.getElementById(geocoderContainerId)
  if (geocoderEl) {
    geocoderEl.appendChild(geocoder.onAdd(map))
  }

  // Mantém a busca sintonizada com a região que o usuário está navegando no mapa
  map.on('moveend', () => {
    if (map) {
      const center = map.getCenter()
      geocoder.setProximity({ longitude: center.lng, latitude: center.lat })
    }
  })

  // Quando o geocoder encontra um resultado, coloca o marcador
  geocoder.on('result', (e) => {
    const [lng, lat] = e.result.center
    let city = null
    if (e.result.context) {
      const placeCtx = e.result.context.find(c => c.id.startsWith('place.') || c.id.startsWith('municipality.'))
      city = placeCtx?.text || null
    }
    if (!city && e.result.id && e.result.id.startsWith('place.')) {
      city = e.result.text || null
    }
    setMarker(lng, lat, e.result.place_name, city)
  })

  // Click no mapa — faz reverse geocoding e coloca marcador
  map.on('click', async (e) => {
    const { lng, lat } = e.lngLat
    const { placeName, city } = await reverseGeocode(lng, lat)
    setMarker(lng, lat, placeName, city)
  })

  return map
}

/** Redimensiona o mapa para o container atual (corrige renderização ao reabrir modal). */
export function resizeMap() {
  map?.resize()
}

/**
 * Obtém a localização GPS atual do usuário, centraliza o mapa com zoom e define o marcador.
 *
 * @returns {Promise<{lng: number, lat: number, placeName: string, city: string|null}>}
 */
export async function setUserLocationOnMap() {
  if (!navigator.geolocation) {
    throw new Error('Geolocalização não suportada pelo navegador')
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const lng = coords.longitude
          const lat = coords.latitude
          if (map) {
            map.flyTo({ center: [lng, lat], zoom: 16 })
          }
          const { placeName, city } = await reverseGeocode(lng, lat)
          setMarker(lng, lat, placeName, city)
          resolve({ lng, lat, placeName, city })
        } catch (err) {
          reject(err)
        }
      },
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    )
  })
}

/** Destrói o mapa e libera recursos. Chamar ao fechar o modal. */
export function destroyMap() {
  map?.remove()
  map = null
  marker = null
  selectedLocation = null
}

// ============================================================
// Funções internas
// ============================================================

function setMarker(lng, lat, placeName, city = null) {
  // Remove marcador anterior
  marker?.remove()

  const MarkerClass = mapboxglModule?.Marker || window.mapboxgl?.Marker
  if (MarkerClass && map) {
    marker = new MarkerClass({ color: '#ff6b4a', scale: 1.1 })
      .setLngLat([lng, lat])
      .addTo(map)
  }

  selectedLocation = { lng, lat, placeName, city }

  // Atualiza o display no modal
  const display = document.getElementById('selected-location-display')
  if (display) {
    display.textContent = `📍 ${placeName}`
  }
}

async function reverseGeocode(lng, lat) {
  try {
    const lang = getLanguage() === 'en' ? 'en' : 'pt-BR'
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json` +
      `?access_token=${TOKEN}&language=${lang}&types=poi,address,place&limit=1`
    )
    const json = await res.json()
    const feature = json.features?.[0]
    const placeName = feature?.place_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`
    
    // Extrai o nome da cidade a partir do contexto do Mapbox
    let city = null
    if (feature?.context) {
      const placeCtx = feature.context.find(c => c.id.startsWith('place.') || c.id.startsWith('municipality.'))
      city = placeCtx?.text || null
    }
    if (!city && feature?.id && feature.id.startsWith('place.')) {
      city = feature.text || null
    }

    return { placeName, city }
  } catch {
    return { placeName: `${lat.toFixed(5)}, ${lng.toFixed(5)}`, city: null }
  }
}

/**
 * Busca estabelecimentos comerciais e pontos de interesse (mercados, padarias, farmácias)
 * no OpenStreetMap (via Photon) para complementar os resultados da Mapbox.
 * Totalmente gratuito, sem necessidade de chaves e com proteção por timeout.
 */
async function searchOpenStreetMapPOIs(query) {
  if (!query || query.trim().length < 3) return []

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 3500)

    const center = map ? map.getCenter() : { lng: -46.6333, lat: -23.5505 }
    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query.trim())}&lat=${center.lat}&lon=${center.lng}&limit=5`

    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timeoutId)

    if (!res.ok) return []
    const data = await res.json()
    if (!data.features || !Array.isArray(data.features)) return []

    return data.features.map(f => {
      const p = f.properties || {}
      const street = p.street ? (p.housenumber ? `${p.street}, ${p.housenumber}` : p.street) : ''
      const district = p.district || p.locality || ''
      const city = p.city || p.town || p.municipality || ''
      const state = p.state || ''

      const parts = [
        p.name,
        street,
        district,
        city ? (state ? `${city} - ${state}` : city) : state
      ].filter(Boolean)

      const place_name = parts.length > 0 ? parts.join(', ') : (p.name || query)

      return {
        id: `osm.${p.osm_type || 'N'}${p.osm_id || Math.floor(Math.random() * 100000)}`,
        type: 'Feature',
        text: p.name || p.street || query,
        place_name,
        place_type: ['poi'],
        center: f.geometry.coordinates,
        geometry: f.geometry,
        context: [
          district ? { id: 'neighborhood.osm', text: district } : null,
          city ? { id: 'place.osm', text: city } : null,
          state ? { id: 'region.osm', text: state } : null,
          { id: 'country.osm', text: 'Brasil' }
        ].filter(Boolean)
      }
    })
  } catch {
    return [] // Se a requisição falhar ou der timeout, retorna lista vazia sem travar
  }
}
