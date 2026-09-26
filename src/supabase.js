import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    '[ProteinPrice] Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env.local\n' +
    'Copie .env.example para .env.local e preencha com suas chaves do Supabase.'
  )
}

// Singleton — uma única instância para toda a aplicação configurada com PKCE
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    flowType: 'pkce',
    autoRefreshToken: true,
    detectSessionInUrl: true,
    persistSession: true,
  },
})
