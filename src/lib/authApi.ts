import { supabase } from './supabase'
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
    const { data, error } = await supabase.auth.getSession()
    if (error || !data.session) return null
    return userToRecord(data.session.user)
  },

  /** Giriş yap. */
  async login(username: string, password: string): Promise<{ ok: boolean; error?: string }> {
    const { error } = await supabase.auth.signInWithPassword({
      email: usernameToEmail(username),
      password,
    })
    if (error) {
      return { ok: false, error: 'Kullanıcı adı veya şifre hatalı' }
    }
    return { ok: true }
  },

  /** Kayıt ol. */
  async register(
    username: string,
    password: string,
    _playerId: string,
  ): Promise<{ ok: boolean; error?: string }> {
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
    return { ok: true }
  },

  /** Çıkış yap. */
  async logout(): Promise<void> {
    await supabase.auth.signOut()
  },

  /** Google OAuth ile giriş (yeni pencere açar, redirect ile geri döner). */
  async signInWithGoogle(): Promise<{ ok: boolean; error?: string }> {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    })
    if (error) {
      return { ok: false, error: error.message }
    }
    // signInWithOAuth tarayıcıyı yönlendirir — geri dönüşte onAuthChange tetiklenir
    return { ok: true }
  },

  /** Auth state değişimini dinle. */
  onAuthChange(callback: (record: AuthRecord | null) => void): () => void {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      callback(session?.user ? userToRecord(session.user) : null)
    })
    return () => data.subscription.unsubscribe()
  },
}
