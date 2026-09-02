import { supabase, isSupabaseConfigured } from './supabase'
import { storage } from './storage'
import type { User } from '@supabase/supabase-js'

/**
 * Auth API — Supabase Auth üzerine kurulu.
 *
 * Kullanıcı adı, `username@sahtekar.game` email formatına çevrilir
 * böylece kullanıcı email girmek zorunda kalmaz.
 *
 * Mevcut localStorage tabanlı sistemden farkı:
 * - Şifreler Supabase'de hash'lenir (daha güvenli)
 * - Cross-device giriş (aynı hesap farklı cihazlarda)
 * - Session otomatik yenilenir
 */

export interface AuthRecord {
  id: string
  username: string
  playerId: string
}
type LocalAuth = AuthRecord & { password: string }
const LOCAL_USERS = 'sahtekar:local-users'
const LOCAL_SESSION = 'sahtekar:local-session'
const localUsers = () => storage.get<LocalAuth[]>(LOCAL_USERS, [])

function usernameToEmail(username: string): string {
  return `${username.toLocaleLowerCase('tr-TR').trim()}@sahtekar.game`
}

function userToRecord(user: User): AuthRecord {
  return {
    id: user.id,
    username: (user.user_metadata?.username as string) ?? user.email?.split('@')[0] ?? 'Oyuncu',
    playerId: (user.user_metadata?.player_id as string) ?? '',
  }
}

export const authApi = {
  /** Mevcut session'ı async döndürür. */
  async currentAsync(): Promise<AuthRecord | null> {
    if (!isSupabaseConfigured) return storage.get<AuthRecord | null>(LOCAL_SESSION, null)
    const result = await Promise.race([
      supabase.auth.getSession(),
      new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 5000)),
    ])
    if (!result) return null
    const { data, error } = result
    if (error || !data.session) return null
    return userToRecord(data.session.user)
  },

  /** Giriş yap. */
  async login(username: string, password: string): Promise<{ ok: boolean; error?: string }> {
    if (!isSupabaseConfigured) {
      const user = localUsers().find((u) => u.username.toLocaleLowerCase('tr-TR') === username.toLocaleLowerCase('tr-TR') && u.password === password)
      if (!user) return { ok: false, error: 'Kullanıcı adı veya şifre hatalı' }
      storage.set(LOCAL_SESSION, user); return { ok: true }
    }
    const { error } = await supabase.auth.signInWithPassword({
      email: usernameToEmail(username),
      password,
    })
    if (error) {
      return { ok: false, error: 'Kullanıcı adı veya şifre hatalı' }
    }
    return { ok: true }
  },

  /** Kayıt ol — başarılıysa otomatik giriş yap. */
  async register(
    username: string,
    password: string,
    _playerId: string,
  ): Promise<{ ok: boolean; error?: string }> {
    if (!isSupabaseConfigured) {
      const all = localUsers()
      if (all.some((u) => u.username.toLocaleLowerCase('tr-TR') === username.toLocaleLowerCase('tr-TR'))) return { ok: false, error: 'Bu kullanıcı adı zaten kayıtlı' }
      const user: LocalAuth = { id: `local-${Date.now()}`, username, playerId: _playerId, password }
      storage.set(LOCAL_USERS, [...all, user]); storage.set(LOCAL_SESSION, user); return { ok: true }
    }
    const { data, error } = await supabase.auth.signUp({
      email: usernameToEmail(username),
      password,
      options: {
        data: { username },
      },
    })
    if (error) {
      if (error.message.includes('already')) {
        return { ok: false, error: 'Bu kullanıcı adı zaten kayıtlı' }
      }
      return { ok: false, error: error.message }
    }
    if (!data.user) {
      return { ok: false, error: 'Kayıt başarısız' }
    }

    // Supabase otomatik session oluşturmayabilir — manuel login yap
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: usernameToEmail(username),
      password,
    })
    if (loginError) {
      // Kayıt başarılı ama login başarısız — kullanıcı manuel giriş yapabilir
      return { ok: true }
    }

    return { ok: true }
  },

  /** Çıkış yap. */
  async logout(): Promise<void> {
    await supabase.auth.signOut()
  },

  /** Auth state değişimini dinle. */
  onAuthChange(callback: (record: AuthRecord | null) => void): () => void {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      callback(session?.user ? userToRecord(session.user) : null)
    })
    return () => data.subscription.unsubscribe()
  },
}
