import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[supabase] VITE_SUPABASE_URL veya VITE_SUPABASE_ANON_KEY tanımlı değil. ' +
      '.env dosyasını kontrol et.',
  )
}

// Ortam değişkenleri yokken de offline ekranlar ve testler çalışabilsin.
// Gerçek bağlantı yalnızca VITE_SUPABASE_* değerleri verildiğinde aktiftir.
export const supabase = createClient(
  supabaseUrl ?? 'http://127.0.0.1:54321',
  supabaseAnonKey ?? 'offline-local-anon-key',
  {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: { eventsPerSecond: 10 },
  },
  },
)

/** Supabase bağlantısı aktif mi? */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)
