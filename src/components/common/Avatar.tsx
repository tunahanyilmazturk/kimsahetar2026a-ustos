import { cn } from '../../utils/cn'
import { avatarEmoji } from '../../config/customShopAvatars'
import { AVATAR_FRAME_MAP } from '../../config/avatarFrames'
import type { FrameRarity } from '../../types'

export interface AvatarProps {
  avatarId: string
  frameId?: string | null
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  /** Çerçeve gösterilmesin (ör. küçük listelerde). */
  hideFrame?: boolean
}

const SIZES: Record<NonNullable<AvatarProps['size']>, string> = {
  xs: 'h-8 w-8 text-base',
  sm: 'h-10 w-10 text-xl',
  md: 'h-14 w-14 text-2xl',
  lg: 'h-20 w-20 text-4xl',
  xl: 'h-28 w-28 text-5xl',
}

const SPRITE_POSITIONS: Record<string, string> = {
  avatar_default: '0% 0%', avatar_smile: '33.333% 0%', avatar_cool: '66.666% 0%',
  avatar_cat: '100% 0%', avatar_dog: '0% 33.333%', avatar_fox: '33.333% 33.333%',
  avatar_panda: '66.666% 33.333%', avatar_lion: '100% 33.333%', avatar_wolf: '0% 66.666%',
  avatar_dragon: '33.333% 66.666%', avatar_phoenix: '66.666% 66.666%', avatar_unicorn: '100% 66.666%',
  avatar_cosmic: '0% 100%', avatar_phantom: '33.333% 100%',
  avatar_royal: '66.666% 100%', avatar_blossom: '100% 100%',
}

const PREMIUM_SPRITE_POSITIONS: Record<string, string> = {
  avatar_celestial: '0% 0%', avatar_cyber: '33.333% 0%', avatar_royal_red: '66.666% 0%', avatar_crystal: '100% 0%',
  avatar_inferno: '0% 33.333%', avatar_galaxy: '33.333% 33.333%', avatar_wings: '100% 33.333%', avatar_solar: '66.666% 100%',
}

const FRAME_SPRITE_POSITIONS: Record<string, string> = {
  frame_silver: '0% 0%', frame_bronze: '33.333% 0%', frame_ice: '66.666% 0%', frame_copper: '100% 0%',
  frame_sapphire: '0% 33.333%', frame_emerald: '33.333% 33.333%', frame_ruby: '66.666% 33.333%', frame_ocean: '100% 33.333%',
  frame_amethyst: '0% 66.666%', frame_inferno: '33.333% 66.666%', frame_thunder: '66.666% 66.666%', frame_prism: '100% 66.666%',
  frame_cosmic: '0% 100%', frame_phantom: '33.333% 100%', frame_halo: '66.666% 100%', frame_void: '100% 100%',
}

/**
 * Avatar bileşeni — emoji fallback ile gösterim.
 * Çerçeve varsa rarity'ye göre glow/shimmer class'ları uygulanır.
 * İleride gerçek PNG'ler eklendiğinde `avatarEmoji` yerine <img> kullanılacak.
 */
export function Avatar({ avatarId, frameId, size = 'md', className, hideFrame }: AvatarProps) {
  const frame = !hideFrame && frameId ? AVATAR_FRAME_MAP[frameId] : null
  const frameClasses = frame?.classes ?? 'ring-1 ring-slate-700'

  return (
    <div
      className={cn(
        'relative inline-flex items-center justify-center rounded-full bg-slate-800 overflow-visible',
        SIZES[size],
        frameClasses,
        className,
      )}
      aria-label="Avatar"
    >
      {SPRITE_POSITIONS[avatarId] || PREMIUM_SPRITE_POSITIONS[avatarId] ? (
        <span
          className="absolute inset-0 overflow-hidden rounded-full bg-no-repeat"
          style={{
            backgroundImage: `url('${PREMIUM_SPRITE_POSITIONS[avatarId] ? '/premium-avatar-sprite.png' : '/avatar-sprite.png'}')`,
            backgroundPosition: PREMIUM_SPRITE_POSITIONS[avatarId] ?? SPRITE_POSITIONS[avatarId],
            backgroundSize: '400% 400%',
          }}
          aria-hidden
        />
      ) : (
        <span className="leading-none select-none" aria-hidden>{avatarEmoji(avatarId)}</span>
      )}
      {frame && FRAME_SPRITE_POSITIONS[frame.id] && (
        <span
          className="pointer-events-none absolute -inset-[14%] z-10 bg-no-repeat"
          style={{ backgroundImage: "url('/frame-sprite.png')", backgroundPosition: FRAME_SPRITE_POSITIONS[frame.id], backgroundSize: '400% 400%' }}
          aria-hidden
        />
      )}
    </div>
  )
}

/** Rarity rozet etiketi (küçük chip). */
const RARITY_LABELS: Record<FrameRarity, string> = {
  COMMON: 'Yaygın',
  RARE: 'Nadir',
  EPIC: 'Epik',
  LEGENDARY: 'Efsanevi',
}

const RARITY_COLORS: Record<FrameRarity, string> = {
  COMMON: 'bg-slate-700 text-slate-300',
  RARE: 'bg-blue-600/20 text-blue-300 ring-1 ring-blue-500/40',
  EPIC: 'bg-purple-600/20 text-purple-300 ring-1 ring-purple-500/40',
  LEGENDARY: 'bg-fuchsia-600/20 text-fuchsia-300 ring-1 ring-fuchsia-400/50',
}

export function RarityBadge({ rarity }: { rarity: FrameRarity }) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', RARITY_COLORS[rarity])}>
      {RARITY_LABELS[rarity]}
    </span>
  )
}
