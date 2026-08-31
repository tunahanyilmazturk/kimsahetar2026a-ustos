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
]

/** ID -> DailyQuest eşlemesi. */
export const DAILY_QUEST_MAP: Record<string, DailyQuest> = Object.fromEntries(
  DAILY_QUESTS.map((q) => [q.id, q]),
)
