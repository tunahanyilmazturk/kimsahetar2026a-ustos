import type { AvatarFrame } from '../types'

/**
 * Avatar çerçeveleri — rarity bazlı.
 * Her çerçevenin glow/shimmer efekti Tailwind class'larıyla tanımlı.
 * `animate-shimmer` ve `animate-glow` index.css'te tanımlı.
 */
const BASE_AVATAR_FRAMES: AvatarFrame[] = [
  // ─── Common ───────────────────────────────────────────────────────────────
  {
    id: 'frame_none',
    name: 'Çerçevesiz',
    rarity: 'COMMON',
    price: 0,
    classes: 'ring-1 ring-slate-700',
  },
  {
    id: 'frame_silver',
    name: 'Gümüş',
    rarity: 'COMMON',
    price: 50,
    classes: 'ring-2 ring-slate-400',
  },
  {
    id: 'frame_bronze',
    name: 'Bronz',
    rarity: 'COMMON',
    price: 75,
    classes: 'ring-2 ring-amber-700',
  },
  { id: 'frame_copper', name: 'Bakır Kıvılcım', rarity: 'COMMON', price: 100, classes: 'ring-2 ring-orange-700' },
  { id: 'frame_ice', name: 'Buz Çizgisi', rarity: 'COMMON', price: 125, classes: 'ring-2 ring-cyan-600' },
  // ─── Rare ─────────────────────────────────────────────────────────────────
  {
    id: 'frame_sapphire',
    name: 'Safir',
    rarity: 'RARE',
    price: 200,
    classes: 'ring-2 ring-blue-500 shadow-[0_0_12px_2px_rgba(59,130,246,0.5)]',
  },
  {
    id: 'frame_emerald',
    name: 'Zümrüt',
    rarity: 'RARE',
    price: 200,
    classes: 'ring-2 ring-emerald-500 shadow-[0_0_12px_2px_rgba(16,185,129,0.5)]',
  },
  { id: 'frame_ruby', name: 'Yakut', rarity: 'RARE', price: 350, classes: 'ring-2 ring-red-500 shadow-[0_0_12px_2px_rgba(239,68,68,0.55)]' },
  { id: 'frame_ocean', name: 'Okyanus', rarity: 'RARE', price: 400, classes: 'ring-2 ring-cyan-500 shadow-[0_0_12px_2px_rgba(6,182,212,0.55)]' },
  // ─── Epic ─────────────────────────────────────────────────────────────────
  {
    id: 'frame_amethyst',
    name: 'Ametist',
    rarity: 'EPIC',
    price: 500,
    classes:
      'ring-2 ring-purple-500 shadow-[0_0_16px_3px_rgba(168,85,247,0.6)] animate-glow',
  },
  {
    id: 'frame_inferno',
    name: 'İnfirno',
    rarity: 'EPIC',
    price: 500,
    classes:
      'ring-2 ring-orange-500 shadow-[0_0_16px_3px_rgba(249,115,22,0.6)] animate-glow',
  },
  { id: 'frame_thunder', name: 'Gök Gürültüsü', rarity: 'EPIC', price: 800, classes: 'ring-2 ring-yellow-400 shadow-[0_0_18px_4px_rgba(250,204,21,0.65)] animate-glow' },
  { id: 'frame_prism', name: 'Prizma', rarity: 'EPIC', price: 950, classes: 'ring-2 ring-pink-400 shadow-[0_0_18px_4px_rgba(244,114,182,0.65)] animate-shimmer' },
  // ─── Legendary ────────────────────────────────────────────────────────────
  {
    id: 'frame_cosmic',
    name: 'Kozmik',
    rarity: 'LEGENDARY',
    price: 1200,
    classes:
      'ring-2 ring-fuchsia-400 shadow-[0_0_22px_5px_rgba(232,121,249,0.7)] animate-glow bg-linear-to-br from-fuchsia-500/20 to-cyan-500/20',
  },
  {
    id: 'frame_phantom',
    name: 'Hayalet',
    rarity: 'LEGENDARY',
    price: 1500,
    classes:
      'ring-2 ring-cyan-300 shadow-[0_0_22px_5px_rgba(103,232,249,0.7)] animate-glow bg-linear-to-br from-cyan-500/20 to-indigo-500/20',
  },
  { id: 'frame_halo', name: 'Işık Halkası', rarity: 'LEGENDARY', price: 2500, classes: 'ring-4 ring-yellow-300 shadow-[0_0_28px_7px_rgba(253,224,71,0.8)] animate-glow bg-linear-to-br from-yellow-400/25 to-orange-500/20' },
  { id: 'frame_void', name: 'Karanlık Boşluk', rarity: 'LEGENDARY', price: 3000, classes: 'ring-4 ring-violet-300 shadow-[0_0_28px_7px_rgba(196,181,253,0.8)] animate-glow bg-linear-to-br from-violet-500/25 to-fuchsia-500/20' },
]

/** Kategori seti: Neon, element, kraliyet ve gölge çerçeveleri. */
export const CATEGORY_FRAMES: AvatarFrame[] = [
  { id: 'frame_neon_grid', name: 'Neon Izgara', rarity: 'RARE', price: 650, classes: 'ring-2 ring-cyan-400 shadow-[0_0_16px_3px_rgba(34,211,238,0.55)]' },
  { id: 'frame_neon_pulse', name: 'Neon Nabız', rarity: 'EPIC', price: 850, classes: 'ring-2 ring-fuchsia-400 shadow-[0_0_18px_4px_rgba(232,121,249,0.6)]' },
  { id: 'frame_circuit_blue', name: 'Mavi Devre', rarity: 'EPIC', price: 1000, classes: 'ring-2 ring-blue-400 shadow-[0_0_18px_4px_rgba(96,165,250,0.6)]' },
  { id: 'frame_circuit_violet', name: 'Mor Devre', rarity: 'LEGENDARY', price: 1600, classes: 'ring-2 ring-violet-300 shadow-[0_0_22px_5px_rgba(196,181,253,0.7)]' },
  { id: 'frame_fire_ring', name: 'Ateş Halkası', rarity: 'EPIC', price: 750, classes: 'ring-2 ring-orange-400 shadow-[0_0_18px_4px_rgba(251,146,60,0.65)]' },
  { id: 'frame_ice_ring', name: 'Buz Halkası', rarity: 'EPIC', price: 750, classes: 'ring-2 ring-cyan-200 shadow-[0_0_18px_4px_rgba(165,243,252,0.65)]' },
  { id: 'frame_thunder_ring', name: 'Şimşek Halkası', rarity: 'LEGENDARY', price: 1350, classes: 'ring-2 ring-yellow-300 shadow-[0_0_24px_5px_rgba(253,224,71,0.75)]' },
  { id: 'frame_emerald_flame', name: 'Zümrüt Alev', rarity: 'LEGENDARY', price: 1450, classes: 'ring-2 ring-emerald-300 shadow-[0_0_24px_5px_rgba(110,231,183,0.7)]' },
  { id: 'frame_royal_crown', name: 'Kraliyet Tacı', rarity: 'LEGENDARY', price: 1800, classes: 'ring-4 ring-yellow-300 shadow-[0_0_26px_6px_rgba(253,224,71,0.75)]' },
  { id: 'frame_royal_ruby', name: 'Kızıl Kraliyet', rarity: 'LEGENDARY', price: 1900, classes: 'ring-4 ring-red-300 shadow-[0_0_26px_6px_rgba(252,165,165,0.7)]' },
  { id: 'frame_royal_sapphire', name: 'Safir Taht', rarity: 'LEGENDARY', price: 2000, classes: 'ring-4 ring-blue-300 shadow-[0_0_26px_6px_rgba(147,197,253,0.7)]' },
  { id: 'frame_royal_emerald', name: 'Zümrüt Taht', rarity: 'LEGENDARY', price: 2100, classes: 'ring-4 ring-emerald-300 shadow-[0_0_26px_6px_rgba(110,231,183,0.7)]' },
  { id: 'frame_shadow_mist', name: 'Gölge Sisi', rarity: 'RARE', price: 500, classes: 'ring-2 ring-slate-400 shadow-[0_0_14px_3px_rgba(148,163,184,0.5)]' },
  { id: 'frame_shadow_eye', name: 'Gölge Gözü', rarity: 'EPIC', price: 900, classes: 'ring-2 ring-rose-400 shadow-[0_0_20px_4px_rgba(251,113,133,0.6)]' },
  { id: 'frame_shadow_moon', name: 'Gölge Ayı', rarity: 'LEGENDARY', price: 1550, classes: 'ring-2 ring-indigo-300 shadow-[0_0_22px_5px_rgba(165,180,252,0.7)]' },
  { id: 'frame_shadow_rift', name: 'Karanlık Yarık', rarity: 'LEGENDARY', price: 2300, classes: 'ring-4 ring-fuchsia-300 shadow-[0_0_28px_6px_rgba(240,171,252,0.75)]' },
]

/** Tüm çerçeveler: temel koleksiyon + kategori setleri. */
export const AVATAR_FRAMES: AvatarFrame[] = [...BASE_AVATAR_FRAMES, ...CATEGORY_FRAMES]

/** ID -> AvatarFrame eşlemesi. */
export const AVATAR_FRAME_MAP: Record<string, AvatarFrame> = Object.fromEntries(
  AVATAR_FRAMES.map((f) => [f.id, f]),
)

/** Rarity'ye göre renk etiketi (UI rozet için). */
export const RARITY_LABEL: Record<AvatarFrame['rarity'], string> = {
  COMMON: 'Yaygın',
  RARE: 'Nadir',
  EPIC: 'Epik',
  LEGENDARY: 'Efsanevi',
}

/** Rarity'ye göre Tailwind renk class'ları. */
export const RARITY_BADGE_CLASS: Record<AvatarFrame['rarity'], string> = {
  COMMON: 'bg-slate-700 text-slate-300',
  RARE: 'bg-blue-600/20 text-blue-300 ring-1 ring-blue-500/40',
  EPIC: 'bg-purple-600/20 text-purple-300 ring-1 ring-purple-500/40',
  LEGENDARY: 'bg-fuchsia-600/20 text-fuchsia-300 ring-1 ring-fuchsia-400/50',
}
