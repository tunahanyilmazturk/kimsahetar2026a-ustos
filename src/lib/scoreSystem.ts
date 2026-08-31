import type { Winner, Player } from '../types'
import { profileApi, statsApi, leaderboardApi } from './profileApi'
import { questsApi } from './questsApi'

// ─── Sabitler ────────────────────────────────────────────────────────────────

/** Oyun sonunda dağıtılan temel ödüller. */
export const REWARDS = {
  WIN_AS_PLAYER: { xp: 50, coins: 30 },
  WIN_AS_IMPOSTOR: { xp: 70, coins: 40 },
  LOSE: { xp: 10, coins: 5 },
  IMPOSTOR_GUESS_BONUS: { xp: 30, coins: 20 }, // sahtekar kelimeyi doğru tahmin ederse ek
  CATCH_IMPOSTOR_BONUS: { xp: 30, coins: 20 }, // sahtekar yakalanırsa yakalayana ek
} as const

export interface ScoreResult {
  xp: number
  coins: number
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

  if (won) {
    if (isImpostor) {
      xp += REWARDS.WIN_AS_IMPOSTOR.xp
      coins += REWARDS.WIN_AS_IMPOSTOR.coins
    } else {
      xp += REWARDS.WIN_AS_PLAYER.xp
      coins += REWARDS.WIN_AS_PLAYER.coins
      // Sahtekar yakalandıysa ek bonus (oyuncular kazandığında)
      xp += REWARDS.CATCH_IMPOSTOR_BONUS.xp
      coins += REWARDS.CATCH_IMPOSTOR_BONUS.coins
    }
  } else {
    xp += REWARDS.LOSE.xp
    coins += REWARDS.LOSE.coins
  }

  // Yerel profil oyuncusu ise kalıcı olarak yansıt
  if (isLocal) {
    profileApi.addCoins(coins)
    const { level: newLevel, leveledUp } = profileApi.addXp(xp)
    const stats = statsApi.recordGame({
      won,
      wonAsImpostor: won && isImpostor,
      wonAsPlayer: won && !isImpostor,
    })
    questsApi.addWeeklyProgress('gamesPlayed')
    if (won) questsApi.addWeeklyProgress('wins')
    if (won && !isImpostor) questsApi.addWeeklyProgress('winsAsPlayer')
    const profile = profileApi.get()
    leaderboardApi.upsert({
      playerId: profile.playerId,
      username: profile.username,
      wins: stats.wins,
      xp: profile.xp,
      level: newLevel,
      gamesPlayed: stats.gamesPlayed,
      lastPlayed: Date.now(),
    })
    return { xp, coins, leveledUp, newLevel, won, wonAsImpostor: won && isImpostor, wonAsPlayer: won && !isImpostor }
  }

  return { xp, coins, leveledUp: false, newLevel: 0, won, wonAsImpostor: won && isImpostor, wonAsPlayer: won && !isImpostor }
}
