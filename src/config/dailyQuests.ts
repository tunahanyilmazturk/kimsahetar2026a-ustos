import type { DailyQuest } from '../types'

/**
 * Günlük görevler — her gün (date farkı ile) resetlenir.
 * `metric` alanı, oyun sonunda hangi event'in ilerlemeyi artıracağını belirtir.
 * Ödüller: coin + XP.
 */
export const DAILY_QUESTS: DailyQuest[] = [
  {
    id: 'daily_play_1',
    title: 'Isınma Turu',
    emoji: '🎲',
    desc: 'Bugün 1 oyun oyna.',
    goal: 1,
    metric: 'gamesPlayed',
    rewardCoins: 20,
    rewardXp: 15,
  },
  {
    id: 'daily_play_3',
    title: 'Aktif Oyuncu',
    emoji: '🎯',
    desc: 'Bugün 3 oyun oyna.',
    goal: 3,
    metric: 'gamesPlayed',
    rewardCoins: 50,
    rewardXp: 40,
  },
  {
    id: 'daily_win_1',
    title: 'Günün Galibi',
    emoji: '🏆',
    desc: 'Bugün 1 kez kazan.',
    goal: 1,
    metric: 'wins',
    rewardCoins: 60,
    rewardXp: 50,
  },
  {
    id: 'daily_impostor_1',
    title: 'Sahtekarlık',
    emoji: '🎭',
    desc: 'Bugün sahtekar olarak 1 kez kazan.',
    goal: 1,
    metric: 'winsAsImpostor',
    rewardCoins: 80,
    rewardXp: 70,
  },
  {
    id: 'daily_detective_1',
    title: 'Köşeyi Dön',
    emoji: '🔍',
    desc: 'Bugün sahtekarı 1 kez yakala.',
    goal: 1,
    metric: 'winsAsPlayer',
    rewardCoins: 80,
    rewardXp: 70,
  },
  { id: 'daily_play_5', title: 'Görev Maratonu', emoji: '🚀', desc: 'Bugün 5 oyun oyna.', goal: 5, metric: 'gamesPlayed', rewardCoins: 120, rewardXp: 100 },
  { id: 'daily_win_3', title: 'Seri Galibiyet', emoji: '⚡', desc: 'Bugün 3 kez kazan.', goal: 3, metric: 'wins', rewardCoins: 150, rewardXp: 120 },
  { id: 'daily_detective_3', title: 'İz Sürücü', emoji: '🧭', desc: 'Bugün sahtekârı 3 kez yakala.', goal: 3, metric: 'winsAsPlayer', rewardCoins: 180, rewardXp: 150 },
]

/** ID -> DailyQuest eşlemesi. */
export const DAILY_QUEST_MAP: Record<string, DailyQuest> = Object.fromEntries(
  DAILY_QUESTS.map((q) => [q.id, q]),
)

export const WEEKLY_QUESTS: DailyQuest[] = [
  { id: 'weekly_games_10', title: 'Haftalık Maraton', emoji: '🏃', desc: 'Bu hafta 10 oyun tamamla.', goal: 10, metric: 'gamesPlayed', rewardCoins: 250, rewardXp: 180 },
  { id: 'weekly_wins_5', title: 'İstikrarlı Galibiyet', emoji: '🏅', desc: 'Bu hafta 5 oyun kazan.', goal: 5, metric: 'wins', rewardCoins: 350, rewardXp: 260 },
  { id: 'weekly_detective_3', title: 'Usta Dedektif', emoji: '🕵️', desc: 'Bu hafta 3 sahtekâr yakala.', goal: 3, metric: 'winsAsPlayer', rewardCoins: 400, rewardXp: 300 },
]
export const WEEKLY_QUEST_MAP: Record<string, DailyQuest> = Object.fromEntries(WEEKLY_QUESTS.map((q) => [q.id, q]))
