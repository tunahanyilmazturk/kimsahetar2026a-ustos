import { useEffect, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Avatar } from '../common/Avatar'
import { cn } from '../../utils/cn'
import type { ChatMessage, Player } from '../../types'

export interface ChatPanelProps {
  messages: ChatMessage[]
  players: Player[]
  /** Mesaj sahibinin ID'si (vurgu için). */
  currentTurnPlayerId?: string
  className?: string
}

/** İpucu mesajları listesi — scroll otomatik en alta. */
export function ChatPanel({ messages, players, currentTurnPlayerId, className }: ChatPanelProps) {
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages.length])

  // O(n²) lookup yerine Map kullan — her mesaj için players.find çağırmaktan kaçın
  const avatarMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const p of players) map.set(p.id, p.avatar)
    return map
  }, [players])

  if (messages.length === 0) {
    return (
      <div className={cn('flex flex-col items-center justify-center gap-2 py-10 text-center', className)}>
        <p className="text-sm text-slate-500">Henüz ipucu yok</p>
        <p className="text-xs text-slate-600">Sıradaki oyuncu ilk ipucu verecek</p>
      </div>
    )
  }

  const avatarOf = (playerId: string) => avatarMap.get(playerId) ?? 'avatar_default'

  return (
    <div className={cn('space-y-2 overflow-y-auto', className)}>
      <AnimatePresence initial={false}>
        {messages.map((m) => {
          const isCurrentTurn = m.playerId === currentTurnPlayerId
          return (
            <motion.div
              key={m.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                'flex items-start gap-2.5 rounded-xl px-3 py-2.5 ring-1',
                isCurrentTurn
                  ? 'bg-indigo-500/10 ring-indigo-500/30'
                  : 'bg-slate-800/40 ring-slate-700/50',
              )}
            >
              <Avatar avatarId={avatarOf(m.playerId)} size="xs" hideFrame className="mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className={cn('text-xs font-semibold', isCurrentTurn ? 'text-indigo-300' : 'text-slate-300')}>
                    {m.playerName}
                  </span>
                  <span className="text-[10px] text-slate-600">
                    {new Date(m.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-sm text-slate-100 break-words">{m.text}</p>
              </div>
            </motion.div>
          )
        })}
      </AnimatePresence>
      <div ref={endRef} />
    </div>
  )
}
