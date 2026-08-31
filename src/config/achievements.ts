import type { Achievement } from '../types'

/**
 * Başarım rozetleri — unlock koşulları stat bazlı.
 * `achievementsApi` her oyun sonunda `Stats`'ı kontrol eder.
 */
export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_game',
    title: 'İlk Adım',
    emoji: '🎮',
    desc: 'İlk oyununu oyna.',
    condition: { stat: 'gamesPlayed', op: '>=', value: 1 },
  },
  {
    id: 'ten_games',
    title: 'Alışkanlık',
    emoji: '🎯',
    desc: '10 oyun oyna.',
    condition: { stat: 'gamesPlayed', op: '>=', value: 10 },
  },
  {
    id: 'fifty_games',
    title: 'Doyumsuz',
    emoji: '🔥',
    desc: '50 oyun oyna.',
    condition: { stat: 'gamesPlayed', op: '>=', value: 50 },
  },
  {
    id: 'first_win',
    title: 'İlk Zafer',
    emoji: '🏆',
    desc: 'İlk galibiyetini al.',
    condition: { stat: 'wins', op: '>=', value: 1 },
  },
  {
    id: 'ten_wins',
    title: 'Şampiyon',
    emoji: '🥇',
    desc: '10 galibiyet al.',
    condition: { stat: 'wins', op: '>=', value: 10 },
  },
  {
    id: 'impostor_master',
    title: 'Sahtekar Ustası',
    emoji: '🎭',
    desc: 'Sahtekar olarak 5 kez kazan.',
    condition: { stat: 'winsAsImpostor', op: '>=', value: 5 },
  },
  {
    id: 'detective',
    title: 'Dedektif',
    emoji: '🔍',
    desc: 'Sahtekarı 10 kez yakala.',
    condition: { stat: 'winsAsPlayer', op: '>=', value: 10 },
  },
  {
    id: 'streak_3',
    title: 'Üst Üste Üç',
    emoji: '⚡',
    desc: '3 oyun üst üste kazan.',
    condition: { stat: 'streak', op: '>=', value: 3 },
  },
  {
    id: 'streak_5',
    title: 'Yenilmez',
    emoji: '💫',
    desc: '5 oyun üst üste kazan.',
    condition: { stat: 'bestStreak', op: '>=', value: 5 },
  },
]

/** ID -> Achievement eşlemesi (hızlı erişim). */
export const ACHIEVEMENT_MAP: Record<string, Achievement> = Object.fromEntries(
  ACHIEVEMENTS.map((a) => [a.id, a]),
)
