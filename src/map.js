import mapboxgl from 'mapbox-gl'
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder'
import 'mapbox-gl/dist/mapbox-gl.css'
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css'

const TOKEN = import.meta.env.VITE_MAPBOX_TOKEN

/** @type {mapboxgl.Map|null} */
let map = null
/** @type {mapboxgl.Marker|null} */
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
 * Inicializa o mapa dentro do elemento #map.
 * Deve ser chamado APÓS o modal estar visível no DOM.
 *
 * @param {string} mapContainerId      - ID do elemento do mapa
 * @param {string} geocoderContainerId - ID do elemento para o geocoder
 */
export function initMap(mapContainerId, geocoderContainerId) {
  if (!TOKEN) {
    console.warn('[Map] VITE_MAPBOX_TOKEN não configurado. Mapa desabilitado.')
    document.getElementById(mapContainerId).innerHTML = `
      <div style="height:100%;display:flex;align-items:center;justify-content:center;color:#94a3b8;flex-direction:column;gap:12px">
        <span style="font-size:2rem">🗺️</span>
        <span>Configure VITE_MAPBOX_TOKEN para habilitar o mapa.</span>
      </div>`
    return
  }

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
    setMarker(lng, lat, e.result.place_name)
  })

  // Click no mapa — faz reverse geocoding e coloca marcador
  map.on('click', async (e) => {
    const { lng, lat } = e.lngLat
    const placeName = await reverseGeocode(lng, lat)
    setMarker(lng, lat, placeName)
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

function setMarker(lng, lat, placeName) {
  // Remove marcador anterior
  marker?.remove()

  marker = new mapboxgl.Marker({ color: '#22c55e', scale: 1.1 })
    .setLngLat([lng, lat])
    .addTo(map)

  selectedLocation = { lng, lat, placeName }

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
      `?access_token=${TOKEN}&language=pt-BR&types=poi,address&limit=1`
    )
    const json = await res.json()
    return json.features?.[0]?.place_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`
  } catch {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`
  }
}
