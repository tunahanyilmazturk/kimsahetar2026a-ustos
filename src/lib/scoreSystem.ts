import type { Winner, Player } from '../types'
import { profileApi, statsApi, leaderboardApi } from './profileApi'
import { questsApi } from './questsApi'

// ─── Sabitler ────────────────────────────────────────────────────────────────

/** Oyun sonunda dağıtılan temel ödüller. */
export const REWARDS = {
  WIN_AS_PLAYER: { xp: 50, coins: 30, points: 100 },
  WIN_AS_IMPOSTOR: { xp: 70, coins: 40, points: 150 },
  LOSE: { xp: 10, coins: 5, points: 15 },
  IMPOSTOR_GUESS_BONUS: { xp: 30, coins: 20, points: 50 }, // sahtekar kelimeyi doğru tahmin ederse ek
  CATCH_IMPOSTOR_BONUS: { xp: 30, coins: 20, points: 50 }, // sahtekar yakalanırsa yakalayana ek
  STREAK_BONUS: { points: 10 }, // her 3 üst üste galibiyette +10 puan
} as const

export interface ScoreResult {
  xp: number
  coins: number
  points: number
  leveledUp: boolean
  newLevel: number
  /** Oyuncunun kazanıp kazanmadığı (oyun sonunda stats için). */
  won: boolean
  wonAsImpostor: boolean
  wonAsPlayer: boolean
}

// ─── Hesaplama ───────────────────────────────────────────────────────────────

/**
 * Bir oyuncu için oyun sonu skorunu hesaplar ve profile/stats'a yansıtır.
 *
 * @param player Oyuncu (yerel profil oyuncusu mu, yoksa misafir mi `isLocal` ile belirtilir)
 * @param winner Oyunun kazanan tarafı
 * @param impostorId Sahtekarın ID'si
 * @param isLocal Bu oyuncu yerel profil mi (true ise profile/stats güncellenir)
 */
export function applyGameResult(args: {
  player: Player
  winner: Winner
  impostorId: string | null
  isLocal: boolean
}): ScoreResult {
  const { player, winner, impostorId, isLocal } = args
  const isImpostor = impostorId === player.id
  const playerWon = winner === 'PLAYERS'
  const impostorWon = winner === 'IMPOSTOR'
  const won = (isImpostor && impostorWon) || (!isImpostor && playerWon)

  let xp = 0
  let coins = 0
  let points = 0

  if (won) {
    if (isImpostor) {
      xp += REWARDS.WIN_AS_IMPOSTOR.xp
      coins += REWARDS.WIN_AS_IMPOSTOR.coins
      points += REWARDS.WIN_AS_IMPOSTOR.points
    } else {
      xp += REWARDS.WIN_AS_PLAYER.xp
      coins += REWARDS.WIN_AS_PLAYER.coins
      points += REWARDS.WIN_AS_PLAYER.points
      // Sahtekar yakalandıysa ek bonus (oyuncular kazandığında)
      xp += REWARDS.CATCH_IMPOSTOR_BONUS.xp
      coins += REWARDS.CATCH_IMPOSTOR_BONUS.coins
      points += REWARDS.CATCH_IMPOSTOR_BONUS.points
    }
  } else {
    xp += REWARDS.LOSE.xp
    coins += REWARDS.LOSE.coins
    points += REWARDS.LOSE.points
  }

  // Yerel profil oyuncusu ise kalıcı olarak yansıt
  if (isLocal) {
    profileApi.addCoins(coins)
    const { level: newLevel, leveledUp } = profileApi.addXp(xp)
    const stats = statsApi.recordGame({
      won,
      wonAsImpostor: won && isImpostor,
      wonAsPlayer: won && !isImpostor,
      points,
    })
    // Üst üste galibiyet bonusu (her 3 galibiyette +10 puan)
    if (won && stats.streak > 0 && stats.streak % 3 === 0) {
      statsApi.addPoints(REWARDS.STREAK_BONUS.points)
    }
    questsApi.addWeeklyProgress('gamesPlayed')
    if (won) questsApi.addWeeklyProgress('wins')
    if (won && !isImpostor) questsApi.addWeeklyProgress('winsAsPlayer')
    const profile = profileApi.get()
    const finalStats = statsApi.get()
    leaderboardApi.upsert({
      playerId: profile.playerId,
      username: profile.username,
      avatar: profile.avatar,
      wins: finalStats.wins,
      winsAsImpostor: finalStats.winsAsImpostor,
      winsAsPlayer: finalStats.winsAsPlayer,
      points: finalStats.points,
      xp: profile.xp,
      level: newLevel,
      gamesPlayed: finalStats.gamesPlayed,
      streak: finalStats.streak,
      bestStreak: finalStats.bestStreak,
      lastPlayed: Date.now(),
    })
    return { xp, coins, points, leveledUp, newLevel, won, wonAsImpostor: won && isImpostor, wonAsPlayer: won && !isImpostor }
  }

  return { xp, coins, points, leveledUp: false, newLevel: 0, won, wonAsImpostor: won && isImpostor, wonAsPlayer: won && !isImpostor }
}
