import 'mapbox-gl/dist/mapbox-gl.css'
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css'

const TOKEN = import.meta.env.VITE_MAPBOX_TOKEN

/** @type {any} */
let mapboxglModule = null
/** @type {any} */
let MapboxGeocoderModule = null

/** @type {any} */
let map = null
/** @type {any} */
let marker = null
/** @type {{ lat: number, lng: number, placeName: string }|null} */
let selectedLocation = null

// ============================================================
// API pública do módulo
// ============================================================

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
    style: 'mapbox://styles/mapbox/dark-v11',
    center: [-46.6333, -23.5505], // São Paulo como padrão
    zoom: 12,
  })

  // Tenta usar a geolocalização do usuário para centrar o mapa
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => map?.setCenter([coords.longitude, coords.latitude]),
      () => {} // silencia erro de permissão negada
    )
  }

  // Geocoder (busca de endereço/estabelecimento)
  const geocoder = new MapboxGeocoder({
    accessToken: TOKEN,
    mapboxgl,
    placeholder: 'Buscar mercado, farmácia, loja...',
    language: 'pt-BR',
    country: 'BR',
    types: 'poi,address,place',
  })

  const geocoderEl = document.getElementById(geocoderContainerId)
  if (geocoderEl) {
    geocoderEl.appendChild(geocoder.onAdd(map))
  }

  // Quando o geocoder encontra um resultado, coloca o marcador
  geocoder.on('result', (e) => {
    const [lng, lat] = e.result.center
    let city = null
    if (e.result.context) {
      const placeCtx = e.result.context.find(c => c.id.startsWith('place.') || c.id.startsWith('municipality.'))
      city = placeCtx?.text || null
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
    marker = new MarkerClass({ color: '#22c55e', scale: 1.1 })
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
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json` +
      `?access_token=${TOKEN}&language=pt-BR&types=poi,address,place&limit=1`
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

    return { placeName, city }
  } catch {
    return { placeName: `${lat.toFixed(5)}, ${lng.toFixed(5)}`, city: null }
  }
}
