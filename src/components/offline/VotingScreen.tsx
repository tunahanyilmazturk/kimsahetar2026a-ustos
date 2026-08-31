import { useState } from 'react'
import { motion } from 'motion/react'
import { Vote, Check, ArrowRight, ArrowLeft, Users } from 'lucide-react'
import { Button } from '../common/Button'
import { Avatar } from '../common/Avatar'
import { cn } from '../../utils/cn'
import type { Player } from '../../types'

export interface VotingScreenProps {
  players: Player[]
  /** playerId -> votedTargetId */
  votes: Record<string, string>
  /** Oylama tamamlandı mı? */
  onVote: (voterId: string, targetId: string) => void
  onFinish: () => void
  onExit: () => void
}

export function VotingScreen({ players, votes, onVote, onFinish, onExit }: VotingScreenProps) {
  // ─── Alt-state: pass (cihazı geç) | vote (oyla) ─────────────────────────────
  const [phase, setPhase] = useState<'pass' | 'vote'>('pass')
  const [voterIndex, setVoterIndex] = useState(0)

  // Sadece gerçek oyuncuları sıraya al (botlar OfflineGame tarafından otomatik oy verir)
  const humanPlayers = players.filter((p) => !p.isBot)
  const currentVoter = humanPlayers[voterIndex]
  const allVoted = players.every((p) => votes[p.id])

  // ─── Oy sayımı (canlı) ──────────────────────────────────────────────────────
  const voteCount: Record<string, number> = {}
  for (const targetId of Object.values(votes)) {
    voteCount[targetId] = (voteCount[targetId] ?? 0) + 1
  }

  const handleVote = (targetId: string) => {
    if (!currentVoter) return
    onVote(currentVoter.id, targetId)
    // Sonraki gerçek oyuncuya geç
    if (voterIndex >= humanPlayers.length - 1) {
      setPhase('pass')
      setVoterIndex(0)
    } else {
      setVoterIndex((i) => i + 1)
      setPhase('pass')
    }
  }

  // ─── PASS phase ─────────────────────────────────────────────────────────────
  if (phase === 'pass' && !allVoted) {
    return (
      <div className="min-h-svh w-full bg-slate-950 text-slate-100 flex flex-col items-center justify-center px-6 py-8">
        <motion.div
          key={`vote-pass-${voterIndex}`}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 280, damping: 25 }}
          className="w-full max-w-md flex flex-col items-center gap-6"
        >
          <div className="flex items-center gap-2 text-rose-300">
            <Vote className="h-6 w-6" />
            <h1 className="text-xl font-bold">Oylama</h1>
          </div>

          <p className="text-sm text-slate-400 text-center">Cihazı oylayacak oyuncuya ver:</p>

          <div className="flex flex-col items-center gap-3">
            <Avatar avatarId={currentVoter.avatar} size="xl" hideFrame />
            <h2 className="text-2xl font-bold text-indigo-300">{currentVoter.name}</h2>
          </div>

          {/* İlerleme — sadece gerçek oyuncular */}
          <div className="flex items-center gap-2">
            {humanPlayers.map((p, i) => (
              <div
                key={p.id}
                className={cn(
                  'h-2 rounded-full transition-all',
                  i < voterIndex
                    ? 'w-2 bg-emerald-500'
                    : i === voterIndex
                      ? 'w-8 bg-indigo-500'
                      : 'w-2 bg-slate-700',
                )}
              />
            ))}
          </div>

          <Button size="lg" fullWidth onClick={() => setPhase('vote')}>
            Hazırım
            <ArrowRight className="h-5 w-5" />
          </Button>

          <p className="text-center text-xs text-slate-500">
            {Object.keys(votes).length}/{players.length} oy verildi
            {players.some((p) => p.isBot) && ' · botlar otomatik oy verir'}
          </p>
        </motion.div>
      </div>
    )
  }

  // ─── VOTE phase ─────────────────────────────────────────────────────────────
  if (phase === 'vote' && currentVoter) {
    return (
      <div className="min-h-svh w-full bg-slate-950 text-slate-100 flex flex-col px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={onExit}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors min-h-11"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-xs">Çık</span>
          </button>
          <div className="flex items-center gap-2 text-rose-300">
            <Vote className="h-5 w-5" />
            <span className="font-semibold">Oylama</span>
          </div>
        </div>

        <motion.div
          key={`vote-write-${voterIndex}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 rounded-xl bg-slate-900/80 ring-1 ring-slate-800 p-3"
        >
          <div className="flex items-center gap-3">
            <Avatar avatarId={currentVoter.avatar} size="sm" hideFrame />
            <div>
              <p className="text-sm text-slate-400">Oyuncu:</p>
              <p className="font-semibold text-indigo-300">{currentVoter.name}</p>
            </div>
          </div>
          <p className="mt-2 text-sm text-slate-300">Sahtekar olduğunu düşündüğin oyuncuyu seç:</p>
        </motion.div>

        {/* Oyuncu kartları */}
        <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-2 content-start">
          {players
            .filter((p) => p.id !== currentVoter.id) // kendine oy veremez
            .map((p) => {
              const voted = votes[currentVoter.id] === p.id
              const count = voteCount[p.id] ?? 0
              return (
                <motion.button
                  key={p.id}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleVote(p.id)}
                  className={cn(
                    'flex flex-col items-center gap-2 rounded-xl p-3 ring-1 transition-colors min-h-11',
                    voted
                      ? 'bg-rose-500/15 ring-rose-500/50'
                      : 'bg-slate-800/40 ring-slate-700 hover:bg-slate-800 hover:ring-slate-600',
                  )}
                >
                  <Avatar avatarId={p.avatar} size="md" hideFrame />
                  <span className={cn('text-sm font-medium truncate', voted ? 'text-rose-200' : 'text-slate-200')}>
                    {p.name}
                  </span>
                  {count > 0 && (
                    <span className="rounded-full bg-slate-950/60 px-2 py-0.5 text-xs text-slate-400 tabular-nums">
                      {count} oy
                    </span>
                  )}
                  {voted && <Check className="h-4 w-4 text-rose-400" />}
                </motion.button>
              )
            })}
        </div>

        {/* Canlı oy özeti */}
        <div className="mt-4 rounded-xl bg-slate-900/60 ring-1 ring-slate-800 p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Users className="h-3.5 w-3.5 text-slate-500" />
            <span className="text-xs font-medium text-slate-400">Canlı oy sayımı</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {players.map((p) => {
              const count = voteCount[p.id] ?? 0
              if (count === 0) return null
              return (
                <span
                  key={p.id}
                  className="inline-flex items-center gap-1.5 rounded-full bg-slate-800 px-2.5 py-1 text-xs text-slate-300"
                >
                  {p.name}: <span className="font-semibold text-rose-300">{count}</span>
                </span>
              )
            })}
            {Object.keys(votes).length === 0 && (
              <span className="text-xs text-slate-500">Henüz oy yok</span>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ─── Tüm oylar verildi → Sonuç özeti ────────────────────────────────────────
  const sortedVotes = Object.entries(voteCount).sort((a, b) => b[1] - a[1])
  const topVoted = sortedVotes[0]

  return (
    <div className="min-h-svh w-full bg-slate-950 text-slate-100 flex flex-col items-center justify-center px-6 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md flex flex-col items-center gap-6"
      >
        <div className="flex items-center gap-2 text-rose-300">
          <Vote className="h-6 w-6" />
          <h1 className="text-xl font-bold">Oylama Tamamlandı</h1>
        </div>

        {/* Sonuçlar */}
        <div className="w-full space-y-2">
          {sortedVotes.map(([playerId, count], i) => {
            const player = players.find((p) => p.id === playerId)
            if (!player) return null
            const isTop = topVoted?.[0] === playerId
            return (
              <motion.div
                key={playerId}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-4 py-3 ring-1',
                  isTop ? 'bg-rose-500/10 ring-rose-500/40' : 'bg-slate-800/40 ring-slate-700',
                )}
              >
                <span className="w-6 text-center text-sm font-medium text-slate-500 tabular-nums">{i + 1}</span>
                <Avatar avatarId={player.avatar} size="sm" hideFrame />
                <span className="flex-1 truncate text-slate-200">{player.name}</span>
                <span className="font-semibold text-rose-300 tabular-nums">{count} oy</span>
              </motion.div>
            )
          })}
        </div>

        <Button size="lg" fullWidth onClick={onFinish}>
          Sonucu Açıklamaya Geç
          <ArrowRight className="h-5 w-5" />
        </Button>
      </motion.div>
    </div>
  )
}
