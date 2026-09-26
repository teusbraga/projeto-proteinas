import { supabase } from './supabase.js'

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
export async function saveProduct({ userId, name, foodType, brand, price, weightG, portionG, proteinG, photoFile, storeName, city, latitude, longitude }) {
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

  // Insert no banco
  // NÃO inclua price_per_g_protein — é GENERATED ALWAYS
  const { data, error } = await supabase
    .from('products')
    .insert({
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
    })
    .select()
    .single()

  if (error) throw error
  return data
}

// ============================================================
// READ
// ============================================================

/**
 * Busca os produtos do usuário autenticado, ordenados por data.
 */
export async function getMyProducts(userId) {
  const { data, error } = await supabase
    .from('products')
    .select('id, name, brand, food_type, price, weight_g, portion_g, protein_g, price_per_g_protein, photo_url, store_name, city, created_at')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

/**
 * Busca o ranking público ordenado pelo menor preço/g proteína.
 * Aplica a regra de expiração de 30 dias (apenas produtos recentes).
 *
 * @param {Object}  [opts]
 * @param {string}  [opts.foodType] - 'animal' | 'vegetal' | null (todos)
 * @param {number}  [opts.limit]
 */
export async function getRanking({ foodType = null, limit = 60 } = {}) {
  // Limite de 30 dias atrás
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  let query = supabase
    .from('products')
    .select('id, name, brand, food_type, price_per_g_protein, photo_url, store_name, city, created_at')
    .eq('is_active', true)
    .gte('created_at', thirtyDaysAgo)
    .order('price_per_g_protein', { ascending: true })
    .limit(limit)

  if (foodType && foodType !== 'all') {
    query = query.eq('food_type', foodType)
  }

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

/**
 * Busca os últimos 100 alfinetes/pontos geográficos no mapa global.
 * Consulta diretamente da tabela products para evitar erro 404 de tabelas não migradas.
 * @returns {Promise<Array<Object>>}
 */
export async function getLatestPins(limit = 100) {
  const { data, error } = await supabase
    .from('products')
    .select('id, store_name, city, latitude, longitude, name, price_per_g_protein, created_at')
    .not('latitude', 'is', null)
    .not('longitude', 'is', null)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error || !data) return []

  return data.map(p => ({
    id: p.id,
    place_name: p.store_name,
    city: p.city,
    latitude: p.latitude,
    longitude: p.longitude,
    product_name: p.name,
    price_per_g: p.price_per_g_protein,
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
 */
export async function getStats() {
  const [countResult, cheapestResult] = await Promise.allSettled([
    supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true),
    supabase
      .from('products')
      .select('price_per_g_protein')
      .eq('is_active', true)
      .order('price_per_g_protein', { ascending: true })
      .limit(1)
      .maybeSingle(),
  ])

  return {
    totalProducts: countResult.status === 'fulfilled' ? (countResult.value.count ?? 0) : 0,
    cheapestPricePerG: cheapestResult.status === 'fulfilled'
      ? cheapestResult.value.data?.price_per_g_protein ?? null
      : null,
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
