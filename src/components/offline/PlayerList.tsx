import { motion } from 'motion/react'
import { Bot, Crown, Check } from 'lucide-react'
import { Avatar } from '../common/Avatar'
import { cn } from '../../utils/cn'
import type { Player } from '../../types'

export interface PlayerListProps {
  players: Player[]
  turnIndex: number
  hostId?: string
  /** İpucu yazmış oyuncu ID'leri (bu turda). */
  hintedThisRound?: Set<string>
  /** Pas geçmiş oyuncu ID'leri (bu turda). */
  passedThisRound?: Set<string>
  className?: string
}

export function PlayerList({
  players,
  turnIndex,
  hostId,
  hintedThisRound,
  passedThisRound,
  className,
}: PlayerListProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {players.map((p, i) => {
        const isTurn = i === turnIndex
        const hinted = hintedThisRound?.has(p.id)
        const passed = passedThisRound?.has(p.id)
        return (
          <motion.div
            key={p.id}
            layout
            animate={isTurn ? { scale: 1.02 } : { scale: 1 }}
            className={cn(
              'flex items-center gap-2.5 rounded-lg px-3 py-2 ring-1 transition-colors',
              isTurn
                ? 'bg-indigo-500/15 ring-indigo-500/50'
                : 'bg-slate-800/40 ring-slate-700/50',
            )}
          >
            <Avatar avatarId={p.avatar} size="xs" hideFrame />
            <span className={cn('flex-1 truncate text-sm', isTurn ? 'font-semibold text-indigo-200' : 'text-slate-300')}>
              {p.name}
            </span>
            {p.isBot && <Bot className="h-3.5 w-3.5 text-slate-500" />}
            {hostId === p.id && <Crown className="h-3.5 w-3.5 text-amber-400" />}
            {hinted && <Check className="h-3.5 w-3.5 text-emerald-400" />}
            {passed && <span className="text-xs text-slate-500">pas</span>}
          </motion.div>
        )
      })}
    </div>
  )
}
