import { storage, STORAGE_KEYS } from './storage'
import { STARTER_AVATARS } from '../config/customShopAvatars'
import type { Profile, Stats, Inventory, LeaderboardEntry, Settings } from '../types'

// ─── Sabitler ────────────────────────────────────────────────────────────────

export const STARTING_COINS = 100
export const XP_PER_LEVEL = 100

/** level = floor(xp / 100) + 1 */
export function levelFromXp(xp: number): number {
  return Math.floor(xp / XP_PER_LEVEL) + 1
}

function defaultProfile(): Profile {
  return {
    username: 'Oyuncu',
    avatar: STARTER_AVATARS[0]!.id,
    frame: null,
    coins: STARTING_COINS,
    xp: 0,
    level: 1,
    createdAt: Date.now(),
  }
}

function defaultStats(): Stats {
  return {
    gamesPlayed: 0,
    wins: 0,
    winsAsImpostor: 0,
    winsAsPlayer: 0,
    streak: 0,
    bestStreak: 0,
  }
}

function defaultInventory(): Inventory {
  return {
    avatars: STARTER_AVATARS.map((a) => a.id),
    frames: ['frame_none'],
    equippedAvatar: STARTER_AVATARS[0]!.id,
    equippedFrame: null,
  }
}

// ─── Profile ─────────────────────────────────────────────────────────────────

export const profileApi = {
  get(): Profile {
    const p = storage.get<Profile | null>(STORAGE_KEYS.PROFILE, null)
    if (!p) {
      const fresh = defaultProfile()
      storage.set(STORAGE_KEYS.PROFILE, fresh)
      return fresh
    }
    // level her zaman xp'den türetilir (tutarlılık)
    return { ...p, level: levelFromXp(p.xp) }
  },

  update(patch: Partial<Profile>): Profile {
    const current = this.get()
    const next = { ...current, ...patch, level: levelFromXp(patch.xp ?? current.xp) }
    storage.set(STORAGE_KEYS.PROFILE, next)
    return next
  },

  /** Coin ekle/çıkar (negatif olabilir). Başarısızsa false. */
  addCoins(delta: number): boolean {
    const p = this.get()
    const next = p.coins + delta
    if (next < 0) return false
    this.update({ coins: next })
    return true
  },

  /** XP ekle; level otomatik güncellenir. Yeni level döner. */
  addXp(amount: number): { xp: number; level: number; leveledUp: boolean } {
    const p = this.get()
    const oldLevel = p.level
    const newXp = Math.max(0, p.xp + amount)
    const newLevel = levelFromXp(newXp)
    this.update({ xp: newXp })
    return { xp: newXp, level: newLevel, leveledUp: newLevel > oldLevel }
  },

  reset(): void {
    storage.set(STORAGE_KEYS.PROFILE, defaultProfile())
  },
}

// ─── Stats ───────────────────────────────────────────────────────────────────

export const statsApi = {
  get(): Stats {
    return storage.get<Stats>(STORAGE_KEYS.STATS, defaultStats())
  },

  update(patch: Partial<Stats>): Stats {
    const next = { ...this.get(), ...patch }
    storage.set(STORAGE_KEYS.STATS, next)
    return next
  },

  /** Bir oyun sonunda stats'ı günceller (kazanan taraf dahil). */
  recordGame(result: {
    won: boolean
    wonAsImpostor: boolean
    wonAsPlayer: boolean
  }): Stats {
    const s = this.get()
    const streak = result.won ? s.streak + 1 : 0
    const next: Stats = {
      gamesPlayed: s.gamesPlayed + 1,
      wins: s.wins + (result.won ? 1 : 0),
      winsAsImpostor: s.winsAsImpostor + (result.wonAsImpostor ? 1 : 0),
      winsAsPlayer: s.winsAsPlayer + (result.wonAsPlayer ? 1 : 0),
      streak,
      bestStreak: Math.max(s.bestStreak, streak),
    }
    storage.set(STORAGE_KEYS.STATS, next)
    return next
  },

  reset(): void {
    storage.set(STORAGE_KEYS.STATS, defaultStats())
  },
}

// ─── Inventory ───────────────────────────────────────────────────────────────

export const inventoryApi = {
  get(): Inventory {
    return storage.get<Inventory>(STORAGE_KEYS.INVENTORY, defaultInventory())
  },

  /** Avatar satın al (coin yeterliyse). */
  buyAvatar(avatarId: string, price: number): { ok: boolean; reason?: string } {
    const inv = this.get()
    if (inv.avatars.includes(avatarId)) return { ok: false, reason: 'Zaten sahipsin' }
    if (!profileApi.addCoins(-price)) return { ok: false, reason: 'Yetersiz coin' }
    const next = { ...inv, avatars: [...inv.avatars, avatarId] }
    storage.set(STORAGE_KEYS.INVENTORY, next)
    return { ok: true }
  },

  /** Çerçeve satın al. */
  buyFrame(frameId: string, price: number): { ok: boolean; reason?: string } {
    const inv = this.get()
    if (inv.frames.includes(frameId)) return { ok: false, reason: 'Zaten sahipsin' }
    if (!profileApi.addCoins(-price)) return { ok: false, reason: 'Yetersiz coin' }
    const next = { ...inv, frames: [...inv.frames, frameId] }
    storage.set(STORAGE_KEYS.INVENTORY, next)
    return { ok: true }
  },

  /** Avatar donat (sahipse). */
  equipAvatar(avatarId: string): boolean {
    const inv = this.get()
    if (!inv.avatars.includes(avatarId)) return false
    storage.set(STORAGE_KEYS.INVENTORY, { ...inv, equippedAvatar: avatarId })
    return true
  },

  /** Çerçeve donat (sahipse; null = çerçevesiz). */
  equipFrame(frameId: string | null): boolean {
    const inv = this.get()
    if (frameId !== null && !inv.frames.includes(frameId)) return false
    storage.set(STORAGE_KEYS.INVENTORY, { ...inv, equippedFrame: frameId })
    return true
  },

  reset(): void {
    storage.set(STORAGE_KEYS.INVENTORY, defaultInventory())
  },
}

// ─── Leaderboard (yerel) ─────────────────────────────────────────────────────

export const leaderboardApi = {
  getAll(): LeaderboardEntry[] {
    return storage.get<LeaderboardEntry[]>(STORAGE_KEYS.LEADERBOARD, [])
  },

  /** Bir oyuncu için entry güncelle/ekle (oyun sonunda çağrılır). */
  upsert(entry: LeaderboardEntry): void {
    const all = this.getAll()
    const idx = all.findIndex((e) => e.username === entry.username)
    if (idx >= 0) all[idx] = entry
    else all.push(entry)
    // wins'e göre azalan sırala
    all.sort((a, b) => b.wins - a.wins || b.xp - a.xp)
    storage.set(STORAGE_KEYS.LEADERBOARD, all)
  },
}

// ─── Settings ────────────────────────────────────────────────────────────────

function defaultSettings(): Settings {
  return {
    sound: true,
    music: true,
    haptics: true,
    defaultTurnTimeLimit: 30,
    defaultRoundsBeforeVoting: 2,
    defaultBotDifficulty: 'SMART',
    defaultWordDifficulty: 'MIXED',
  }
}

export const settingsApi = {
  get(): Settings {
    return storage.get<Settings>(STORAGE_KEYS.SETTINGS, defaultSettings())
  },

  update(patch: Partial<Settings>): Settings {
    const next = { ...this.get(), ...patch }
    storage.set(STORAGE_KEYS.SETTINGS, next)
    return next
  },

  reset(): void {
    storage.set(STORAGE_KEYS.SETTINGS, defaultSettings())
  },
}
