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
        'relative inline-flex items-center justify-center rounded-full bg-slate-800 overflow-hidden',
        SIZES[size],
        frameClasses,
        className,
      )}
      aria-label="Avatar"
    >
      <span className="leading-none select-none" aria-hidden>
        {avatarEmoji(avatarId)}
      </span>
    </div>
  )
}

/** Rarity rozet etiketi (küçük chip). */
export function RarityBadge({ rarity }: { rarity: FrameRarity }) {
  const labels: Record<FrameRarity, string> = {
    COMMON: 'Yaygın',
    RARE: 'Nadir',
    EPIC: 'Epik',
    LEGENDARY: 'Efsanevi',
  }
  const colors: Record<FrameRarity, string> = {
    COMMON: 'bg-slate-700 text-slate-300',
    RARE: 'bg-blue-600/20 text-blue-300 ring-1 ring-blue-500/40',
    EPIC: 'bg-purple-600/20 text-purple-300 ring-1 ring-purple-500/40',
    LEGENDARY: 'bg-fuchsia-600/20 text-fuchsia-300 ring-1 ring-fuchsia-400/50',
  }
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', colors[rarity])}>
      {labels[rarity]}
    </span>
  )
}
