import { describe, it, expect, beforeEach } from 'vitest'
import { questsApi, today } from '../lib/questsApi'
import { DAILY_QUESTS } from '../config/dailyQuests'

describe('questsApi', () => {
  beforeEach(() => window.localStorage.clear())

  it('today YYYY-MM-DD formatında', () => {
    expect(today()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('ilk erişimde tüm görevler 0 ilerleme', () => {
    const state = questsApi.get()
    expect(state.date).toBe(today())
    for (const q of DAILY_QUESTS) {
      expect(state.quests[q.id]).toEqual({ progress: 0, completed: false, claimed: false })
    }
  })

  it('addProgress ilgili metric görevlerini artırır', () => {
    questsApi.addProgress('gamesPlayed', 1)
    const state = questsApi.get()
    const play1 = state.quests['daily_play_1']!
    expect(play1.progress).toBe(1)
    expect(play1.completed).toBe(true)
    const play3 = state.quests['daily_play_3']!
    expect(play3.progress).toBe(1)
    expect(play3.completed).toBe(false)
  })

  it('claim tamamlanmamış görevde false', () => {
    const r = questsApi.claim('daily_play_3')
    expect(r.ok).toBe(false)
  })

  it('claim completed görevde ödül verir ve tekrar claim false', () => {
    questsApi.addProgress('gamesPlayed', 1) // daily_play_1 tamamlanır
    const r = questsApi.claim('daily_play_1')
    expect(r.ok).toBe(true)
    expect(r.reward).toBeDefined()
    const r2 = questsApi.claim('daily_play_1')
    expect(r2.ok).toBe(false)
  })

  it('claimAll tüm tamamlanmış-claimlenmemiş görevleri alır', () => {
    questsApi.addProgress('gamesPlayed', 3) // play_1 ve play_3 tamamlanır
    const res = questsApi.claimAll()
    expect(res.claimed).toContain('daily_play_1')
    expect(res.claimed).toContain('daily_play_3')
    expect(res.coins).toBeGreaterThan(0)
    // tekrar claimAll boş döner
    const res2 = questsApi.claimAll()
    expect(res2.claimed).toHaveLength(0)
  })

  it('farklı tarihte reset olur', () => {
    questsApi.addProgress('gamesPlayed', 1)
    // tarihi geçmiş olarak manipüle et
    const state = questsApi.get()
    state.date = '2000-01-01'
    window.localStorage.setItem('sahtekar:quests', JSON.stringify(state))
    const fresh = questsApi.get()
    expect(fresh.date).toBe(today())
    expect(fresh.quests['daily_play_1']!.progress).toBe(0)
  })
})
