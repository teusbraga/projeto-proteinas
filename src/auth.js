import { supabase } from './supabase.js'

/**
 * Inicia o login com Google OAuth.
 * O Supabase redireciona para Google, depois volta para window.location.origin.
 */
export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
    },
  })
  if (error) throw error
}

/**
 * Encerra a sessão do usuário atual.
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

/**
 * Retorna a sessão atual (pode ser null se não logado).
 */
export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

/**
 * Registra um listener para mudanças de autenticação.
 * Dispara imediatamente com o estado atual E quando o estado muda.
 *
 * IMPORTANTE: o Supabase automaticamente processa o token OAuth na URL
 * quando o usuário volta do login com Google — isso acontece dentro desta chamada.
 *
 * @param {(user: User|null) => void} callback
 * @returns {() => void} função para cancelar o listener
 */
export function onAuthChange(callback) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null)
  })
  return () => subscription.unsubscribe()
}
