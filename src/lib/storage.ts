/**
 * Tek noktadan tüm kalıcı veri erişimi.
 *
 * Bu sürümde `localStorage` üzerine kurulu; ileride backend (Supabase) eklendiğinde
 * sadece bu dosyanın implementasyonu değiştirilir, uygulamanın geri kalanı aynı kalır.
 *
 * Tüm hatalar graceful fallback'e düşer: storage erişilemezse `fallback` döner.
 */

export const STORAGE_KEYS = {
  PROFILE: 'sahtekar:profile',
  STATS: 'sahtekar:stats',
  INVENTORY: 'sahtekar:inventory',
  ACHIEVEMENTS: 'sahtekar:achievements',
  QUESTS: 'sahtekar:quests',
  WEEKLY_QUESTS: 'sahtekar:weekly-quests',
  MONTHLY_QUESTS: 'sahtekar:monthly-quests',
  LEADERBOARD: 'sahtekar:leaderboard',
  SETTINGS: 'sahtekar:settings',
  AUTH: 'sahtekar:auth',
} as const

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS]

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

export const storage = {
  get<T>(key: string, fallback: T): T {
    if (!isBrowser()) return fallback
    try {
      const raw = window.localStorage.getItem(key)
      if (raw === null) return fallback
      return JSON.parse(raw) as T
    } catch (err) {
      console.warn(`[storage] get("${key}") başarısız, fallback döndü:`, err)
      return fallback
    }
  },

  set<T>(key: string, value: T): boolean {
    if (!isBrowser()) return false
    try {
      window.localStorage.setItem(key, JSON.stringify(value))
      // `storage` olayı aynı sekmedeki diğer React instance'larında çalışmaz.
      // Uygulama içi abonelerin de anında güncellenmesi için özel olay yayınla.
      window.dispatchEvent(new CustomEvent('sahtekar:storage', { detail: { key } }))
      return true
    } catch (err) {
      console.warn(`[storage] set("${key}") başarısız:`, err)
      return false
    }
  },

  remove(key: string): void {
    if (!isBrowser()) return
    try {
      window.localStorage.removeItem(key)
    } catch (err) {
      console.warn(`[storage] remove("${key}") başarısız:`, err)
    }
  },

  clear(): void {
    if (!isBrowser()) return
    try {
      window.localStorage.clear()
    } catch (err) {
      console.warn('[storage] clear başarısız:', err)
    }
  },
}
