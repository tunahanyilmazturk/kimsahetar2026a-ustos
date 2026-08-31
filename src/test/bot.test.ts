import { describe, it, expect } from 'vitest'
import { generateBotHint, generateBotVote, generateBotGuess } from '../utils/bot'
import { WORD_POOL } from '../constants'
import type { Player, ChatMessage, WordEntry } from '../types'

function makePlayer(id: string, name: string, isBot = true): Player {
  return { id, name, avatar: 'avatar_cool', score: 0, isReady: true, isBot, botDifficulty: 'SMART' }
}

function makeWord(): WordEntry {
  return WORD_POOL[0]!
}

function makeChat(playerId: string, text: string): ChatMessage {
  return { id: 'm1', playerId, playerName: 'Test', text, timestamp: Date.now() }
}

describe('generateBotHint', () => {
  const word = makeWord()
  const player = makePlayer('b1', 'Bot')

  it('EASY oyuncu bot ipucu döndürür', () => {
    const hint = generateBotHint({ player, isImpostor: false, word, previousHints: [], difficulty: 'EASY' })
    expect(hint.length).toBeGreaterThan(0)
  })

  it('SMART oyuncu bot ipucu döndürür', () => {
    const hint = generateBotHint({ player, isImpostor: false, word, previousHints: [], difficulty: 'SMART' })
    expect(hint.length).toBeGreaterThan(0)
  })

  it('EXPERT oyuncu bot ipucu döndürür', () => {
    const hint = generateBotHint({ player, isImpostor: false, word, previousHints: [], difficulty: 'EXPERT' })
    expect(hint.length).toBeGreaterThan(0)
  })

  it('EASY sahtekar bot alakasız ipucu verir', () => {
    const hint = generateBotHint({ player, isImpostor: true, word, previousHints: [], difficulty: 'EASY' })
    expect(hint.length).toBeGreaterThan(0)
    // EASY sahtekar ipucu kelimeyle direkt alakalı olmamalı
    expect(hint.toLowerCase()).not.toContain(word.word.toLowerCase())
  })

  it('SMART sahtekar bot kategori ipucu verir (kelimeyi ele vermez)', () => {
    const hint = generateBotHint({ player, isImpostor: true, word, previousHints: [], difficulty: 'SMART' })
    expect(hint.length).toBeGreaterThan(0)
    expect(hint.toLowerCase()).not.toContain(word.word.toLowerCase())
  })

  it('EXPERT sahtekar bot önceki ipuçlardan parafraz eder', () => {
    const prevHints = [makeChat('p1', 'bir şeyler hakkında')]
    const hint = generateBotHint({ player, isImpostor: true, word, previousHints: prevHints, difficulty: 'EXPERT' })
    expect(hint.length).toBeGreaterThan(0)
  })
})

describe('generateBotVote', () => {
  const players = [makePlayer('p1', 'A'), makePlayer('p2', 'B'), makePlayer('p3', 'C')]
  const chat = [makeChat('p1', 'kısa'), makeChat('p2', 'uzun bir ipucu metni'), makeChat('p3', 'orta uzunlukta')]

  it('EASY bot rastgele oy verir (kendine değil)', () => {
    const voter = players[0]!
    const target = generateBotVote({
      voter,
      players,
      isImpostor: false,
      impostorId: 'p2',
      chat,
      difficulty: 'EASY',
    })
    expect(target).not.toBe(voter.id)
    expect(players.map((p) => p.id)).toContain(target)
  })

  it('SMART bot en az ipucu verene oy verir', () => {
    const voter = players[0]!
    const target = generateBotVote({
      voter,
      players,
      isImpostor: false,
      impostorId: 'p2',
      chat,
      difficulty: 'SMART',
    })
    // p1, p2, p3 hepsi 1 ipucu verdi — rastgele ama kendine değil
    expect(target).not.toBe(voter.id)
  })

  it('sahtekar bot kendine oy vermez', () => {
    const voter = players[1]! // sahtekar
    const target = generateBotVote({
      voter,
      players,
      isImpostor: true,
      impostorId: 'p2',
      chat,
      difficulty: 'SMART',
    })
    expect(target).not.toBe(voter.id)
  })

  it('EXPERT bot istatistiksel analiz yapar', () => {
    const voter = players[0]!
    const chat2 = [
      makeChat('p2', 'kısa'),
      makeChat('p3', 'çok uzun bir ipucu metni ki bu açıkça kelimeyle ilgili'),
    ]
    const target = generateBotVote({
      voter,
      players,
      isImpostor: false,
      impostorId: 'p2',
      chat: chat2,
      difficulty: 'EXPERT',
    })
    expect(target).not.toBe(voter.id)
  })
})

describe('generateBotGuess', () => {
  const word = makeWord()
  const impostor = makePlayer('b1', 'SahtekarBot')
  const chat = [makeChat('p1', 'bir ipucu'), makeChat('p2', 'başka ipucu')]

  it('EASY bot tahmin döndürür', () => {
    const guess = generateBotGuess({ impostor, word, chat, difficulty: 'EASY' })
    expect(guess.length).toBeGreaterThan(0)
  })

  it('SMART bot tahmin döndürür', () => {
    const guess = generateBotGuess({ impostor, word, chat, difficulty: 'SMART' })
    expect(guess.length).toBeGreaterThan(0)
  })

  it('EXPERT bot tahmin döndürür', () => {
    const guess = generateBotGuess({ impostor, word, chat, difficulty: 'EXPERT' })
    expect(guess.length).toBeGreaterThan(0)
  })
})
