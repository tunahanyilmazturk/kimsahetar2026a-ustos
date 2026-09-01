import { describe, it, expect, beforeEach } from 'vitest'
import { profileApi, statsApi, inventoryApi, leaderboardApi, levelFromXp, STARTING_COINS } from '../lib/profileApi'
import { STARTER_AVATARS } from '../config/customShopAvatars'

describe('levelFromXp', () => {
  it('xp 0 → level 1', () => expect(levelFromXp(0)).toBe(1))
  it('xp 99 → level 1', () => expect(levelFromXp(99)).toBe(1))
  it('xp 100 → level 2', () => expect(levelFromXp(100)).toBe(2))
  it('xp 250 → level 3', () => expect(levelFromXp(250)).toBe(3))
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
