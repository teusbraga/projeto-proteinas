import { supabase } from './supabase.js'
import { cleanCityName } from './utils.js'

// ============================================================
// SAVE
// ============================================================

/**
 * Salva um produto no banco, fazendo upload da foto se necessário.
 * A coluna price_per_g_protein é calculada automaticamente pelo Postgres.
 *
 * @param {Object} params
 * @param {string}  params.userId
 * @param {string}  params.name
 * @param {string}  params.foodType  - 'animal' | 'vegetal'
 * @param {string}  [params.brand]
 * @param {number}  params.price
 * @param {number}  params.weightG
 * @param {number}  params.portionG
 * @param {number}  params.proteinG
 * @param {File}    [params.photoFile]
 * @param {string}  [params.storeName]
 * @param {string}  [params.city]
 * @param {number}  [params.latitude]
 * @param {number}  [params.longitude]
 * @returns {Promise<Object>} produto salvo
 */
export async function saveProduct({ userId, name, foodType, brand, price, weightG, portionG, proteinG, photoFile, storeName, city, latitude, longitude, currency = 'BRL' }) {
  let photoUrl = null

  // Upload de foto (se houver)
  if (photoFile) {
    const ext = photoFile.type.split('/')[1] ?? 'jpg'
    // Pasta por usuário: "userId/timestamp.ext"
    const path = `${userId}/${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('product-photos')
      .upload(path, photoFile, {
        contentType: photoFile.type,
        upsert: false,
      })

    if (uploadError) throw uploadError

    const { data: { publicUrl } } = supabase.storage
      .from('product-photos')
      .getPublicUrl(path)

    photoUrl = publicUrl
  }

  // Insert no banco com tentativa de inclusão da moeda
  const insertPayload = {
    user_id:    userId,
    name:       name.trim(),
    food_type:  foodType,
    brand:      brand?.trim() || null,
    price,
    weight_g:   weightG,
    portion_g:  portionG,
    protein_g:  proteinG,
    photo_url:  photoUrl,
    store_name: storeName?.trim() || null,
    city:       city?.trim() || null,
    latitude:   latitude  ?? null,
    longitude:  longitude ?? null,
    currency:   (currency || 'BRL').toUpperCase(),
  }

  let { data, error } = await supabase
    .from('products')
    .insert(insertPayload)
    .select()
    .single()

  // Se a coluna 'currency' não existir no banco (migração ainda pendente), tenta novamente sem ela
  if (error && error.message && error.message.includes('currency')) {
    console.warn('[Supabase] Coluna currency ausente no banco. Executando fallback sem currency.')
    delete insertPayload.currency
    const retry = await supabase
      .from('products')
      .insert(insertPayload)
      .select()
      .single()
    data = retry.data
    error = retry.error
  }

  if (error) throw error
  return { ...data, currency: data.currency || currency || 'BRL' }
}

// ============================================================
// READ
// ============================================================

/**
 * Busca os produtos do usuário autenticado, ordenados por data.
 */
export async function getMyProducts(userId) {
  let { data, error } = await supabase
    .from('products')
    .select('id, name, brand, food_type, price, weight_g, portion_g, protein_g, price_per_g_protein, photo_url, store_name, city, latitude, longitude, currency, created_at')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error && error.message && error.message.includes('currency')) {
    const retry = await supabase
      .from('products')
      .select('id, name, brand, food_type, price, weight_g, portion_g, protein_g, price_per_g_protein, photo_url, store_name, city, latitude, longitude, created_at')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
    data = retry.data
    error = retry.error
  }

  if (error) throw error
  return (data ?? []).map(p => ({ ...p, currency: p.currency || 'BRL' }))
}

/**
 * Busca o ranking público ordenado pelo menor preço/g proteína.
 * Aplica a regra de expiração de 30 dias (apenas produtos recentes).
 *
 * @param {Object}  [opts]
 * @param {string}  [opts.foodType] - 'animal' | 'vegetal' | null (todos)
 * @param {string}  [opts.currency] - 'BRL' | 'USD' | 'EUR' | 'all'
 * @param {string}  [opts.city]     - Nome da cidade ou 'all'
 * @param {number}  [opts.limit]
 */
export async function getRanking({ foodType = null, currency = 'BRL', city = null, limit = 60 } = {}) {
  // Limite de 30 dias atrás
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const runQuery = async (includeCurrencyColumn = true) => {
    const fields = includeCurrencyColumn
      ? 'id, name, brand, food_type, price_per_g_protein, photo_url, store_name, city, latitude, longitude, currency, created_at'
      : 'id, name, brand, food_type, price_per_g_protein, photo_url, store_name, city, latitude, longitude, created_at'

    let query = supabase
      .from('products')
      .select(fields)
      .eq('is_active', true)
      .gte('created_at', thirtyDaysAgo)

    if (foodType && foodType !== 'all') {
      query = query.eq('food_type', foodType)
    }

    if (city && city !== 'all') {
      const clean = cleanCityName(city)
      if (clean && clean !== 'all') {
        query = query.ilike('city', `%${clean}%`)
      }
    }

    if (includeCurrencyColumn && currency && currency !== 'all') {
      query = query.eq('currency', currency.toUpperCase())
    }

    query = query.order('price_per_g_protein', { ascending: true }).limit(limit)
    return await query
  }

  let { data, error } = await runQuery(true)

  if (error && error.message && error.message.includes('currency')) {
    const fallback = await runQuery(false)
    data = fallback.data
    error = fallback.error
  }

  if (error) throw error
  return (data ?? []).map(p => ({ ...p, currency: p.currency || 'BRL' }))
}

/**
 * Busca cidades cadastradas no sistema para popular dinamicamente o dropdown de filtro.
 * @returns {Promise<Array<string>>}
 */
export async function getAvailableCities() {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('city')
      .eq('is_active', true)
      .not('city', 'is', null)
      .limit(200)

    if (error || !data) return []

    const citySet = new Set()
    for (const item of data) {
      const c = item.city?.trim()
      if (c && c.length > 1) {
        // Formata capitalização simples caso venha variada
        citySet.add(c)
      }
    }
    return Array.from(citySet).sort((a, b) => a.localeCompare(b))
  } catch (err) {
    console.warn('[getAvailableCities] Erro ao buscar cidades:', err)
    return []
  }
}

/**
 * Busca os últimos 100 alfinetes/pontos geográficos no mapa global.
 * @returns {Promise<Array<Object>>}
 */
export async function getLatestPins(limit = 100, city = null, currency = 'BRL') {
  const runQuery = async (includeCurrencyColumn = true) => {
    const fields = includeCurrencyColumn
      ? 'id, store_name, city, latitude, longitude, name, price_per_g_protein, currency, created_at'
      : 'id, store_name, city, latitude, longitude, name, price_per_g_protein, created_at'

    let query = supabase
      .from('products')
      .select(fields)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .eq('is_active', true)

    if (city && city !== 'all') {
      const clean = cleanCityName(city)
      if (clean && clean !== 'all') {
        query = query.ilike('city', `%${clean}%`)
      }
    }

    if (includeCurrencyColumn && currency && currency !== 'all') {
      query = query.eq('currency', currency.toUpperCase())
    }

    return await query
      .order('created_at', { ascending: false })
      .limit(limit)
  }

  let { data, error } = await runQuery(true)

  if (error && error.message && error.message.includes('currency')) {
    const retry = await runQuery(false)
    data = retry.data
    error = retry.error
  }

  if (error || !data) return []

  return data.map(p => ({
    id: p.id,
    place_name: p.store_name,
    city: p.city,
    latitude: p.latitude,
    longitude: p.longitude,
    product_name: p.name,
    price_per_g: p.price_per_g_protein,
    currency: p.currency || 'BRL',
    created_at: p.created_at,
  }))
}

/**
 * Remove um produto (só funciona para o próprio usuário devido ao RLS).
 * Também remove a foto associada no Storage caso exista, evitando arquivos órfãos.
 */
export async function deleteProduct(productId, photoUrl = null) {
  // 1. Se houver foto, remove do storage do Supabase
  if (photoUrl) {
    try {
      const url = new URL(photoUrl)
      // Caminho padrão: /storage/v1/object/public/product-photos/userId/timestamp.ext
      const match = url.pathname.match(/product-photos\/(.+)$/)
      if (match && match[1]) {
        await supabase.storage.from('product-photos').remove([decodeURIComponent(match[1])])
      }
    } catch (e) {
      console.warn('[Storage] Falha ao deletar foto correspondente:', e)
    }
  }

  // 2. Remove registro no banco
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', productId)

  if (error) throw error
}

/**
 * Busca estatísticas globais para o hero.
 * @param {string} [currency]
 */
export async function getStats(currency = 'BRL') {
  let cheapestQuery = supabase
    .from('products')
    .select('price_per_g_protein, currency')
    .eq('is_active', true)

  if (currency && currency !== 'all') {
    cheapestQuery = cheapestQuery.eq('currency', currency.toUpperCase())
  }

  const [countResult, cheapestResult] = await Promise.allSettled([
    supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true),
    cheapestQuery
      .order('price_per_g_protein', { ascending: true })
      .limit(1)
      .maybeSingle(),
  ])

  let cheapestPrice = null
  let cheapestCurrency = currency || 'BRL'

  if (cheapestResult.status === 'fulfilled' && cheapestResult.value.data) {
    cheapestPrice = cheapestResult.value.data.price_per_g_protein ?? null
    cheapestCurrency = cheapestResult.value.data.currency || currency || 'BRL'
  } else {
    // Fallback se a coluna currency não existir ou se não houver produto nessa moeda
    try {
      const fallback = await supabase
        .from('products')
        .select('price_per_g_protein')
        .eq('is_active', true)
        .order('price_per_g_protein', { ascending: true })
        .limit(1)
        .maybeSingle()
      if (fallback.data) {
        cheapestPrice = fallback.data.price_per_g_protein ?? null
      }
    } catch (_) {}
  }

  return {
    totalProducts: countResult.status === 'fulfilled' ? (countResult.value.count ?? 0) : 0,
    cheapestPricePerG: cheapestPrice,
    cheapestCurrency,
  }
}

/**
 * Subscreve ao ranking em tempo real via Supabase Realtime.
 * Chama onUpdate() sempre que um produto é inserido, atualizado ou deletado.
 *
 * @param {() => void} onUpdate
 * @returns {() => void} função para cancelar a subscricão
 */
export function subscribeRanking(onUpdate) {
  const channel = supabase
    .channel('ranking-realtime')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'products',
    }, onUpdate)
    .subscribe()

  return () => supabase.removeChannel(channel)
}
