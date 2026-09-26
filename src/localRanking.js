/**
 * localRanking.js — Gerenciamento do Ranking Pessoal no LocalStorage
 * Permite que usuários anônimos salvem e comparem produtos sem login,
 * com suporte à sincronização anti-duplicidade ao conectar com Supabase.
 */

const STORAGE_KEY = 'proteinprice_local_products'

/**
 * Retorna os produtos salvos localmente ordenados pelo menor preço por grama.
 * @returns {Array<Object>}
 */
export function getLocalProducts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed)
      ? parsed.sort((a, b) => a.price_per_g_protein - b.price_per_g_protein)
      : []
  } catch {
    return []
  }
}

/**
 * Salva um novo produto no ranking local.
 * Aplica regra anti-duplicidade (mesmo nome, peso, preço e proteína).
 *
 * @param {Object} productData
 * @returns {{ success: boolean, duplicated: boolean, product: Object }}
 */
export function saveLocalProduct(productData) {
  const products = getLocalProducts()

  // Regra anti-duplicidade
  const isDuplicate = products.some(p =>
    p.name.trim().toLowerCase() === productData.name.trim().toLowerCase() &&
    Math.abs(Number(p.price) - Number(productData.price)) < 0.001 &&
    Math.abs(Number(p.weight_g) - Number(productData.weight_g)) < 0.001 &&
    Math.abs(Number(p.protein_g) - Number(productData.protein_g)) < 0.001
  )

  if (isDuplicate) {
    return { success: false, duplicated: true }
  }

  const newProduct = {
    id: 'local_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    name: productData.name.trim(),
    brand: productData.brand?.trim() || null,
    food_type: productData.food_type,
    price: Number(productData.price),
    weight_g: Number(productData.weight_g),
    portion_g: Number(productData.portion_g),
    protein_g: Number(productData.protein_g),
    price_per_g_protein: productData.price_per_g_protein,
    store_name: productData.store_name?.trim() || null,
    city: productData.city?.trim() || null,
    latitude: productData.latitude ?? null,
    longitude: productData.longitude ?? null,
    currency: productData.currency || 'BRL',
    created_at: new Date().toISOString(),
    is_local: true,
  }

  products.push(newProduct)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(products))

  return { success: true, duplicated: false, product: newProduct }
}

/**
 * Remove um produto do ranking local.
 * @param {string} localId
 */
export function deleteLocalProduct(localId) {
  const products = getLocalProducts().filter(p => p.id !== localId)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(products))
}

/**
 * Limpa todos os produtos locais (por exemplo, após sincronização confirmada).
 */
export function clearLocalProducts() {
  localStorage.removeItem(STORAGE_KEY)
}
