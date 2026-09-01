import { describe, it, expect, beforeEach } from 'vitest'
import { profileApi, statsApi, levelFromXp, xpForLevel, xpForLevelStart, xpToNextLevel, MAX_LEVEL } from '../lib/profileApi'
import { applyGameResult, REWARDS } from '../lib/scoreSystem'
import type { Player } from '../types'

function makePlayer(id: string, name: string): Player {
  return { id, name, avatar: 'avatar_default', score: 0, isReady: true, isBot: false }
}

// ═══════════════════════════════════════════════════════════════════════════
// PUAN SİSTEMİ TESTLERİ
// ═══════════════════════════════════════════════════════════════════════════

describe('Puan Sistemi', () => {
  beforeEach(() => window.localStorage.clear())

  it('oyuncu galibiyeti — 150 puan (100 galibiyet + 50 catch bonus)', () => {
    const player = makePlayer('p1', 'Oyuncu')
    const r = applyGameResult({ player, winner: 'PLAYERS', impostorId: 'p2', isLocal: true })
    expect(r.points).toBe(150) // 100 + 50
    expect(statsApi.get().points).toBe(150)
  })

  it('sahtekar galibiyeti — 150 puan (sadece galibiyet)', () => {
    const player = makePlayer('p1', 'Sahtekar')
    const r = applyGameResult({ player, winner: 'IMPOSTOR', impostorId: 'p1', isLocal: true })
    expect(r.points).toBe(150) // sadece WIN_AS_IMPOSTOR
    expect(statsApi.get().points).toBe(150)
  })

  it('mağlubiyet — 15 puan', () => {
    const player = makePlayer('p1', 'Oyuncu')
    const r = applyGameResult({ player, winner: 'IMPOSTOR', impostorId: 'p2', isLocal: true })
    expect(r.points).toBe(15)
    expect(statsApi.get().points).toBe(15)
  })

  it('çoklu oyun — puan birikir', () => {
    const player = makePlayer('p1', 'Oyuncu')
    applyGameResult({ player, winner: 'PLAYERS', impostorId: 'p2', isLocal: true }) // 150
    applyGameResult({ player, winner: 'IMPOSTOR', impostorId: 'p1', isLocal: true }) // 150
    applyGameResult({ player, winner: 'IMPOSTOR', impostorId: 'p2', isLocal: true }) // 15
    expect(statsApi.get().points).toBe(315) // 150 + 150 + 15
  })

  it('streak bonus — 3 üst üste galibiyette +10 puan', () => {
    const player = makePlayer('p1', 'Oyuncu')
    applyGameResult({ player, winner: 'PLAYERS', impostorId: 'p2', isLocal: true }) // 150, streak=1
    applyGameResult({ player, winner: 'PLAYERS', impostorId: 'p2', isLocal: true }) // 150, streak=2
    applyGameResult({ player, winner: 'PLAYERS', impostorId: 'p2', isLocal: true }) // 150, streak=3 → +10 bonus
    // 150 + 150 + 150 + 10 (streak bonus) = 460
    expect(statsApi.get().points).toBe(460)
    expect(statsApi.get().streak).toBe(3)
  })

  it('streak kırılırsa bonus verilmez', () => {
    const player = makePlayer('p1', 'Oyuncu')
    applyGameResult({ player, winner: 'PLAYERS', impostorId: 'p2', isLocal: true }) // 150, streak=1
    applyGameResult({ player, winner: 'PLAYERS', impostorId: 'p2', isLocal: true }) // 150, streak=2
    applyGameResult({ player, winner: 'IMPOSTOR', impostorId: 'p2', isLocal: true }) // 15, streak=0
    // 150 + 150 + 15 = 315 (streak bonus yok)
    expect(statsApi.get().points).toBe(315)
    expect(statsApi.get().streak).toBe(0)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// SEVİYE CAP TESTLERİ
// ═══════════════════════════════════════════════════════════════════════════

describe('Seviye Cap (MAX_LEVEL=100)', () => {
  beforeEach(() => window.localStorage.clear())

  it('MAX_LEVEL 100', () => expect(MAX_LEVEL).toBe(100))

  it('level 100 cap aşılamaz — levelFromXp', () => {
    expect(levelFromXp(28900)).toBe(100)
    expect(levelFromXp(50000)).toBe(100)
    expect(levelFromXp(999999)).toBe(100)
  })

  it('level 100 cap aşılamaz — addXp', () => {
    // 28900 XP = level 100
    profileApi.addXp(28900)
    expect(profileApi.get().level).toBe(100)
    expect(profileApi.get().xp).toBe(28900)

    // Daha fazla XP ekleyince cap'te kalır
    profileApi.addXp(5000)
    expect(profileApi.get().level).toBe(100)
    expect(profileApi.get().xp).toBe(28900) // cap'te birikmez
  })

  it('xpForLevel(100) = Infinity', () => {
    expect(xpForLevel(100)).toBe(Infinity)
  })

  it('xpToNextLevel(28900) = 0 (cap)', () => {
    expect(xpToNextLevel(28900)).toBe(0)
  })

  it('xpForLevelStart — tier başlangıçları', () => {
    expect(xpForLevelStart(1)).toBe(0)
    expect(xpForLevelStart(30)).toBe(2900)
    expect(xpForLevelStart(60)).toBe(8900)
    expect(xpForLevelStart(90)).toBe(20900)
    expect(xpForLevelStart(100)).toBe(28900)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// ADIM ADIM PROGRESYON TESTLERİ
// ═══════════════════════════════════════════════════════════════════════════

describe('Adım Adım Progresyon', () => {
  it('tier 1: 0-2899 XP → level 1-29 (100 XP/level)', () => {
    expect(levelFromXp(0)).toBe(1)
    expect(levelFromXp(99)).toBe(1)
    expect(levelFromXp(100)).toBe(2)
    expect(levelFromXp(2800)).toBe(29)
    expect(levelFromXp(2899)).toBe(29)
  })

  it('tier 2: 2900-8899 XP → level 30-59 (200 XP/level)', () => {
    expect(levelFromXp(2900)).toBe(30)
    expect(levelFromXp(3099)).toBe(30)
    expect(levelFromXp(3100)).toBe(31)
    expect(levelFromXp(8700)).toBe(59)
    expect(levelFromXp(8899)).toBe(59)
  })

  it('tier 3: 8900-20899 XP → level 60-89 (400 XP/level)', () => {
    expect(levelFromXp(8900)).toBe(60)
    expect(levelFromXp(9299)).toBe(60)
    expect(levelFromXp(9300)).toBe(61)
    expect(levelFromXp(20500)).toBe(89)
    expect(levelFromXp(20899)).toBe(89)
  })

  it('tier 4: 20900-28900 XP → level 90-100 (800 XP/level)', () => {
    expect(levelFromXp(20900)).toBe(90)
    expect(levelFromXp(21699)).toBe(90)
    expect(levelFromXp(21700)).toBe(91)
    expect(levelFromXp(28100)).toBe(99)
    expect(levelFromXp(28900)).toBe(100)
  })

  it('xpForLevel — her tier doğru XP ister', () => {
    expect(xpForLevel(1)).toBe(100)
    expect(xpForLevel(29)).toBe(100)
    expect(xpForLevel(30)).toBe(200)
    expect(xpForLevel(59)).toBe(200)
    expect(xpForLevel(60)).toBe(400)
    expect(xpForLevel(89)).toBe(400)
    expect(xpForLevel(90)).toBe(800)
    expect(xpForLevel(99)).toBe(800)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// STATS BÜTÜNLÜĞÜ TESTLERİ
// ═══════════════════════════════════════════════════════════════════════════

describe('Stats Bütünlüğü', () => {
  beforeEach(() => window.localStorage.clear())

  it('recordGame — points birikir', () => {
    statsApi.recordGame({ won: true, wonAsImpostor: false, wonAsPlayer: true, points: 100 })
    statsApi.recordGame({ won: true, wonAsImpostor: false, wonAsPlayer: true, points: 100 })
    statsApi.recordGame({ won: false, wonAsImpostor: false, wonAsPlayer: false, points: 15 })
    const stats = statsApi.get()
    expect(stats.points).toBe(215)
    expect(stats.gamesPlayed).toBe(3)
    expect(stats.wins).toBe(2)
  })

  it('addPoints — puan ekler (streak bonus)', () => {
    statsApi.recordGame({ won: true, wonAsImpostor: false, wonAsPlayer: true, points: 100 })
    statsApi.addPoints(10)
    expect(statsApi.get().points).toBe(110)
  })

  it('addPoints — negatif puan ekleme (minimum 0)', () => {
    statsApi.addPoints(-100)
    expect(statsApi.get().points).toBe(0)
  })

  it('defaultStats — points 0', () => {
    const stats = statsApi.get()
    expect(stats.points).toBe(0)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// PROFILE + STATS ETKİLEŞİMİ
// ═══════════════════════════════════════════════════════════════════════════

describe('Profile + Stats Etkileşimi', () => {
  beforeEach(() => window.localStorage.clear())

  it('oyun sonunda hem XP hem puan artar', () => {
    const player = makePlayer('p1', 'Oyuncu')
    const profileBefore = profileApi.get()
    const statsBefore = statsApi.get()

    applyGameResult({ player, winner: 'PLAYERS', impostorId: 'p2', isLocal: true })

    const profileAfter = profileApi.get()
    const statsAfter = statsApi.get()

    expect(profileAfter.xp).toBeGreaterThan(profileBefore.xp)
    expect(statsAfter.points).toBeGreaterThan(statsBefore.points)
    expect(statsAfter.gamesPlayed).toBe(statsBefore.gamesPlayed + 1)
  })

  it('level 100 de XP cap, puan devam eder', () => {
    // 28900 XP = level 100
    profileApi.addXp(28900)
    expect(profileApi.get().level).toBe(100)

    const player = makePlayer('p1', 'Oyuncu')
    applyGameResult({ player, winner: 'PLAYERS', impostorId: 'p2', isLocal: true })

    // XP cap'te kalır
    expect(profileApi.get().xp).toBe(28900)
    expect(profileApi.get().level).toBe(100)
    // Ama puan devam eder
    expect(statsApi.get().points).toBe(150)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// REWARDS SABİTLERİ
// ═══════════════════════════════════════════════════════════════════════════

describe('REWARDS Sabitleri', () => {
  it('WIN_AS_PLAYER: +50 XP, +30 coin, +100 puan', () => {
    expect(REWARDS.WIN_AS_PLAYER).toEqual({ xp: 50, coins: 30, points: 100 })
  })

  it('WIN_AS_IMPOSTOR: +70 XP, +40 coin, +150 puan', () => {
    expect(REWARDS.WIN_AS_IMPOSTOR).toEqual({ xp: 70, coins: 40, points: 150 })
  })

  it('LOSE: +10 XP, +5 coin, +15 puan', () => {
    expect(REWARDS.LOSE).toEqual({ xp: 10, coins: 5, points: 15 })
  })

  it('CATCH_IMPOSTOR_BONUS: +30 XP, +20 coin, +50 puan', () => {
    expect(REWARDS.CATCH_IMPOSTOR_BONUS).toEqual({ xp: 30, coins: 20, points: 50 })
  })

  it('STREAK_BONUS: +10 puan', () => {
    expect(REWARDS.STREAK_BONUS).toEqual({ points: 10 })
  })
})
