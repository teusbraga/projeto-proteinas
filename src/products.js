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
 * @param {number}  [params.latitude]
 * @param {number}  [params.longitude]
 * @returns {Promise<Object>} produto salvo
 */
export async function saveProduct({ userId, name, foodType, brand, price, weightG, portionG, proteinG, photoFile, storeName, latitude, longitude }) {
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
    .select('id, name, brand, food_type, price, weight_g, portion_g, protein_g, price_per_g_protein, store_name, city, created_at')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

/**
 * Busca o ranking público ordenado pelo menor preço/g proteína.
 *
 * @param {Object}  [opts]
 * @param {string}  [opts.foodType] - 'animal' | 'vegetal' | null (todos)
 * @param {number}  [opts.limit]
 */
export async function getRanking({ foodType = null, limit = 60 } = {}) {
  let query = supabase
    .from('products')
    .select('id, name, brand, food_type, price_per_g_protein, photo_url, store_name, city, created_at')
    .eq('is_active', true)
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
 * Remove um produto (soft delete por RLS — só funciona para o próprio usuário).
 */
export async function deleteProduct(productId) {
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
      .single(),
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
