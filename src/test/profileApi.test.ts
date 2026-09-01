import { describe, it, expect, beforeEach } from 'vitest'
import { profileApi, statsApi, inventoryApi, leaderboardApi, levelFromXp, xpForLevel, xpToNextLevel, MAX_LEVEL, STARTING_COINS } from '../lib/profileApi'

describe('MAX_LEVEL', () => {
  it('MAX_LEVEL 100', () => expect(MAX_LEVEL).toBe(100))
})
import { STARTER_AVATARS } from '../config/customShopAvatars'

describe('levelFromXp', () => {
  it('xp 0 → level 1', () => expect(levelFromXp(0)).toBe(1))
  it('xp 99 → level 1', () => expect(levelFromXp(99)).toBe(1))
  it('xp 100 → level 2', () => expect(levelFromXp(100)).toBe(2))
  it('xp 250 → level 3', () => expect(levelFromXp(250)).toBe(3))
  // Adım adım progresyon testleri
  // Tier 1: 0-2899 XP → level 1-29 (100 XP/level)
  // Tier 2: 2900-8899 XP → level 30-59 (200 XP/level)
  // Tier 3: 8900-20899 XP → level 60-89 (400 XP/level)
  // Tier 4: 20900-28900 XP → level 90-100 (800 XP/level)
  it('xp 2899 → level 29 (tier 1 son)', () => expect(levelFromXp(2899)).toBe(29))
  it('xp 2900 → level 30 (tier 2 başlangıcı)', () => expect(levelFromXp(2900)).toBe(30))
  it('xp 3099 → level 30 (hala tier 2 ilk level)', () => expect(levelFromXp(3099)).toBe(30))
  it('xp 3100 → level 31', () => expect(levelFromXp(3100)).toBe(31))
  it('xp 8899 → level 59 (tier 2 son)', () => expect(levelFromXp(8899)).toBe(59))
  it('xp 8900 → level 60 (tier 3 başlangıcı)', () => expect(levelFromXp(8900)).toBe(60))
  it('xp 20899 → level 89 (tier 3 son)', () => expect(levelFromXp(20899)).toBe(89))
  it('xp 20900 → level 90 (tier 4 başlangıcı)', () => expect(levelFromXp(20900)).toBe(90))
  it('xp 28900 → level 100 (cap)', () => expect(levelFromXp(28900)).toBe(100))
  it('xp 99999 → level 100 (cap aşılamaz)', () => expect(levelFromXp(99999)).toBe(100))
})

describe('xpForLevel', () => {
  // Level 1-29: 100 XP (tier 1)
  // Level 30-59: 200 XP (tier 2)
  // Level 60-89: 400 XP (tier 3)
  // Level 90-99: 800 XP (tier 4)
  it('level 1 → 100 XP', () => expect(xpForLevel(1)).toBe(100))
  it('level 29 → 100 XP', () => expect(xpForLevel(29)).toBe(100))
  it('level 30 → 200 XP (tier 2)', () => expect(xpForLevel(30)).toBe(200))
  it('level 59 → 200 XP', () => expect(xpForLevel(59)).toBe(200))
  it('level 60 → 400 XP (tier 3)', () => expect(xpForLevel(60)).toBe(400))
  it('level 89 → 400 XP', () => expect(xpForLevel(89)).toBe(400))
  it('level 90 → 800 XP (tier 4)', () => expect(xpForLevel(90)).toBe(800))
  it('level 99 → 800 XP', () => expect(xpForLevel(99)).toBe(800))
  it('level 100 → Infinity (cap)', () => expect(xpForLevel(100)).toBe(Infinity))
})

describe('xpToNextLevel', () => {
  it('xp 0 → 100 XP kalır (level 1→2)', () => expect(xpToNextLevel(0)).toBe(100))
  it('xp 50 → 50 XP kalır (level 1→2)', () => expect(xpToNextLevel(50)).toBe(50))
  it('xp 2899 → 1 XP kalır (level 29→30, tier geçişi)', () => expect(xpToNextLevel(2899)).toBe(1))
  it('xp 2900 → 200 XP kalır (level 30→31, tier 2)', () => expect(xpToNextLevel(2900)).toBe(200))
  it('level 100 → 0 XP kalır (cap)', () => expect(xpToNextLevel(28900)).toBe(0))
})

describe('profileApi', () => {
  beforeEach(() => window.localStorage.clear())

  it('ilk erişimde varsayılan profil oluşturur', () => {
    const p = profileApi.get()
    expect(p.coins).toBe(STARTING_COINS)
    expect(p.level).toBe(1)
    expect(p.xp).toBe(0)
    expect(p.avatar).toBe(STARTER_AVATARS[0]!.id)
  })

  it('update ile alan günceller ve level türetilir', () => {
    profileApi.update({ username: 'Ahmet' })
    expect(profileApi.get().username).toBe('Ahmet')
    profileApi.update({ xp: 150 })
    expect(profileApi.get().level).toBe(2)
  })

  it('addCoins pozitif/negatif çalışır, negatif bakiyede false', () => {
    expect(profileApi.addCoins(50)).toBe(true)
    expect(profileApi.get().coins).toBe(STARTING_COINS + 50)
    expect(profileApi.addCoins(-(STARTING_COINS + 100))).toBe(false)
  })

  it('addXp level atlatır', () => {
    const r = profileApi.addXp(120)
    expect(r.xp).toBe(120)
    expect(r.level).toBe(2)
    expect(r.leveledUp).toBe(true)
  })
})

describe('statsApi', () => {
  beforeEach(() => window.localStorage.clear())

  it('recordGame kazançta streak artar', () => {
    statsApi.recordGame({ won: true, wonAsImpostor: false, wonAsPlayer: true, points: 100 })
    let s = statsApi.get()
    expect(s.gamesPlayed).toBe(1)
    expect(s.wins).toBe(1)
    expect(s.winsAsPlayer).toBe(1)
    expect(s.streak).toBe(1)
    statsApi.recordGame({ won: true, wonAsImpostor: false, wonAsPlayer: true, points: 100 })
    s = statsApi.get()
    expect(s.streak).toBe(2)
    expect(s.bestStreak).toBe(2)
  })

  it('recordGame kayıpta streak sıfırlanır', () => {
    statsApi.recordGame({ won: true, wonAsImpostor: false, wonAsPlayer: true, points: 100 })
    statsApi.recordGame({ won: false, wonAsImpostor: false, wonAsPlayer: false, points: 15 })
    const s = statsApi.get()
    expect(s.streak).toBe(0)
    expect(s.bestStreak).toBe(1)
  })
})

describe('inventoryApi', () => {
  beforeEach(() => window.localStorage.clear())

  it('başlangıçta starter avatarlar sahip', () => {
    const inv = inventoryApi.get()
    expect(inv.avatars).toEqual(expect.arrayContaining(STARTER_AVATARS.map((a) => a.id)))
    expect(inv.frames).toContain('frame_none')
  })

  it('buyAvatar coin yetersizse false', () => {
    const r = inventoryApi.buyAvatar('avatar_cat', 100)
    expect(r.ok).toBe(true)
    expect(profileApi.get().coins).toBe(STARTING_COINS - 100)
    // tekrar satın alma
    const r2 = inventoryApi.buyAvatar('avatar_cat', 100)
    expect(r2.ok).toBe(false)
  })

  it('equipAvatar sahip değilse false', () => {
    expect(inventoryApi.equipAvatar('avatar_dragon')).toBe(false)
    profileApi.addCoins(1000) // satın almak için yeterli coin
    expect(inventoryApi.buyAvatar('avatar_dragon', 350).ok).toBe(true)
    expect(inventoryApi.equipAvatar('avatar_dragon')).toBe(true)
    expect(inventoryApi.get().equippedAvatar).toBe('avatar_dragon')
  })

  it('equipFrame null çerçevesiz yapar', () => {
    profileApi.addCoins(1000)
    expect(inventoryApi.buyFrame('frame_silver', 50).ok).toBe(true)
    expect(inventoryApi.equipFrame('frame_silver')).toBe(true)
    expect(inventoryApi.get().equippedFrame).toBe('frame_silver')
    expect(inventoryApi.equipFrame(null)).toBe(true)
    expect(inventoryApi.get().equippedFrame).toBeNull()
  })
})

describe('leaderboardApi', () => {
  beforeEach(() => window.localStorage.clear())

  it('upsert ekler ve wins azalan sıralar', () => {
    leaderboardApi.upsert({ username: 'A', wins: 1, xp: 10, level: 1, gamesPlayed: 2, lastPlayed: 1, points: 0 })
    leaderboardApi.upsert({ username: 'B', wins: 3, xp: 50, level: 2, gamesPlayed: 5, lastPlayed: 2, points: 0 })
    leaderboardApi.upsert({ username: 'C', wins: 2, xp: 20, level: 1, gamesPlayed: 3, lastPlayed: 3, points: 0 })
    const all = leaderboardApi.getAll()
    expect(all.map((e) => e.username)).toEqual(['B', 'C', 'A'])
  })

  it('upsert aynı username günceller', () => {
    leaderboardApi.upsert({ username: 'A', wins: 1, xp: 10, level: 1, gamesPlayed: 2, lastPlayed: 1, points: 0 })
    leaderboardApi.upsert({ username: 'A', wins: 5, xp: 60, level: 3, gamesPlayed: 6, lastPlayed: 2, points: 0 })
    const all = leaderboardApi.getAll()
    expect(all).toHaveLength(1)
    expect(all[0]!.wins).toBe(5)
  })
})
