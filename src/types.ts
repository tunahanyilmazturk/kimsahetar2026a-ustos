/**
 * Sahtekar Kim? — Tüm TypeScript tipleri.
 *
 * Bu sürüm backend'siz olduğundan yalnızca offline (aynı cihaz) tipleri tanımlıdır.
 * Online `Room` ve auth/user tipleri backend eklendiğinde buraya eklenecek.
 */

// ─── Genel ───────────────────────────────────────────────────────────────────

export type BotDifficulty = 'EASY' | 'SMART' | 'EXPERT'
export type WordDifficulty = 'EASY' | 'MEDIUM' | 'HARD' | 'MIXED'
export type FrameRarity = 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY'
export type Winner = 'IMPOSTOR' | 'PLAYERS'

// ─── Oyun Durumları ──────────────────────────────────────────────────────────

/** Online oyun için genel durum (ileride kullanılacak). */
export type GameState = 'LOBBY' | 'PLAYING' | 'VOTING' | 'FINISHED'

/** Offline (aynı cihaz) oyun durum makinesi. */
export type OfflineState = 'LOBBY' | 'REVEAL' | 'PLAYING' | 'VOTING' | 'FINISHED'

// ─── Oyuncu & Mesaj ──────────────────────────────────────────────────────────

export interface Player {
  id: string
  name: string
  avatar: string
  frame?: string | null
  score: number
  isReady: boolean
  isBot: boolean
  botDifficulty?: BotDifficulty
}

export interface ChatMessage {
  id: string
  playerId: string
  playerName: string
  text: string
  timestamp: number
  reactions?: Record<string, string[]> // emoji -> playerIds
}

// ─── Oyun Oturumu ────────────────────────────────────────────────────────────

export interface GameSettings {
  turnTimeLimit: number // saniye
  roundsBeforeVoting: number // oylama öncesi tur sayısı
  selectedCategories: string[]
  customWords: string[]
  botDifficulty: BotDifficulty
  wordDifficulty: WordDifficulty
  recentWords: string[] // tekrar önleme
  passUsed: Record<string, boolean>
}

export interface Award {
  title: string
  emoji: string
  desc: string
}

export interface GameSession {
  id: string
  hostId: string
  players: Player[]
  state: OfflineState
  currentWord: string
  currentHint: string
  currentCategory: string
  impostorId: string | null
  turnIndex: number
  round: number
  chat: ChatMessage[]
  votes: Record<string, string> // playerId -> votedPlayerId
  impostorGuess: string | null // sahtekarın son tahmini
  winner: Winner | null
  settings: GameSettings
  awards?: Record<string, Award> // playerId -> award
}

// ─── Kelime Havuzu ───────────────────────────────────────────────────────────

export interface WordEntry {
  word: string
  hint: string
  category: string
  difficulty: Exclude<WordDifficulty, 'MIXED'>
}

// ─── Yerel Kalıcı Veri (localStorage) ────────────────────────────────────────

export interface Profile {
  username: string
  avatar: string
  frame: string | null
  coins: number // başlangıç: 100
  xp: number
  level: number // level = floor(xp / 100) + 1
  createdAt: number
}

export interface Stats {
  gamesPlayed: number
  wins: number // sahtekar yakalama veya sahtekar olarak kazanma
  winsAsImpostor: number
  winsAsPlayer: number
  streak: number // üst üste galibiyet
  bestStreak: number
}

export interface Inventory {
  avatars: string[] // satın alınan avatar id'leri
  frames: string[] // satın alınan çerçeve id'leri
  equippedAvatar: string
  equippedFrame: string | null
}

/** Unlock edilen başarım rozetleri: achievementId -> unlock timestamp */
export type UnlockedAchievements = Record<string, number>

export interface QuestProgress {
  progress: number
  completed: boolean
  claimed: boolean
}

export interface QuestState {
  date: string // YYYY-MM-DD — farklıysa reset
  quests: Record<string, QuestProgress>
}

export interface LeaderboardEntry {
  username: string
  wins: number
  xp: number
  level: number
  gamesPlayed: number
  lastPlayed: number
}

// ─── Konfigürasyon Tipleri (config dosyaları için) ───────────────────────────

export interface Achievement {
  id: string
  title: string
  emoji: string
  desc: string
  /** Stat bazlı koşul: { stat: keyof Stats, op: '>=', value: number } */
  condition: {
    stat: keyof Stats
    op: '>='
    value: number
  }
}

export interface AvatarFrame {
  id: string
  name: string
  rarity: FrameRarity
  price: number // coin
  /** Tailwind class'ları (glow/ring/border). */
  classes: string
}

export interface ShopAvatar {
  id: string
  name: string
  /** public/Avatars/ altındaki dosya adı (uzantısız). */
  file: string
  price: number // coin
  rarity: FrameRarity
}

export interface DailyQuest {
  id: string
  title: string
  emoji: string
  desc: string
  goal: number
  /** İlerlemeyi hangi stat/event artırır? */
  metric: 'gamesPlayed' | 'wins' | 'winsAsImpostor' | 'winsAsPlayer'
  rewardCoins: number
  rewardXp: number
}

// ─── Uygulama Ayarları (yerel) ───────────────────────────────────────────────

export interface Settings {
  sound: boolean
  music: boolean
  haptics: boolean
  /** Oyun içi varsayılan ayarlar (lobby'de değiştirilebilir). */
  defaultTurnTimeLimit: number
  defaultRoundsBeforeVoting: number
  defaultBotDifficulty: BotDifficulty
  defaultWordDifficulty: WordDifficulty
}
