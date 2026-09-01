/**
 * Oyun mantığı yardımcı fonksiyonları — test edilebilir saf fonksiyonlar.
 */

/**
 * Oyları sayar ve en çok oy alan oyuncuyu belirler.
 *
 * Edge case'ler:
 * - Boş oylar → `topVotedId: null`
 * - Berabere (tie) → ilk sıradaki (Object.entries sırasına göre) döner
 * - Tek oy → o oyuncu döner
 *
 * @param votes `voterId -> targetId` eşlemesi
 * @returns `topVotedId` en çok oy alan oyuncu (yoksa null), `voteCount` her oyuncunun oy sayısı
 */
export function countVotes(votes: Record<string, string>): {
  topVotedId: string | null
  voteCount: Record<string, number>
} {
  const voteCount: Record<string, number> = {}
  for (const targetId of Object.values(votes)) {
    voteCount[targetId] = (voteCount[targetId] ?? 0) + 1
  }
  const sorted = Object.entries(voteCount).sort((a, b) => b[1] - a[1])
  const topVotedId = sorted[0]?.[0] ?? null
  return { topVotedId, voteCount }
}

/**
 * Sahtekarın kelime tahmininin doğru olup olmadığını kontrol eder.
 * Büyük/küçük harf duyarsız, boşlukları trim'ler.
 */
export function isGuessCorrect(guess: string, word: string): boolean {
  return normalizeText(guess) === normalizeText(word)
}

export function normalizeText(value: string): string {
  return value.trim().toLocaleLowerCase('tr-TR').replace(/\s+/g, ' ')
}

export function isValidHint(hint: string, word: string, previousHints: string[] = []): boolean {
  const normalizedHint = normalizeText(hint)
  const normalizedWord = normalizeText(word)
  if (normalizedHint.length < 2 || normalizedHint.length > 100) return false
  if (normalizedHint === normalizedWord || normalizedHint.includes(normalizedWord)) return false
  const wordStem = normalizedWord.length >= 5 ? normalizedWord.slice(0, -2) : normalizedWord
  if (wordStem.length >= 4 && normalizedHint.includes(wordStem)) return false
  return !previousHints.some((previous) => normalizeText(previous) === normalizedHint)
}

/**
 * İki ipucunun aynı fikri tekrar edip etmediğini puanlar.
 * Gerçek zamanlı oyunda harici AI çağrısı yerine; Türkçe normalizasyon,
 * basit kök çıkarma, kelime kesişimi ve karakter benzerliği birlikte kullanılır.
 */
export function hintSimilarity(first: string, second: string): number {
  const a = hintTokens(first)
  const b = hintTokens(second)
  if (a.length === 0 || b.length === 0) return 0
  if (a.join(' ') === b.join(' ')) return 1

  const bSet = new Set(b)
  const overlap = a.filter((token) => bSet.has(token)).length
  const dice = (2 * overlap) / (a.length + b.length)
  const compactA = a.join(' ')
  const compactB = b.join(' ')
  const edit = 1 - levenshteinDistance(compactA, compactB) / Math.max(compactA.length, compactB.length)
  return Math.max(dice, edit)
}

export function isTooSimilarHint(hint: string, previousHints: string[]): boolean {
  return previousHints.some((previous) => hintSimilarity(hint, previous) >= 0.62)
}

function hintTokens(value: string): string[] {
  const stopWords = new Set(['bir', 'bu', 'şey', 'ile', 've', 'gibi', 'olan', 'ilgili', 'bunun', 'çok', 'daha'])
  return normalizeText(value)
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 1 && !stopWords.has(token))
    .map((token) => token.replace(/(ların|lerin|ları|leri|dan|den|tan|ten|dır|dir|dur|dür|dır|dir|ın|in|un|ün|lar|ler|ya|ye|a|e)$/u, ''))
    .filter((token) => token.length > 1)
}

function levenshteinDistance(first: string, second: string): number {
  const row = Array.from({ length: second.length + 1 }, (_, index) => index)
  for (let i = 1; i <= first.length; i++) {
    let diagonal = row[0]!
    row[0] = i
    for (let j = 1; j <= second.length; j++) {
      const above = row[j]!
      row[j] = first[i - 1] === second[j - 1]
        ? diagonal
        : Math.min(row[j]! + 1, row[j - 1]! + 1, diagonal + 1)
      diagonal = above
    }
  }
  return row[second.length]!
}
