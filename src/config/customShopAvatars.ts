import type { ShopAvatar } from '../types'

/**
 * Marketten satın alınabilir avatarlar.
 * `file` alanı `public/Avatars/` altındaki görsel dosya adıdır (uzantısız).
 * Gerçek PNG dosyaları Faz 9'da eklenecek; şimdilik emoji fallback kullanılacak.
 *
 * `STARTER_AVATARS` ücretsiz başlangıç avatarlarıdır (her oyuncuya varsayılan verilir).
 */
export const STARTER_AVATARS: ShopAvatar[] = [
  { id: 'avatar_default', name: 'Çaylak Mürettebat', file: 'default', price: 0, rarity: 'COMMON' },
  { id: 'avatar_smile', name: 'Neşeli Hop', file: 'smile', price: 0, rarity: 'COMMON' },
  { id: 'avatar_cool', name: 'Kulaklıklı DJ', file: 'cool', price: 0, rarity: 'COMMON' },
]

export const SHOP_AVATARS: ShopAvatar[] = [
  { id: 'avatar_celestial', name: 'Kozmik Taç', file: 'celestial', price: 5000, rarity: 'LEGENDARY' },
  { id: 'avatar_cyber', name: 'Neon Siber', file: 'cyber', price: 5500, rarity: 'LEGENDARY' },
  { id: 'avatar_royal_red', name: 'Kızıl Hükümdar', file: 'royal-red', price: 6000, rarity: 'LEGENDARY' },
  { id: 'avatar_crystal', name: 'Kristal Muhafız', file: 'crystal', price: 6500, rarity: 'LEGENDARY' },
  { id: 'avatar_inferno', name: 'Alev Çekirdeği', file: 'inferno', price: 7000, rarity: 'LEGENDARY' },
  { id: 'avatar_galaxy', name: 'Galaksi Gezgini', file: 'galaxy', price: 7500, rarity: 'LEGENDARY' },
  { id: 'avatar_wings', name: 'Prizma Kanat', file: 'wings', price: 8000, rarity: 'LEGENDARY' },
  { id: 'avatar_solar', name: 'Güneş Muhafızı', file: 'solar', price: 9000, rarity: 'LEGENDARY' },
  // ─── Common ───────────────────────────────────────────────────────────────
  { id: 'avatar_cat', name: 'Yıldız Göz', file: 'cat', price: 150, rarity: 'COMMON' },
  { id: 'avatar_dog', name: 'Mor Büyücü', file: 'dog', price: 150, rarity: 'COMMON' },
  { id: 'avatar_fox', name: 'Turuncu Pilot', file: 'fox', price: 180, rarity: 'COMMON' },
  { id: 'avatar_panda', name: 'Pembe Pati', file: 'panda', price: 180, rarity: 'COMMON' },
  // ─── Rare ─────────────────────────────────────────────────────────────────
  { id: 'avatar_lion', name: 'Gölge Avcısı', file: 'lion', price: 450, rarity: 'RARE' },
  { id: 'avatar_wolf', name: 'Fener Bekçisi', file: 'wolf', price: 450, rarity: 'RARE' },
  { id: 'avatar_dragon', name: 'Kraliyet Pilot', file: 'dragon', price: 550, rarity: 'RARE' },
  // ─── Epic ─────────────────────────────────────────────────────────────────
  { id: 'avatar_phoenix', name: 'Kış Komutanı', file: 'phoenix', price: 900, rarity: 'EPIC' },
  { id: 'avatar_unicorn', name: 'Mercan Kaşif', file: 'unicorn', price: 950, rarity: 'EPIC' },
  // ─── Legendary ────────────────────────────────────────────────────────────
  { id: 'avatar_cosmic', name: 'Neon Anten', file: 'cosmic', price: 1800, rarity: 'LEGENDARY' },
  { id: 'avatar_phantom', name: 'Gökkuşağı Dedektif', file: 'phantom', price: 2200, rarity: 'LEGENDARY' },
  { id: 'avatar_royal', name: 'Altın Tahtın Varisi', file: 'royal', price: 3500, rarity: 'LEGENDARY' },
  { id: 'avatar_blossom', name: 'Kalp Bahçesi', file: 'blossom', price: 4000, rarity: 'LEGENDARY' },
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
  avatar_royal: '👑',
  avatar_blossom: '💜',
  avatar_celestial: '✨', avatar_cyber: '⚡', avatar_royal_red: '👑', avatar_crystal: '💎',
  avatar_inferno: '🔥', avatar_galaxy: '🌌', avatar_wings: '🌈', avatar_solar: '☀️',
}

/** Avatar id'sinden emoji döndür (bilinmeyen için fallback). */
export function avatarEmoji(id: string): string {
  return AVATAR_EMOJI[id] ?? '🙂'
}
