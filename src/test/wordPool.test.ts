import { describe, it, expect } from 'vitest'
import { pickWord, updateRecentWords, pickImpostor, randomId } from '../utils/wordPool'
import { WORD_POOL, CATEGORIES } from '../constants'

describe('pickWord', () => {
  it('kelime havuzundan geçerli bir kelime döndürür', () => {
    const w = pickWord({ categories: [], difficulty: 'MIXED', recentWords: [], customWords: [] })
    expect(WORD_POOL).toContainEqual(w)
  })

  it('kategori filtresi uygular', () => {
    for (let i = 0; i < 20; i++) {
      const w = pickWord({ categories: ['Spor'], difficulty: 'MIXED', recentWords: [], customWords: [] })
      expect(w.category).toBe('Spor')
    }
  })

  it('zorluk filtresi uygular', () => {
    for (let i = 0; i < 20; i++) {
      const w = pickWord({ categories: [], difficulty: 'EASY', recentWords: [], customWords: [] })
      expect(w.difficulty).toBe('EASY')
    }
  })

  it('recentWords tekrarını önler', () => {
    const recent = WORD_POOL.slice(0, 50).map((w) => w.word)
    for (let i = 0; i < 10; i++) {
      const w = pickWord({ categories: [], difficulty: 'MIXED', recentWords: recent, customWords: [] })
      expect(recent).not.toContain(w.word)
    }
  })

  it('recentWords tüm havuzu kapsıyorsa yine de kelime döndürür', () => {
    const allRecent = WORD_POOL.map((w) => w.word)
    const w = pickWord({ categories: [], difficulty: 'MIXED', recentWords: allRecent, customWords: [] })
    expect(WORD_POOL).toContainEqual(w)
  })

  it('customWords varsa onlardan seçer', () => {
    const w = pickWord({
      categories: [],
      difficulty: 'MIXED',
      recentWords: [],
      customWords: ['TestKelime1', 'TestKelime2'],
    })
    expect(['TestKelime1', 'TestKelime2']).toContain(w.word)
    expect(w.category).toBe('Özel')
  })

  it('customWords recentWords tekrarını önler', () => {
    const w = pickWord({
      categories: [],
      difficulty: 'MIXED',
      recentWords: ['A'],
      customWords: ['A', 'B'],
    })
    expect(w.word).toBe('B')
  })
})

describe('updateRecentWords', () => {
  it('yeni kelimeyi başa ekler', () => {
    expect(updateRecentWords(['a', 'b'], 'c')).toEqual(['c', 'a', 'b'])
  })

  it('tekrar eden kelimeyi başa taşır', () => {
    expect(updateRecentWords(['a', 'b', 'c'], 'b')).toEqual(['b', 'a', 'c'])
  })

  it('max sınırı uygular', () => {
    const recent = Array.from({ length: 25 }, (_, i) => `w${i}`)
    const result = updateRecentWords(recent, 'new', 20)
    expect(result).toHaveLength(20)
    expect(result[0]).toBe('new')
  })
})

describe('pickImpostor', () => {
  it('oyuncu listesinden bir ID seçer', () => {
    const ids = ['p1', 'p2', 'p3']
    const impostor = pickImpostor(ids)
    expect(ids).toContain(impostor)
  })
})

describe('randomId', () => {
  it('benzersiz ID üretir', () => {
    const a = randomId()
    const b = randomId()
    expect(a).not.toBe(b)
    expect(a.length).toBeGreaterThan(0)
  })

  it('prefix ekler', () => {
    expect(randomId('game_').startsWith('game_')).toBe(true)
  })
})

describe('CATEGORIES', () => {
  it('12 kategori vardır', () => {
    expect(CATEGORIES).toHaveLength(12)
  })
})
