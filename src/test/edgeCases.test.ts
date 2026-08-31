import { describe, it, expect, beforeEach } from 'vitest'
import { countVotes, isGuessCorrect } from '../utils/gameUtils'
import { pickWord, pickImpostor, updateRecentWords } from '../utils/wordPool'
import { generateBotHint, generateBotVote, generateBotGuess } from '../utils/bot'
import { applyGameResult, REWARDS } from '../lib/scoreSystem'
import { profileApi, statsApi } from '../lib/profileApi'
import { WORD_POOL } from '../constants'
import type { Player, ChatMessage, WordEntry } from '../types'

function makePlayer(id: string, name: string, isBot = true, botDifficulty: 'EASY' | 'SMART' | 'EXPERT' = 'SMART'): Player {
  return { id, name, avatar: 'avatar_default', score: 0, isReady: true, isBot, botDifficulty }
}

function makeWord(): WordEntry {
  return WORD_POOL[0]!
}

function makeChat(playerId: string, text: string): ChatMessage {
  return { id: `m_${playerId}_${text}`, playerId, playerName: 'Test', text, timestamp: Date.now() }
}

// ─── countVotes: Oylama Edge Case'leri ──────────────────────────────────────────

describe('countVotes — edge caseler', () => {
  it('boş oylar → topVotedId null', () => {
    const { topVotedId, voteCount } = countVotes({})
    expect(topVotedId).toBeNull()
    expect(voteCount).toEqual({})
  })

  it('tek oy → o oyuncu döner', () => {
    const { topVotedId, voteCount } = countVotes({ p1: 'p2' })
    expect(topVotedId).toBe('p2')
    expect(voteCount).toEqual({ p2: 1 })
  })

  it('açık kazanan → en çok oy alan döner', () => {
    const { topVotedId, voteCount } = countVotes({
      p1: 'p3',
      p2: 'p3',
      p3: 'p2',
      p4: 'p3',
    })
    expect(topVotedId).toBe('p3')
    expect(voteCount).toEqual({ p3: 3, p2: 1 })
  })

  it('berabere (tie) → tied oyunculardan biri döner (null değil)', () => {
    const { topVotedId, voteCount } = countVotes({
      p1: 'p2',
      p2: 'p3',
      p3: 'p2',
      p4: 'p3',
    })
    // p2 ve p3'ün 2'şer oyu var
    expect(voteCount).toEqual({ p2: 2, p3: 2 })
    expect(['p2', 'p3']).toContain(topVotedId)
    expect(topVotedId).not.toBeNull()
  })

  it('herkes aynı oyuncuya oy verir', () => {
    const { topVotedId, voteCount } = countVotes({
      p1: 'p4',
      p2: 'p4',
      p3: 'p4',
    })
    expect(topVotedId).toBe('p4')
    expect(voteCount).toEqual({ p4: 3 })
  })

  it('kendine oy verirse de sayılır', () => {
    const { topVotedId, voteCount } = countVotes({
      p1: 'p1',
      p2: 'p1',
    })
    expect(topVotedId).toBe('p1')
    expect(voteCount).toEqual({ p1: 2 })
  })
})

// ─── isGuessCorrect: Kelime Tahmini Edge Case'leri ─────────────────────────────

describe('isGuessCorrect — edge caseler', () => {
  it('birebir eşleşme', () => {
    expect(isGuessCorrect('Plaj', 'Plaj')).toBe(true)
  })

  it('büyük/küçük harf duyarsız', () => {
    expect(isGuessCorrect('plaj', 'PLAJ')).toBe(true)
    expect(isGuessCorrect('PlAj', 'pLaJ')).toBe(true)
  })

  it('baştaki/sondaki boşluklar trim edilir', () => {
    expect(isGuessCorrect('  Plaj  ', 'Plaj')).toBe(true)
    expect(isGuessCorrect('Plaj', '  Plaj  ')).toBe(true)
  })

  it('boş tahmin → yanlış', () => {
    expect(isGuessCorrect('', 'Plaj')).toBe(false)
    expect(isGuessCorrect('   ', 'Plaj')).toBe(false)
  })

  it('farklı kelime → yanlış', () => {
    expect(isGuessCorrect('Deniz', 'Plaj')).toBe(false)
  })

  it('benzer ama farklı kelime → yanlış', () => {
    expect(isGuessCorrect('Plajlar', 'Plaj')).toBe(false)
    expect(isGuessCorrect('Plaj', 'Plajlar')).toBe(false)
  })
})

// ─── wordPool: Edge Case'ler ───────────────────────────────────────────────────

describe('wordPool — edge caseler', () => {
  it('pickImpostor tek oyuncuyla çalışır', () => {
    const impostor = pickImpostor(['only'])
    expect(impostor).toBe('only')
  })

  it('pickWord var olmayan kategori → tüm havuzdan seçer (fallback)', () => {
    const w = pickWord({
      categories: ['VarOlmayanKategori'],
      difficulty: 'MIXED',
      recentWords: [],
      customWords: [],
    })
    // Var olmayan kategori → boş pool → fallback ile tüm havuzdan seçer
    expect(WORD_POOL).toContainEqual(w)
  })

  it('pickWord seçili kategoride o zorlukta kelime yoksa MIXED e düşer', () => {
    // Spor kategorisinde EASY kelime olmayabilir — fallback MIXED'e düşmeli
    const w = pickWord({
      categories: ['Spor'],
      difficulty: 'HARD',
      recentWords: [],
      customWords: [],
    })
    expect(w.category).toBe('Spor')
  })

  it('pickWord tek custom word recentte ise → yine de döner', () => {
    const w = pickWord({
      categories: [],
      difficulty: 'MIXED',
      recentWords: ['TekKelime'],
      customWords: ['TekKelime'],
    })
    expect(w.word).toBe('TekKelime')
    expect(w.category).toBe('Özel')
  })

  it('updateRecentWords boş array → tek eleman', () => {
    expect(updateRecentWords([], 'yeni')).toEqual(['yeni'])
  })

  it('updateRecentWords max=1 → sadece son kelime', () => {
    expect(updateRecentWords(['a', 'b', 'c'], 'yeni', 1)).toEqual(['yeni'])
  })
})

// ─── bot: Edge Case'ler ────────────────────────────────────────────────────────

describe('bot — edge caseler', () => {
  const word = makeWord()

  it('generateBotVote 2 oyuncuyla çalışır (tek aday)', () => {
    const players = [makePlayer('p1', 'A'), makePlayer('p2', 'B')]
    const target = generateBotVote({
      voter: players[0]!,
      players,
      isImpostor: false,
      impostorId: 'p2',
      chat: [],
      difficulty: 'SMART',
    })
    // Tek aday p2 — kendine oy veremez, p2'ye vermeli
    expect(target).toBe('p2')
  })

  it('generateBotVote boş chat ile çalışır', () => {
    const players = [makePlayer('p1', 'A'), makePlayer('p2', 'B'), makePlayer('p3', 'C')]
    const target = generateBotVote({
      voter: players[0]!,
      players,
      isImpostor: false,
      impostorId: 'p2',
      chat: [],
      difficulty: 'EXPERT',
    })
    expect(target).not.toBe('p1')
    expect(['p2', 'p3']).toContain(target)
  })

  it('generateBotHint EXPERT sahtekar boş previousHints ile çalışır', () => {
    const player = makePlayer('b1', 'SahtekarBot')
    const hint = generateBotHint({
      player,
      isImpostor: true,
      word,
      previousHints: [],
      difficulty: 'EXPERT',
    })
    expect(hint.length).toBeGreaterThan(0)
  })

  it('generateBotGuess boş chat ile çalışır', () => {
    const impostor = makePlayer('b1', 'SahtekarBot')
    const guess = generateBotGuess({
      impostor,
      word,
      chat: [],
      difficulty: 'EXPERT',
    })
    expect(guess.length).toBeGreaterThan(0)
  })

  it('generateBotVote sahtekar bot kendine oy vermez (2 oyuncu)', () => {
    const players = [makePlayer('p1', 'A'), makePlayer('p2', 'B')]
    const target = generateBotVote({
      voter: players[1]!, // sahtekar
      players,
      isImpostor: true,
      impostorId: 'p2',
      chat: [makeChat('p1', 'bir ipucu')],
      difficulty: 'SMART',
    })
    expect(target).not.toBe('p2')
    expect(target).toBe('p1')
  })

  it('generateBotVote EASY tek adayla çalışır', () => {
    const players = [makePlayer('p1', 'A'), makePlayer('p2', 'B')]
    const target = generateBotVote({
      voter: players[0]!,
      players,
      isImpostor: false,
      impostorId: 'p2',
      chat: [],
      difficulty: 'EASY',
    })
    expect(target).toBe('p2')
  })
})

// ─── scoreSystem: Edge Case'ler ────────────────────────────────────────────────

describe('scoreSystem — edge caseler', () => {
  beforeEach(() => window.localStorage.clear())

  it('impostorId null → kaybeden olarak işlenir (isImpostor=false)', () => {
    const player = makePlayer('p1', 'Ahmet', false)
    const r = applyGameResult({ player, winner: 'PLAYERS', impostorId: null, isLocal: true })
    // impostorId null → isImpostor=false → playerWon = (winner === 'PLAYERS') = true
    expect(r.won).toBe(true)
    expect(r.wonAsPlayer).toBe(true)
    expect(r.xp).toBe(REWARDS.WIN_AS_PLAYER.xp + REWARDS.CATCH_IMPOSTOR_BONUS.xp)
  })

  it('sahtekar kaybederse (PLAYERS kazanır, oyuncu sahtekar) → lose ödülü', () => {
    const player = makePlayer('p1', 'Sahtekar', false)
    const r = applyGameResult({ player, winner: 'PLAYERS', impostorId: 'p1', isLocal: true })
    expect(r.won).toBe(false)
    expect(r.wonAsImpostor).toBe(false)
    expect(r.xp).toBe(REWARDS.LOSE.xp)
    expect(r.coins).toBe(REWARDS.LOSE.coins)
  })

  it('üst üste 3 galibiyet → streak=3, bestStreak=3', () => {
    const player = makePlayer('p1', 'Ahmet', false)
    applyGameResult({ player, winner: 'PLAYERS', impostorId: 'p2', isLocal: true })
    applyGameResult({ player, winner: 'PLAYERS', impostorId: 'p2', isLocal: true })
    applyGameResult({ player, winner: 'PLAYERS', impostorId: 'p2', isLocal: true })
    const stats = statsApi.get()
    expect(stats.wins).toBe(3)
    expect(stats.streak).toBe(3)
    expect(stats.bestStreak).toBe(3)
    expect(stats.gamesPlayed).toBe(3)
  })

  it('galibiyet sonra mağlubiyet → streak sıfırlanır, bestStreak korunur', () => {
    const player = makePlayer('p1', 'Ahmet', false)
    // 2 galibiyet
    applyGameResult({ player, winner: 'PLAYERS', impostorId: 'p2', isLocal: true })
    applyGameResult({ player, winner: 'PLAYERS', impostorId: 'p2', isLocal: true })
    // 1 mağlubiyet
    applyGameResult({ player, winner: 'IMPOSTOR', impostorId: 'p2', isLocal: true })
    const stats = statsApi.get()
    expect(stats.wins).toBe(2)
    expect(stats.gamesPlayed).toBe(3)
    expect(stats.streak).toBe(0)
    expect(stats.bestStreak).toBe(2)
  })

  it('seviye atlama — 100 XP eşiği', () => {
    const player = makePlayer('p1', 'Ahmet', false)
    // Başlangıç: level 1, 0 XP
    expect(profileApi.get().level).toBe(1)
    // 2 galibiyet: 2 × (50+30) = 160 XP → level 2 (100 XP'de)
    applyGameResult({ player, winner: 'PLAYERS', impostorId: 'p2', isLocal: true })
    const r2 = applyGameResult({ player, winner: 'PLAYERS', impostorId: 'p2', isLocal: true })
    expect(profileApi.get().level).toBe(2)
    expect(r2.leveledUp).toBe(true)
  })

  it('isLocal=false → profile/stats değişmez ama sonuç doğru', () => {
    const player = makePlayer('p1', 'Bot')
    const r = applyGameResult({ player, winner: 'IMPOSTOR', impostorId: 'p1', isLocal: false })
    expect(r.won).toBe(true)
    expect(r.wonAsImpostor).toBe(true)
    expect(r.xp).toBe(REWARDS.WIN_AS_IMPOSTOR.xp)
    expect(r.coins).toBe(REWARDS.WIN_AS_IMPOSTOR.coins)
    expect(r.newLevel).toBe(0)
    expect(r.leveledUp).toBe(false)
    expect(profileApi.get().coins).toBe(100)
    expect(statsApi.get().gamesPlayed).toBe(0)
  })
})
