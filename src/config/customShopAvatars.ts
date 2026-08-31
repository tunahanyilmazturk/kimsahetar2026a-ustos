import type { ShopAvatar } from '../types'

/**
 * Marketten satın alınabilir avatarlar.
 * `file` alanı `public/Avatars/` altındaki görsel dosya adıdır (uzantısız).
 * Gerçek PNG dosyaları Faz 9'da eklenecek; şimdilik emoji fallback kullanılacak.
 *
 * `STARTER_AVATARS` ücretsiz başlangıç avatarlarıdır (her oyuncuya varsayılan verilir).
 */
export const STARTER_AVATARS: ShopAvatar[] = [
  { id: 'avatar_default', name: 'Varsayılan', file: 'default', price: 0, rarity: 'COMMON' },
  { id: 'avatar_smile', name: 'Gülümseme', file: 'smile', price: 0, rarity: 'COMMON' },
  { id: 'avatar_cool', name: 'Sakin', file: 'cool', price: 0, rarity: 'COMMON' },
]

export const SHOP_AVATARS: ShopAvatar[] = [
  // ─── Common ───────────────────────────────────────────────────────────────
  { id: 'avatar_cat', name: 'Kedi', file: 'cat', price: 100, rarity: 'COMMON' },
  { id: 'avatar_dog', name: 'Köpek', file: 'dog', price: 100, rarity: 'COMMON' },
  { id: 'avatar_fox', name: 'Tilki', file: 'fox', price: 120, rarity: 'COMMON' },
  { id: 'avatar_panda', name: 'Panda', file: 'panda', price: 120, rarity: 'COMMON' },
  // ─── Rare ─────────────────────────────────────────────────────────────────
  { id: 'avatar_lion', name: 'Aslan', file: 'lion', price: 300, rarity: 'RARE' },
  { id: 'avatar_wolf', name: 'Kurt', file: 'wolf', price: 300, rarity: 'RARE' },
  { id: 'avatar_dragon', name: 'Ejderha', file: 'dragon', price: 350, rarity: 'RARE' },
  // ─── Epic ─────────────────────────────────────────────────────────────────
  { id: 'avatar_phoenix', name: 'Anka Kuşu', file: 'phoenix', price: 700, rarity: 'EPIC' },
  { id: 'avatar_unicorn', name: 'Tekboynuz', file: 'unicorn', price: 700, rarity: 'EPIC' },
  // ─── Legendary ────────────────────────────────────────────────────────────
  { id: 'avatar_cosmic', name: 'Kozmik Varlık', file: 'cosmic', price: 1500, rarity: 'LEGENDARY' },
  { id: 'avatar_phantom', name: 'Hayalet', file: 'phantom', price: 1800, rarity: 'LEGENDARY' },
]

/** Tüm avatarlar (başlangıç + market). */
export const ALL_AVATARS: ShopAvatar[] = [...STARTER_AVATARS, ...SHOP_AVATARS]

/** ID -> ShopAvatar eşlemesi. */
export const AVATAR_MAP: Record<string, ShopAvatar> = Object.fromEntries(
  ALL_AVATARS.map((a) => [a.id, a]),
)

/**
 * Avatar id -> gösterilecek emoji (PNG dosyası yokken fallback).
 * Faz 9'da gerçek PNG'ler eklendiğinde bu fonksiyon kullanımdan kalkacak.
 */
export const AVATAR_EMOJI: Record<string, string> = {
  avatar_default: '🙂',
  avatar_smile: '😄',
  avatar_cool: '😎',
  avatar_cat: '🐱',
  avatar_dog: '🐶',
  avatar_fox: '🦊',
  avatar_panda: '🐼',
  avatar_lion: '🦁',
  avatar_wolf: '🐺',
  avatar_dragon: '🐉',
  avatar_phoenix: '🔥',
  avatar_unicorn: '🦄',
  avatar_cosmic: '🌌',
  avatar_phantom: '👻',
}

/** Avatar id'sinden emoji döndür (bilinmeyen için fallback). */
export function avatarEmoji(id: string): string {
  return AVATAR_EMOJI[id] ?? '🙂'
}
