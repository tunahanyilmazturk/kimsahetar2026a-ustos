import { describe, it, expect, beforeEach } from 'vitest'
import { applyGameResult, REWARDS } from '../lib/scoreSystem'
import { profileApi, statsApi } from '../lib/profileApi'
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
    expect(profileApi.get().coins).toBe(100 + expectedCoins)
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
    expect(profileApi.get().coins).toBe(100) // değişmedi
    expect(statsApi.get().gamesPlayed).toBe(0)
  })
})
