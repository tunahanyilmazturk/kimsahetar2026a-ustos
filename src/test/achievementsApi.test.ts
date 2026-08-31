import { describe, it, expect, beforeEach } from 'vitest'
import { achievementsApi } from '../lib/achievementsApi'
import { statsApi } from '../lib/profileApi'
import { ACHIEVEMENTS } from '../config/achievements'
import type { Stats } from '../types'

describe('achievementsApi', () => {
  beforeEach(() => window.localStorage.clear())

  it('başlangıçta hiç unlock yok', () => {
    expect(achievementsApi.get()).toEqual({})
    for (const a of ACHIEVEMENTS) {
      expect(achievementsApi.isUnlocked(a.id)).toBe(false)
    }
  })

  it('check stats karşılıyorsa unlock eder', () => {
    const stats: Stats = {
      gamesPlayed: 1,
      wins: 0,
      winsAsImpostor: 0,
      winsAsPlayer: 0,
      streak: 0,
      bestStreak: 0,
    }
    const unlocked = achievementsApi.check(stats)
    expect(unlocked).toContain('first_game')
    expect(achievementsApi.isUnlocked('first_game')).toBe(true)
  })

  it('check tekrar çağrılırsa aynı başarımı tekrar unlock etmez', () => {
    const stats: Stats = {
      gamesPlayed: 5,
      wins: 0,
      winsAsImpostor: 0,
      winsAsPlayer: 0,
      streak: 0,
      bestStreak: 0,
    }
    achievementsApi.check(stats)
    const second = achievementsApi.check(stats)
    expect(second).not.toContain('first_game')
  })

  it('real statsApi ile entegrasyon', () => {
    statsApi.recordGame({ won: true, wonAsImpostor: false, wonAsPlayer: true })
    const s = statsApi.get()
    const unlocked = achievementsApi.check(s)
    expect(unlocked).toContain('first_game')
    expect(unlocked).toContain('first_win')
  })

  it('impostor_master 5 sahtekar galibiyeti', () => {
    for (let i = 0; i < 5; i++) {
      statsApi.recordGame({ won: true, wonAsImpostor: true, wonAsPlayer: false })
    }
    const s = statsApi.get()
    const unlocked = achievementsApi.check(s)
    expect(unlocked).toContain('impostor_master')
  })
})
