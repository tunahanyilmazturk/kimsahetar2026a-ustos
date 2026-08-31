import { storage, STORAGE_KEYS } from './storage'
import { DAILY_QUEST_MAP, DAILY_QUESTS } from '../config/dailyQuests'
import type { QuestState, QuestProgress, DailyQuest } from '../types'

/** Bugünün tarihini YYYY-MM-DD formatında döndürür. */
export function today(): string {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function emptyProgress(): Record<string, QuestProgress> {
  const quests: Record<string, QuestProgress> = {}
  for (const q of DAILY_QUESTS) {
    quests[q.id] = { progress: 0, completed: false, claimed: false }
  }
  return quests
}

function freshState(): QuestState {
  return { date: today(), quests: emptyProgress() }
}

export const questsApi = {
  /** Günlük görev durumunu döndürür; tarih farklıysa resetler. */
  get(): QuestState {
    const state = storage.get<QuestState | null>(STORAGE_KEYS.QUESTS, null)
    if (!state || state.date !== today()) {
      const fresh = freshState()
      storage.set(STORAGE_KEYS.QUESTS, fresh)
      return fresh
    }
    return state
  },

  /** Bir metrik için ilerlemeyi artırır (ör. oyun oynandı → gamesPlayed +1). */
  addProgress(metric: DailyQuest['metric'], amount = 1): QuestState {
    const state = this.get()
    for (const q of DAILY_QUESTS) {
      if (q.metric !== metric) continue
      const cur = state.quests[q.id] ?? { progress: 0, completed: false, claimed: false }
      const progress = Math.min(q.goal, cur.progress + amount)
      const completed = progress >= q.goal
      state.quests[q.id] = { progress, completed: completed || cur.completed, claimed: cur.claimed }
    }
    storage.set(STORAGE_KEYS.QUESTS, state)
    return state
  },

  /** Bir görevin ödülünü talep et (completed & !claimed ise). */
  claim(questId: string): { ok: boolean; reward?: { coins: number; xp: number }; reason?: string } {
    const state = this.get()
    const quest = DAILY_QUEST_MAP[questId]
    const prog = state.quests[questId]
    if (!quest || !prog) return { ok: false, reason: 'Görev bulunamadı' }
    if (!prog.completed) return { ok: false, reason: 'Görev tamamlanmadı' }
    if (prog.claimed) return { ok: false, reason: 'Ödül zaten alındı' }

    state.quests[questId] = { ...prog, claimed: true }
    storage.set(STORAGE_KEYS.QUESTS, state)
    return { ok: true, reward: { coins: quest.rewardCoins, xp: quest.rewardXp } }
  },

  /** Tüm talep edilebilir görevlerin ödülünü tek seferde al. */
  claimAll(): { coins: number; xp: number; claimed: string[] } {
    const state = this.get()
    let coins = 0
    let xp = 0
    const claimed: string[] = []
    for (const q of DAILY_QUESTS) {
      const prog = state.quests[q.id]
      if (prog?.completed && !prog.claimed) {
        state.quests[q.id] = { ...prog, claimed: true }
        coins += q.rewardCoins
        xp += q.rewardXp
        claimed.push(q.id)
      }
    }
    if (claimed.length > 0) storage.set(STORAGE_KEYS.QUESTS, state)
    return { coins, xp, claimed }
  },

  reset(): void {
    storage.set(STORAGE_KEYS.QUESTS, freshState())
  },
}
