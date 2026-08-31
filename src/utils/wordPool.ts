import { WORD_POOL, CATEGORIES } from '../constants'
import type { WordEntry, WordDifficulty } from '../types'

/**
 * Kelime seçimi algoritması.
 *
 * - `categories` boşsa tüm kategorilerden seçer.
 * - `difficulty` 'MIXED' ise tüm zorluklardan, değilse sadece o zorluktan seçer.
 * - `recentWords` içindeki kelimeler tekrar etmez (son oynananlar).
 * - `customWords` varsa, onlardan rastgele bir tane seçilir (hint olmadan, kategori "Özel").
 *
 * Eğer filtreleme sonrası havuz boşsa (tüm kelimeler recent'te), recentWords göz ardı edilir.
 */
export function pickWord(args: {
  categories: string[]
  difficulty: WordDifficulty
  recentWords: string[]
  customWords: string[]
}): WordEntry {
  const { categories, difficulty, recentWords, customWords } = args

  // 1. Özel kelimeler varsa, onlardan rastgele seç
  if (customWords.length > 0) {
    const available = customWords.filter((w) => !recentWords.includes(w))
    const pool = available.length > 0 ? available : customWords
    const word = pool[Math.floor(Math.random() * pool.length)]!
    return {
      word,
      hint: 'Özel kelime — kategori yok',
      category: 'Özel',
      difficulty: 'MEDIUM',
    }
  }

  // 2. Kategori filtresi
  const activeCategories = categories.length > 0 ? categories : CATEGORIES
  let pool = WORD_POOL.filter((w) => activeCategories.includes(w.category))

  // 3. Zorluk filtresi (MIXED hariç)
  if (difficulty !== 'MIXED') {
    const filtered = pool.filter((w) => w.difficulty === difficulty)
    // Eğer o zorlukta kelime yoksa, MIXED'e düş
    if (filtered.length > 0) pool = filtered
  }

  // 4. recentWords filtresi
  const notRecent = pool.filter((w) => !recentWords.includes(w.word))
  const finalPool = notRecent.length > 0 ? notRecent : pool

  return finalPool[Math.floor(Math.random() * finalPool.length)]!
}

/**
 * recentWords listesini günceller — en son N kelimeyi tutar.
 * @param recent Mevcut recent listesi
 * @param word Yeni kelime
 * @param max Son N kelime (varsayılan 20)
 */
export function updateRecentWords(recent: string[], word: string, max = 20): string[] {
  return [word, ...recent.filter((w) => w !== word)].slice(0, max)
}

/** Rastgele oyuncu ID'si seç (sahtekar belirleme). */
export function pickImpostor(playerIds: string[]): string {
  return playerIds[Math.floor(Math.random() * playerIds.length)]!
}

/** Rastgele ID üret (oyuncu/oyun ID'si için). */
export function randomId(prefix = ''): string {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
}
