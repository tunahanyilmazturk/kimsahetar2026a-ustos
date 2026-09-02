import { storage, STORAGE_KEYS } from './storage'
import { supabase } from './supabase'
import { DAILY_QUEST_MAP, DAILY_QUESTS, MONTHLY_QUEST_MAP, MONTHLY_QUESTS, WEEKLY_QUEST_MAP, WEEKLY_QUESTS } from '../config/dailyQuests'
import type { QuestState, QuestProgress, DailyQuest } from '../types'

/** Bugünün tarihini YYYY-MM-DD formatında döndürür. */
export function today(): string {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}
function weekKey(): string { const d = new Date(); const first = new Date(d.getFullYear(), 0, 1); return `${d.getFullYear()}-${Math.ceil((((d.getTime() - first.getTime()) / 86400000) + first.getDay() + 1) / 7)}` }
function monthKey(): string { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` }

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
    void this.syncDailyToSupabase(state)
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
    void this.syncDailyToSupabase(state)
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
    if (claimed.length > 0) {
      storage.set(STORAGE_KEYS.QUESTS, state)
      void this.syncDailyToSupabase(state)
    }
    return { coins, xp, claimed }
  },

  reset(): void {
    storage.set(STORAGE_KEYS.QUESTS, freshState())
  },
  getWeekly(): QuestState {
    const state = storage.get<QuestState | null>(STORAGE_KEYS.WEEKLY_QUESTS, null)
    if (!state || state.date !== weekKey()) { const fresh: QuestState = { date: weekKey(), quests: Object.fromEntries(WEEKLY_QUESTS.map((q) => [q.id, { progress: 0, completed: false, claimed: false }])) }; storage.set(STORAGE_KEYS.WEEKLY_QUESTS, fresh); return fresh }
    return state
  },
  addWeeklyProgress(metric: DailyQuest['metric'], amount = 1): QuestState {
    const state = this.getWeekly(); for (const q of WEEKLY_QUESTS) { if (q.metric !== metric) continue; const cur = state.quests[q.id]!; const progress = Math.min(q.goal, cur.progress + amount); state.quests[q.id] = { ...cur, progress, completed: progress >= q.goal || cur.completed } } storage.set(STORAGE_KEYS.WEEKLY_QUESTS, state); void this.syncWeeklyToSupabase(state); return state
  },
  claimWeekly(id: string): { ok: boolean; reward?: { coins: number; xp: number }; reason?: string } { const state = this.getWeekly(); const q = WEEKLY_QUEST_MAP[id]; const p = state.quests[id]; if (!q || !p) return { ok: false, reason: 'Görev bulunamadı' }; if (!p.completed || p.claimed) return { ok: false, reason: p.claimed ? 'Ödül zaten alındı' : 'Görev tamamlanmadı' }; state.quests[id] = { ...p, claimed: true }; storage.set(STORAGE_KEYS.WEEKLY_QUESTS, state); void this.syncWeeklyToSupabase(state); return { ok: true, reward: { coins: q.rewardCoins, xp: q.rewardXp } }
  },
  getMonthly(): QuestState {
    const state = storage.get<QuestState | null>(STORAGE_KEYS.MONTHLY_QUESTS, null)
    if (!state || state.date !== monthKey()) { const fresh: QuestState = { date: monthKey(), quests: Object.fromEntries(MONTHLY_QUESTS.map((q) => [q.id, { progress: 0, completed: false, claimed: false }])) }; storage.set(STORAGE_KEYS.MONTHLY_QUESTS, fresh); return fresh }
    return state
  },
  addMonthlyProgress(metric: DailyQuest['metric'], amount = 1): QuestState {
    const state = this.getMonthly(); for (const q of MONTHLY_QUESTS) { if (q.metric !== metric) continue; const cur = state.quests[q.id] ?? { progress: 0, completed: false, claimed: false }; const progress = Math.min(q.goal, cur.progress + amount); state.quests[q.id] = { ...cur, progress, completed: progress >= q.goal || cur.completed } } storage.set(STORAGE_KEYS.MONTHLY_QUESTS, state); return state
  },
  claimMonthly(id: string): { ok: boolean; reward?: { coins: number; xp: number }; reason?: string } { const state = this.getMonthly(); const q = MONTHLY_QUEST_MAP[id]; const p = state.quests[id]; if (!q || !p) return { ok: false, reason: 'Görev bulunamadı' }; if (!p.completed || p.claimed) return { ok: false, reason: p.claimed ? 'Ödül zaten alındı' : 'Görev tamamlanmadı' }; state.quests[id] = { ...p, claimed: true }; storage.set(STORAGE_KEYS.MONTHLY_QUESTS, state); return { ok: true, reward: { coins: q.rewardCoins, xp: q.rewardXp } }
  },

  /** Supabase'den günlük görevleri çek (login sonrası). */
  async syncDailyFromSupabase(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const date = today()
    const { data } = await supabase
      .from('daily_quests')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', date)

    if (!data || data.length === 0) return

    const quests: Record<string, QuestProgress> = emptyProgress()
    for (const row of data) {
      quests[row.quest_id] = {
        progress: row.progress,
        completed: row.completed,
        claimed: row.claimed,
      }
    }
    storage.set(STORAGE_KEYS.QUESTS, { date, quests })
  },

  /** Günlük görev değişikliğini Supabase'e yaz. */
  async syncDailyToSupabase(state: QuestState): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const rows = Object.entries(state.quests).map(([questId, prog]) => ({
      user_id: user.id,
      quest_id: questId,
      date: state.date,
      progress: prog.progress,
      completed: prog.completed,
      claimed: prog.claimed,
    }))

    await supabase.from('daily_quests').upsert(rows, { onConflict: 'user_id,quest_id,date' })
  },

  /** Supabase'den haftalık görevleri çek (login sonrası). */
  async syncWeeklyFromSupabase(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const week = weekKey()
    const { data } = await supabase
      .from('weekly_quests')
      .select('*')
      .eq('user_id', user.id)
      .eq('week_key', week)

    if (!data || data.length === 0) return

    const quests: Record<string, QuestProgress> = Object.fromEntries(
      WEEKLY_QUESTS.map((q) => [q.id, { progress: 0, completed: false, claimed: false }]),
    )
    for (const row of data) {
      quests[row.quest_id] = {
        progress: row.progress,
        completed: row.completed,
        claimed: row.claimed,
      }
    }
    storage.set(STORAGE_KEYS.WEEKLY_QUESTS, { date: week, quests })
  },

  /** Haftalık görev değişikliğini Supabase'e yaz. */
  async syncWeeklyToSupabase(state: QuestState): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const rows = Object.entries(state.quests).map(([questId, prog]) => ({
      user_id: user.id,
      quest_id: questId,
      week_key: state.date,
      progress: prog.progress,
      completed: prog.completed,
      claimed: prog.claimed,
    }))

    await supabase.from('weekly_quests').upsert(rows, { onConflict: 'user_id,quest_id,week_key' })
  },
}
