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
