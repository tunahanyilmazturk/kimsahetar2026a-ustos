import '@testing-library/jest-dom/vitest'

// Node 26 + jsdom 30 kombinasyonunda `window.localStorage` sağlanmayabiliyor.
// Testler için in-memory bir localStorage polyfill'i sağla.
function createLocalStorage() {
  const store = new Map<string, string>()
  return {
    getItem(key: string): string | null {
      return store.has(key) ? store.get(key)! : null
    },
    setItem(key: string, value: string): void {
      store.set(key, String(value))
    },
    removeItem(key: string): void {
      store.delete(key)
    },
    clear(): void {
      store.clear()
    },
    key(index: number): string | null {
      return Array.from(store.keys())[index] ?? null
    },
    get length(): number {
      return store.size
    },
  }
}

if (typeof window !== 'undefined' && !window.localStorage) {
  Object.defineProperty(window, 'localStorage', {
    value: createLocalStorage(),
    configurable: true,
    writable: true,
  })
}
