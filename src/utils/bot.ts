import type { Player, ChatMessage, BotDifficulty, WordEntry } from '../types'

/**
 * Bot davranışları — EASY / SMART / EXPERT.
 *
 * ─── İpucu Üretimi ───────────────────────────────────────────────────────────
 * EASY:    Rastgele kelimeden türetilmiş basit ipucu (kelimenin ilk harfi, uzunluk, vs.)
 * SMART:   Kategoriye uygun, kelimeyle ilişkili ama çok açık olmayan ipucu
 * EXPERT:  Daha analitik — kelimenin özelliklerine göre ipucu, sahtekar olduğunda
 *          diğer oyuncuların ipuçlarından kelimeyi tahmin etmeye çalışır
 *
 * ─── Sahtekar Bot ────────────────────────────────────────────────────────────
 * Sahtekar bot kelimeyi bilmez. Diğer oyuncuların ipuçlarından tahmin etmeye çalışır.
 * EASY:    Rastgele/uygunsuz ipucu (kelimeyle alakasız)
 * SMART:   Kategoriye uygun genel ipucu verir (kelimeyi ele vermemeye çalışır)
 * EXPERT:  Diğer ipuçlarından çıkarsama yaparak tutarlı ipucu verir
 *
 * ─── Oylama ──────────────────────────────────────────────────────────────────
 * EASY:    Rastgele oy verir
 * SMART:   Şüpheli ipuçları veren oyuncuya oy verir (sahtekar tespiti)
 * EXPERT:  İstatistiksel analiz — en az ipucu veren veya en alakasız ipucu veren oyuncu
 */

// ─── İpucu Havuzu (kategori bazlı genel ipuçları) ────────────────────────────

const GENERIC_HINTS: Record<string, string[]> = {
  Seyahat: ['Yolculukla ilgili', 'Yer değiştirme', 'Bir yere gitmek', 'Konaklama'],
  Kamp: ['Doğada ilgili', 'Açık hava', 'Doğa aktivitesi', 'Kamp malzemesi'],
  Müzik: ['Ses ile ilgili', 'Ritim', 'Kulakla duyulan', 'Melodi'],
  Yiyecek: ['Yemekle ilgili', 'Tat', 'Mutfak', 'Beslenme'],
  Spor: ['Hareket ile ilgili', 'Yarışma', 'Enerji', 'Aktivite'],
  Doğa: ['Dış mekan', 'Yeryüzü', 'Çevre', 'Tabiat'],
  Meslek: ['İş ile ilgili', 'Meslek', 'Çalışma', 'Uzmanlık'],
  'Ev Eşyaları': ['Ev ile ilgili', 'Mekan', 'Mobilya', 'Kullanım eşyası'],
  Giyim: ['Kıyafet', 'Üst giyim', 'Alt giyim', 'Aksesuar'],
  Teknoloji: ['Elektronik', 'Cihaz', 'Dijital', 'İletişim'],
  Hayvanlar: ['Canlı', 'Hareket eder', 'Doğal', 'Pet'],
  Taşıtlar: ['Hareket', 'Yolculuk', 'Motorlu', 'Tekerlekli'],
}

const SAHTEKAR_VAGUE_HINTS = [
  'Bir şey... ama emin değilim',
  'Sanırım biliyorum ama...',
  'Hmm, zor bir kelime',
  'Bu kategoriye uygun bir şey',
  'Daha önce görmüştüm galiba',
  'İlginç bir kelime',
  'Biraz zorlayıcı',
  'Kategoriyi düşününce...',
]

const SAHTEKAR_EASY_HINTS = [
  'Yeşil',
  'Büyük',
  'Küçük',
  'Hızlı',
  'Yavaş',
  'Güzel',
  'İlginç',
  'Eski',
  'Yeni',
  'Sıcak',
  'Soğuk',
  'Uzun',
]

// ─── Yardımcı Fonksiyonlar ───────────────────────────────────────────────────

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!
}

/** Kelimenin ilk harfini ipucu olarak ver (EASY için). */
function firstLetterHint(word: string): string {
  return `${word[0]!.toUpperCase()} harfiyle başlıyor`
}

/** Kelimenin uzunluğunu ipucu olarak ver (EASY için). */
function lengthHint(word: string): string {
  return `${word.length} harfli`
}

/** Kelimenin kategorisine uygun ipucu üret (SMART için). */
function categoryHint(word: WordEntry): string {
  const generic = GENERIC_HINTS[word.category]
  if (generic && generic.length > 0) {
    return pickRandom(generic)
  }
  return word.hint // fallback: gerçek ipucu
}

/** Kelimenin hint alanını biraz gizleyerek ver (SMART için). */
function maskedHint(word: WordEntry): string {
  // Hint'in ilk yarısını ver
  const half = Math.ceil(word.hint.length / 2)
  return word.hint.slice(0, half) + '...'
}

// ─── İpucu Üretimi ───────────────────────────────────────────────────────────

export interface BotHintContext {
  player: Player
  isImpostor: boolean
  word: WordEntry
  /** Daha önce verilmiş ipuçlar (sahtekar bot için referans). */
  previousHints: ChatMessage[]
  difficulty: BotDifficulty
}

export function generateBotHint(ctx: BotHintContext): string {
  const { isImpostor, word, previousHints, difficulty } = ctx

  // ─── Sahtekar bot ──────────────────────────────────────────────────────────
  if (isImpostor) {
    if (difficulty === 'EASY') {
      // Rastgele alakasız ipucu
      return pickRandom(SAHTEKAR_EASY_HINTS)
    }
    if (difficulty === 'SMART') {
      // Kategoriye uygun ama genel ipucu
      const generic = GENERIC_HINTS[word.category]
      if (generic && generic.length > 0) {
        return pickRandom(generic)
      }
      return pickRandom(SAHTEKAR_VAGUE_HINTS)
    }
    // EXPERT: diğer ipuçlardan çıkarsama yapmaya çalış
    if (previousHints.length > 0) {
      // Önceki ipuçlardan birini parafraz et
      const ranked = [...previousHints].sort((a, b) => hintRisk(a.text) - hintRisk(b.text))
      const words = ranked[0]!.text.split(' ').filter(Boolean)
      if (words.length > 1) return `${words.slice(0, Math.min(3, words.length)).join(' ')} ile ilgili`
    }
    return pickRandom(SAHTEKAR_VAGUE_HINTS)
  }

  // ─── Oyuncu bot (kelimeyi biliyor) ─────────────────────────────────────────
  if (difficulty === 'EASY') {
    // Basit ipucu: ilk harf veya uzunluk
    const hints = [firstLetterHint(word.word), lengthHint(word.word), word.hint]
    return pickRandom(hints)
  }

  if (difficulty === 'SMART') {
    // Kategoriye uygun veya maskeli ipucu
    const hints = [categoryHint(word), maskedHint(word), word.hint]
    return pickRandom(hints)
  }

  // EXPERT: kelimenin özelliklerine göre analitik ipucu
  const expertHints = [
    `${word.word.length} harfli, ${word.category.toLowerCase()} kategorisinde`,
    word.hint,
    `Zorluk: ${word.difficulty === 'EASY' ? 'kolay' : word.difficulty === 'MEDIUM' ? 'orta' : 'zor'}`,
    maskedHint(word),
  ]
  return pickRandom(expertHints)
}

// ─── Oylama Stratejisi ───────────────────────────────────────────────────────

export interface BotVoteContext {
  voter: Player
  players: Player[]
  isImpostor: boolean
  impostorId: string
  chat: ChatMessage[]
  difficulty: BotDifficulty
}

export function generateBotVote(ctx: BotVoteContext): string {
  const { voter, players, isImpostor, chat, difficulty } = ctx

  // Kendine oy veremez
  const candidates = players.filter((p) => p.id !== voter.id)

  // ─── EASY: rastgele oy ─────────────────────────────────────────────────────
  if (difficulty === 'EASY') {
    return pickRandom(candidates).id
  }

  // ─── SMART: şüpheli ipucu veren oyuncuya oy ────────────────────────────────
  // Sahtekar bot: rastgele oy (kendini gizlemek için)
  if (isImpostor) {
    // Diğer oyunculardan rastgele birine oy ver (kendini gizle)
    return pickRandom(candidates).id
  }

  // Oyuncu bot: şüphe puanını ipucu sayısı, uzunluğu ve tekrarlarla hesaplar.
  const hintCounts: Record<string, number> = {}
  const hintLengths: Record<string, number> = {}
  const suspicion: Record<string, number> = {}
  for (const p of candidates) {
    const playerHints = chat.filter((m) => m.playerId === p.id)
    hintCounts[p.id] = playerHints.length
    hintLengths[p.id] = playerHints.reduce((sum, m) => sum + m.text.length, 0)
    const riskyHints = playerHints.reduce((sum, hint) => sum + hintRisk(hint.text), 0)
    suspicion[p.id] = (hintCounts[p.id] === 0 ? 4 : 0) + (hintLengths[p.id] < 8 ? 3 : hintLengths[p.id] < 16 ? 1 : 0) + riskyHints
  }

  // En az ipucu veren oyuncu
  const sortedByCount = [...candidates].sort((a, b) => hintCounts[a.id]! - hintCounts[b.id]!)
  const leastHints = sortedByCount[0]

  // ─── EXPERT: istatistiksel analiz ──────────────────────────────────────────
  if (difficulty === 'EXPERT') {
    // En kısa toplam ipucu uzunluğuna sahip oyuncu = şüpheli
    const sortedByLength = [...candidates].sort((a, b) => hintLengths[a.id]! - hintLengths[b.id]!)
    const shortestHints = sortedByLength[0]

    // En az ipucu VE en kısa ipucu aynıysa güçlü şüphe
    if (leastHints && shortestHints && leastHints.id === shortestHints.id) {
      return leastHints.id
    }
    const top = [...candidates].sort((a, b) => suspicion[b.id]! - suspicion[a.id]!)[0]
    return top?.id ?? leastHints?.id ?? pickRandom(candidates).id
  }

  // SMART: en az ipucu verene oy ver
  const top = [...candidates].sort((a, b) => suspicion[b.id]! - suspicion[a.id]!)[0]
  return top?.id ?? leastHints?.id ?? pickRandom(candidates).id
}

function tokenize(value: string): string[] {
  return value.toLocaleLowerCase('tr-TR').replace(/[^a-zçğıöşü0-9 ]/g, '').split(/\s+/).filter(Boolean)
}

function hintRisk(text: string): number {
  const length = tokenize(text).length
  if (text === '...' || text.length < 4) return 4
  if (length === 1) return 2
  if (length >= 6) return -1
  return 0
}

// ─── Sahtekar Kelime Tahmini ─────────────────────────────────────────────────

export interface BotGuessContext {
  impostor: Player
  word: WordEntry
  chat: ChatMessage[]
  difficulty: BotDifficulty
}

/**
 * Sahtekar bot kelime tahmini yapar.
 * EASY: rastgele kelime (kelime havuzundan)
 * SMART: ipuçlarından çıkarsama yapmaya çalışır
 * EXPERT: ipuçlarını analiz ederek en olası kelimeyi tahmin eder
 */
export function generateBotGuess(ctx: BotGuessContext): string {
  const { word, chat, difficulty } = ctx

  if (difficulty === 'EASY') {
    // Rastgele tahmin — çoğu zaman yanlış
    if (Math.random() < 0.2) {
      // %20 doğru tahmin şansı
      return word.word
    }
    // Kategoriden rastgele bir kelime söyle
    return word.category + ' ile ilgili bir şey'
  }

  if (difficulty === 'SMART') {
    // İpuçlarından çıkarsama — %40 doğru tahmin şansı
    if (Math.random() < 0.4) {
      return word.word
    }
    // Kategori + uzunluk tahmini
    return `${word.word.length} harfli ${word.category.toLowerCase()} kelimesi`
  }

  // EXPERT: ipuçlarının miktarına göre güven hesaplar.
  const usefulHints = chat.filter((hint) => hintRisk(hint.text) <= 1)
  const confidence = Math.min(0.85, 0.35 + usefulHints.length * 0.1)
  if (Math.random() < confidence) return word.word
  const candidate = usefulHints.at(-1)?.text
  return candidate ? `${candidate} ile ilgili` : word.category
}
