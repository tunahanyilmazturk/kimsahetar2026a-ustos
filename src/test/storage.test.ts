import { describe, it, expect, beforeEach } from 'vitest'
import { storage, STORAGE_KEYS } from '../lib/storage'

describe('storage', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('olmayan anahtar için fallback döner', () => {
    expect(storage.get('yok', 42)).toBe(42)
    expect(storage.get(STORAGE_KEYS.PROFILE, { a: 1 })).toEqual({ a: 1 })
  })

  it('değeri set eder ve get ile geri alır', () => {
    storage.set('test:key', { name: 'Ahmet', coins: 100 })
    expect(storage.get('test:key', null)).toEqual({ name: 'Ahmet', coins: 100 })
  })

  it('remove ile değeri siler', () => {
    storage.set('test:key', 'deger')
    storage.remove('test:key')
    expect(storage.get('test:key', 'fallback')).toBe('fallback')
  })

  it('bozuk JSON için graceful fallback', () => {
    window.localStorage.setItem('bozuk', '{gecersiz')
    expect(storage.get('bozuk', 'varsayilan')).toBe('varsayilan')
  })

  it('clear tüm storage temizler', () => {
    storage.set('a', 1)
    storage.set('b', 2)
    storage.clear()
    expect(storage.get('a', null)).toBeNull()
    expect(storage.get('b', null)).toBeNull()
  })
})
