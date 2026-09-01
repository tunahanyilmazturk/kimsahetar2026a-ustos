import { describe, it, expect, beforeEach } from 'vitest'
import { applyGameResult, REWARDS } from '../lib/scoreSystem'
import { profileApi, statsApi, leaderboardApi, XP_PER_LEVEL, STARTING_COINS } from '../lib/profileApi'
import type { Player } from '../types'

function makePlayer(id: string, name: string): Player {
  return { id, name, avatar: 'avatar_default', score: 0, isReady: true, isBot: false }
}

describe('applyGameResult', () => {
  beforeEach(() => window.localStorage.clear())

  it('oyuncu kazanırsa (sahtekar değil) win bonus + catch bonus alır', () => {
    const player = makePlayer('p1', 'Ahmet')
    const r = applyGameResult({ player, winner: 'PLAYERS', impostorId: 'p2', isLocal: true })
    expect(r.won).toBe(true)
    expect(r.wonAsPlayer).toBe(true)
    expect(r.wonAsImpostor).toBe(false)
    const expectedXp = REWARDS.WIN_AS_PLAYER.xp + REWARDS.CATCH_IMPOSTOR_BONUS.xp
    const expectedCoins = REWARDS.WIN_AS_PLAYER.coins + REWARDS.CATCH_IMPOSTOR_BONUS.coins
    expect(r.xp).toBe(expectedXp)
    expect(r.coins).toBe(expectedCoins)
    expect(profileApi.get().coins).toBe(STARTING_COINS + expectedCoins)
    expect(statsApi.get().wins).toBe(1)
    expect(statsApi.get().winsAsPlayer).toBe(1)
  })

  it('sahtekar kazanırsa impostor bonus alır', () => {
    const player = makePlayer('p1', 'Sahtekar')
    const r = applyGameResult({ player, winner: 'IMPOSTOR', impostorId: 'p1', isLocal: true })
    expect(r.won).toBe(true)
    expect(r.wonAsImpostor).toBe(true)
    expect(r.xp).toBe(REWARDS.WIN_AS_IMPOSTOR.xp)
    expect(statsApi.get().winsAsImpostor).toBe(1)
  })

  it('kaybeden oyuncu lose ödülü alır', () => {
    const player = makePlayer('p1', 'Ahmet')
    const r = applyGameResult({ player, winner: 'IMPOSTOR', impostorId: 'p2', isLocal: true })
    expect(r.won).toBe(false)
    expect(r.xp).toBe(REWARDS.LOSE.xp)
    expect(statsApi.get().wins).toBe(0)
    expect(statsApi.get().gamesPlayed).toBe(1)
  })

  it('isLocal=false profile/stats güncellemez', () => {
    const player = makePlayer('p1', 'Bot')
    const r = applyGameResult({ player, winner: 'PLAYERS', impostorId: 'p2', isLocal: false })
    expect(r.newLevel).toBe(0)
    expect(profileApi.get().coins).toBe(STARTING_COINS) // değişmedi
    expect(statsApi.get().gamesPlayed).toBe(0)
  })
})

// ─── Genişletilmiş scoreSystem testleri ────────────────────────────────────────

describe('applyGameResult — genişletilmiş', () => {
  beforeEach(() => window.localStorage.clear())

  it('leaderboard oyun sonunda güncellenir', () => {
    const player = makePlayer('p1', 'Ahmet')
    applyGameResult({ player, winner: 'PLAYERS', impostorId: 'p2', isLocal: true })
    const lb = leaderboardApi.getAll()
    expect(lb).toHaveLength(1)
    expect(lb[0]!.username).toBe('Oyuncu')
    expect(lb[0]!.wins).toBe(1)
    expect(lb[0]!.gamesPlayed).toBe(1)
  })

  it('leaderboard aynı oyuncu için update eder (yeni entry eklemez)', () => {
    const player = makePlayer('p1', 'Ahmet')
    applyGameResult({ player, winner: 'PLAYERS', impostorId: 'p2', isLocal: true })
    applyGameResult({ player, winner: 'PLAYERS', impostorId: 'p2', isLocal: true })
    const lb = leaderboardApi.getAll()
    expect(lb).toHaveLength(1)
    expect(lb[0]!.wins).toBe(2)
    expect(lb[0]!.gamesPlayed).toBe(2)
  })

  it('çoklu seviye atlama — tek oyunda 2+ level', () => {
    const player = makePlayer('p1', 'Ahmet')
    // 90 XP ekle ki 10 XP ile level 2'ye geçsin
    profileApi.addXp(XP_PER_LEVEL - 10)
    expect(profileApi.get().level).toBe(1)
    // 80 XP'lik galibiyet (WIN_AS_PLAYER 50 + CATCH 30) → 90+80=170 XP → level 2 (100'den)
    const r = applyGameResult({ player, winner: 'PLAYERS', impostorId: 'p2', isLocal: true })
    expect(profileApi.get().level).toBe(2)
    expect(r.leveledUp).toBe(true)
    expect(r.newLevel).toBe(2)
  })

  it('coin birikimi — birden fazla oyun sonunda toplam coin', () => {
    const player = makePlayer('p1', 'Ahmet')
    // 3 galibiyet: her biri 50 coin (30+20)
    applyGameResult({ player, winner: 'PLAYERS', impostorId: 'p2', isLocal: true })
    applyGameResult({ player, winner: 'PLAYERS', impostorId: 'p2', isLocal: true })
    applyGameResult({ player, winner: 'PLAYERS', impostorId: 'p2', isLocal: true })
    const expectedCoins = STARTING_COINS + 3 * (REWARDS.WIN_AS_PLAYER.coins + REWARDS.CATCH_IMPOSTOR_BONUS.coins)
    expect(profileApi.get().coins).toBe(expectedCoins)
  })

  it('impostor galibiyet serisi — winsAsImpostor artar', () => {
    const player = makePlayer('p1', 'Sahtekar')
    applyGameResult({ player, winner: 'IMPOSTOR', impostorId: 'p1', isLocal: true })
    applyGameResult({ player, winner: 'IMPOSTOR', impostorId: 'p1', isLocal: true })
    const stats = statsApi.get()
    expect(stats.wins).toBe(2)
    expect(stats.winsAsImpostor).toBe(2)
    expect(stats.winsAsPlayer).toBe(0)
    expect(stats.streak).toBe(2)
  })

  it('kayıp sonrası coin azalmaz (lose coin ekler)', () => {
    const player = makePlayer('p1', 'Ahmet')
    const beforeCoins = profileApi.get().coins
    applyGameResult({ player, winner: 'IMPOSTOR', impostorId: 'p2', isLocal: true })
    expect(profileApi.get().coins).toBe(beforeCoins + REWARDS.LOSE.coins)
  })

  it('XP hiç negatif olmaz (addXp clamping)', () => {
    profileApi.addXp(-1000)
    expect(profileApi.get().xp).toBe(0)
    expect(profileApi.get().level).toBe(1)
  })

  it('coin negatif olamaz (addCoins false döner)', () => {
    expect(profileApi.addCoins(-1000)).toBe(false)
    expect(profileApi.get().coins).toBe(STARTING_COINS)
  })

  it('statsApi.recordGame direkt — galibiyet', () => {
    statsApi.recordGame({ won: true, wonAsImpostor: false, wonAsPlayer: true, points: 100 })
    const stats = statsApi.get()
    expect(stats.gamesPlayed).toBe(1)
    expect(stats.wins).toBe(1)
    expect(stats.winsAsPlayer).toBe(1)
    expect(stats.streak).toBe(1)
    expect(stats.bestStreak).toBe(1)
  })

  it('statsApi.recordGame direkt — mağlubiyet streak sıfırlar', () => {
    statsApi.recordGame({ won: true, wonAsImpostor: false, wonAsPlayer: true, points: 100 })
    statsApi.recordGame({ won: true, wonAsImpostor: false, wonAsPlayer: true, points: 100 })
    statsApi.recordGame({ won: false, wonAsImpostor: false, wonAsPlayer: false, points: 15 })
    const stats = statsApi.get()
    expect(stats.streak).toBe(0)
    expect(stats.bestStreak).toBe(2)
    expect(stats.wins).toBe(2)
    expect(stats.gamesPlayed).toBe(3)
  })

  it('REWARDS sabitleri beklenen değerlerde', () => {
    expect(REWARDS.WIN_AS_PLAYER).toEqual({ xp: 50, coins: 30, points: 100 })
    expect(REWARDS.WIN_AS_IMPOSTOR).toEqual({ xp: 70, coins: 40, points: 150 })
    expect(REWARDS.LOSE).toEqual({ xp: 10, coins: 5, points: 15 })
    expect(REWARDS.CATCH_IMPOSTOR_BONUS).toEqual({ xp: 30, coins: 20, points: 50 })
    expect(REWARDS.IMPOSTOR_GUESS_BONUS).toEqual({ xp: 30, coins: 20, points: 50 })
  })

  it('sahtekar galibiyeti — catch bonus almaz (sadece WIN_AS_IMPOSTOR)', () => {
    const player = makePlayer('p1', 'Sahtekar')
    const r = applyGameResult({ player, winner: 'IMPOSTOR', impostorId: 'p1', isLocal: true })
    expect(r.xp).toBe(REWARDS.WIN_AS_IMPOSTOR.xp)
    expect(r.coins).toBe(REWARDS.WIN_AS_IMPOSTOR.coins)
    // Catch bonus sadece oyuncular kazandığında
    expect(r.xp).not.toBe(REWARDS.WIN_AS_IMPOSTOR.xp + REWARDS.CATCH_IMPOSTOR_BONUS.xp)
  })

  it('oyuncu galibiyeti — impostor bonus almaz (sadece WIN_AS_PLAYER + CATCH)', () => {
    const player = makePlayer('p1', 'Ahmet')
    const r = applyGameResult({ player, winner: 'PLAYERS', impostorId: 'p2', isLocal: true })
    expect(r.xp).toBe(REWARDS.WIN_AS_PLAYER.xp + REWARDS.CATCH_IMPOSTOR_BONUS.xp)
    expect(r.xp).not.toBe(REWARDS.WIN_AS_IMPOSTOR.xp)
  })
})
