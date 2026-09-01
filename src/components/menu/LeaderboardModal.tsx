import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { Trophy, Medal, Crown, Sparkles, Gamepad2, Clock, Trash2, Globe, Loader2 } from 'lucide-react'
import { Modal } from '../common/Modal'
import { Avatar } from '../common/Avatar'
import { leaderboardApi, profileApi, statsApi } from '../../lib/profileApi'
import { useToast } from '../common/toast-context'
import { cn } from '../../utils/cn'
import type { LeaderboardEntry } from '../../types'

export interface LeaderboardModalProps {
  open: boolean
  onClose: () => void
}

export function LeaderboardModal({ open, onClose }: LeaderboardModalProps) {
  const toast = useToast()
  const [mode, setMode] = useState<'local' | 'global'>('local')
  const [globalEntries, setGlobalEntries] = useState<LeaderboardEntry[]>([])
  const [globalLoading, setGlobalLoading] = useState(false)

  const localEntries = leaderboardApi.getAll()
  const entries = mode === 'local' ? localEntries : globalEntries
  const profile = profileApi.get()
  const stats = statsApi.get()

  useEffect(() => {
    if (!open || mode !== 'global' || globalEntries.length > 0) return
    let cancelled = false
    void (async () => {
      if (!cancelled) setGlobalLoading(true)
      try {
        const data = await leaderboardApi.fetchGlobal(50)
        if (!cancelled) setGlobalEntries(data)
      } catch {
        if (!cancelled) toast.error('Global sıralama yüklenemedi')
      } finally {
        if (!cancelled) setGlobalLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [open, mode, globalEntries.length, toast])

  // Mevcut oyuncunun sırasını bul
  const myIndex = entries.findIndex((e) => e.playerId === profile.playerId || (!e.playerId && e.username === profile.username))
  const myEntry = myIndex >= 0 ? entries[myIndex] : null

  const handleClear = () => {
    if (entries.length === 0) return
    window.localStorage.removeItem('sahtekar:leaderboard')
    toast.success('Liderlik tablosu temizlendi')
    onClose()
  }

  const top3 = entries.slice(0, 3)
  const rest = entries.slice(3)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-amber-400" />
          Liderlik Tablosu
        </span>
      }
      size="md"
      footer={
        entries.length > 0 && (
          <button
            type="button"
            onClick={handleClear}
            className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-rose-400 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Tabloyu temizle
          </button>
        )
      }
    >
      {/* ─── Mode toggle ─────────────────────────────────────────────── */}
      <div className="mb-4 flex gap-2 rounded-xl bg-slate-800/40 p-1">
        <button
          type="button"
          onClick={() => setMode('local')}
          className={cn(
            'flex-1 rounded-lg py-2 text-xs font-medium transition-colors',
            mode === 'local' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-slate-200',
          )}
        >
          Yerel
        </button>
        <button
          type="button"
          onClick={() => setMode('global')}
          className={cn(
            'flex-1 rounded-lg py-2 text-xs font-medium transition-colors flex items-center justify-center gap-1',
            mode === 'global' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-slate-200',
          )}
        >
          <Globe className="h-3 w-3" />
          Global
        </button>
      </div>

      {mode === 'global' && globalLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
        </div>
      ) : entries.length === 0 ? (
        /* ─── Boş durum ─────────────────────────────────────────────── */
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <Trophy className="h-12 w-12 text-slate-700" />
          <p className="text-slate-400">Henüz liderlik tablosu boş.</p>
          <p className="text-sm text-slate-500">Oyun oynadıkça burada görüneceksin!</p>
          <div className="mt-2 rounded-xl bg-slate-800/40 ring-1 ring-slate-700/50 px-4 py-3">
            <p className="text-xs text-slate-400">Mevcut durumun:</p>
            <div className="mt-1.5 flex items-center gap-4 text-sm">
              <span className="inline-flex items-center gap-1 text-slate-300">
                <Trophy className="h-3.5 w-3.5 text-amber-400" />
                {stats.wins} galibiyet
              </span>
              <span className="inline-flex items-center gap-1 text-slate-300">
                <Gamepad2 className="h-3.5 w-3.5 text-indigo-400" />
                {stats.gamesPlayed} oyun
              </span>
              <span className="inline-flex items-center gap-1 text-slate-300">
                <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                Lv.{profile.level}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-xl border border-cyan-400/15 bg-cyan-500/5 px-3 py-2 text-xs">
            <span className="text-slate-400">Online sıralama oyuncu ID’siyle eşleşir</span>
            <span className="font-mono text-cyan-300">{profile.playerId}</span>
          </div>
          {/* ─── Senin sıralaman ──────────────────────────────────────── */}
          {myEntry && (
            <div className="rounded-xl bg-indigo-500/10 ring-1 ring-indigo-500/30 px-4 py-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Avatar avatarId={profile.avatar} frameId={profile.frame} size="xs" hideFrame />
                  <span className="text-sm font-medium text-indigo-200">Sen</span>
                </div>
                <span className="text-sm font-semibold text-indigo-300 tabular-nums">
                  {myIndex >= 0 ? `#${myIndex + 1}` : '—'}
                </span>
              </div>
            </div>
          )}

          {/* ─── Top 3 — podyum ──────────────────────────────────────── */}
          {top3.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {top3.map((e, i) => {
                const place = i + 1
                const isMe = e.playerId === profile.playerId || (!e.playerId && e.username === profile.username)
                const icon =
                  place === 1 ? (
                    <Crown className="h-5 w-5 text-amber-400" />
                  ) : place === 2 ? (
                    <Medal className="h-5 w-5 text-slate-300" />
                  ) : (
                    <Medal className="h-5 w-5 text-amber-700" />
                  )
                const height = place === 1 ? 'pt-3 pb-5' : 'pt-5 pb-4'
                const ring =
                  place === 1
                    ? 'ring-amber-500/50 bg-amber-500/10'
                    : place === 2
                      ? 'ring-slate-400/40 bg-slate-400/10'
                      : 'ring-amber-700/40 bg-amber-700/10'
                return (
                  <motion.div
                    key={e.playerId ?? e.username}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className={cn(
                      'flex flex-col items-center gap-1 rounded-xl ring-1 px-2 text-center',
                      height,
                      ring,
                      isMe && 'ring-2 ring-indigo-400',
                      place === 1 && 'order-2',
                      place === 2 && 'order-1',
                      place === 3 && 'order-3',
                    )}
                  >
                    <span className="text-2xl">{icon}</span>
                    <span className={cn(
                      'text-sm font-semibold truncate max-w-full',
                      isMe ? 'text-indigo-200' : 'text-slate-100',
                    )}>
                      {e.username}{isMe && ' (sen)'}
                    </span>
                    <span className="text-xs text-slate-400">{e.wins} galibiyet</span>
                    <span className="text-[10px] text-slate-500">Lv.{e.level}</span>
                  </motion.div>
                )
              })}
            </div>
          )}

          {/* ─── Rest — liste ────────────────────────────────────────── */}
          {rest.length > 0 && (
            <div className="space-y-1.5">
              {rest.map((e, i) => (
                <LeaderboardRow key={e.playerId ?? e.username} entry={e} rank={i + 4} isMe={e.playerId === profile.playerId || (!e.playerId && e.username === profile.username)} />
              ))}
            </div>
          )}

          {/* ─── İstatistik özeti ────────────────────────────────────── */}
          <div className="rounded-xl bg-slate-800/40 ring-1 ring-slate-700/50 px-4 py-3">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-xs text-slate-500">Toplam Oyuncu</p>
                <p className="text-sm font-semibold text-slate-200 tabular-nums">{entries.length}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Toplam Oyun</p>
                <p className="text-sm font-semibold text-slate-200 tabular-nums">
                  {entries.reduce((sum, e) => sum + e.gamesPlayed, 0)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Senin Sıran</p>
                <p className="text-sm font-semibold text-indigo-300 tabular-nums">
                  {myIndex >= 0 ? `#${myIndex + 1}` : '—'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}

// ─── Leaderboard Row ─────────────────────────────────────────────────────────

function LeaderboardRow({ entry, rank, isMe }: { entry: LeaderboardEntry; rank: number; isMe: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.2 + (rank - 4) * 0.04 }}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 ring-1',
        isMe
          ? 'bg-indigo-500/10 ring-indigo-500/40'
          : 'bg-slate-800/40 ring-slate-700/50',
      )}
    >
      <span className="w-6 text-center text-sm font-medium text-slate-500 tabular-nums">{rank}</span>
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm truncate', isMe ? 'font-semibold text-indigo-200' : 'text-slate-200')}>
          {entry.username}{isMe && ' (sen)'}
        </p>
        <div className="flex items-center gap-2 text-[10px] text-slate-500">
          {entry.playerId && <span className="font-mono text-cyan-400/80">{entry.playerId}</span>}
          <span className="inline-flex items-center gap-0.5">
            <Gamepad2 className="h-3 w-3" />
            {entry.gamesPlayed}
          </span>
          <span className="inline-flex items-center gap-0.5">
            <Sparkles className="h-3 w-3" />
            {entry.xp} XP
          </span>
          <span className="inline-flex items-center gap-0.5">
            <Clock className="h-3 w-3" />
            {timeAgo(entry.lastPlayed)}
          </span>
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-semibold text-amber-300 tabular-nums">{entry.wins}</p>
        <p className="text-[10px] text-slate-500">galibiyet</p>
      </div>
      <span className="text-xs text-slate-500 tabular-nums shrink-0">Lv.{entry.level}</span>
    </motion.div>
  )
}

/** "3 gün önce", "2 saat önce" gibi relative zaman. */
function timeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (days > 0) return `${days}g önce`
  if (hours > 0) return `${hours}sa önce`
  if (minutes > 0) return `${minutes}dk önce`
  return 'az önce'
}
