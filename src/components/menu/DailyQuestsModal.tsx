import { motion } from 'motion/react'
import { Check, Gift, Clock, Coins, Sparkles, CalendarCheck } from 'lucide-react'
import { Modal } from '../common/Modal'
import { Button } from '../common/Button'
import { useToast } from '../common/Toast'
import { useProfile } from '../../hooks/useProfile'
import { questsApi, today } from '../../lib/questsApi'
import { DAILY_QUESTS } from '../../config/dailyQuests'
import { cn } from '../../utils/cn'
import type { QuestProgress } from '../../types'

export interface DailyQuestsModalProps {
  open: boolean
  onClose: () => void
}

export function DailyQuestsModal({ open, onClose }: DailyQuestsModalProps) {
  const { profile, addCoins, addXp } = useProfile()
  const toast = useToast()

  const state = questsApi.get()
  const totalQuests = DAILY_QUESTS.length
  const completedCount = DAILY_QUESTS.filter((q) => state.quests[q.id]?.completed).length
  const claimableCount = DAILY_QUESTS.filter((q) => {
    const p = state.quests[q.id]
    return p?.completed && !p.claimed
  }).length

  const handleClaim = (questId: string) => {
    const r = questsApi.claim(questId)
    if (!r.ok) {
      toast.error(r.reason ?? 'Ödül alınamadı')
      return
    }
    if (r.reward) {
      addCoins(r.reward.coins)
      addXp(r.reward.xp)
      toast.success(`+${r.reward.coins} coin, +${r.reward.xp} XP!`)
    }
  }

  const handleClaimAll = () => {
    if (claimableCount === 0) {
      toast.info('Talep edilecek ödül yok')
      return
    }
    const r = questsApi.claimAll()
    if (r.coins > 0) addCoins(r.coins)
    if (r.xp > 0) addXp(r.xp)
    toast.success(`${r.claimed.length} görev ödülü alındı! +${r.coins} coin, +${r.xp} XP`)
  }

  return (
    <Modal open={open} onClose={onClose} title="Günlük Görevler" size="lg">
      {/* ─── Üst özet ───────────────────────────────────────────────── */}
      <div className="mb-4 rounded-xl bg-slate-800/60 ring-1 ring-slate-700 px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <CalendarCheck className="h-5 w-5 text-indigo-400" />
            <span className="font-semibold text-slate-100">Bugün</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Clock className="h-3.5 w-3.5" />
            <span>{today()}</span>
          </div>
        </div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-slate-300">
            {completedCount}/{totalQuests} tamamlandı
          </span>
          {claimableCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-300 ring-1 ring-emerald-500/30">
              <Gift className="h-3 w-3" />
              {claimableCount} ödül hazır
            </span>
          )}
        </div>
        <div className="h-2 w-full rounded-full bg-slate-900 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-linear-to-r from-indigo-500 to-purple-400"
            initial={{ width: 0 }}
            animate={{ width: `${(completedCount / totalQuests) * 100}%` }}
            transition={{ type: 'spring', stiffness: 200, damping: 25 }}
          />
        </div>
      </div>

      {/* ─── Hepsini Al butonu ──────────────────────────────────────── */}
      {claimableCount > 0 && (
        <div className="mb-3">
          <Button variant="success" fullWidth onClick={handleClaimAll}>
            <Gift className="h-4 w-4" />
            Tüm Ödülleri Al ({claimableCount})
          </Button>
        </div>
      )}

      {/* ─── Görev Listesi ──────────────────────────────────────────── */}
      <div className="space-y-2.5">
        {DAILY_QUESTS.map((q, i) => {
          const prog = state.quests[q.id] ?? { progress: 0, completed: false, claimed: false }
          return (
            <QuestCard
              key={q.id}
              quest={q}
              progress={prog}
              index={i}
              onClaim={() => handleClaim(q.id)}
            />
          )
        })}
      </div>

      {/* ─── Alt bilgi ──────────────────────────────────────────────── */}
      <p className="mt-4 flex items-center gap-1.5 text-xs text-slate-500">
        <Clock className="h-3.5 w-3.5" />
        Görevler her gün gece yarısı sıfırlanır. Mevcut coin: <span className="text-amber-400 font-medium">{profile.coins}</span>
      </p>
    </Modal>
  )
}

// ─── Quest Card ──────────────────────────────────────────────────────────────

function QuestCard({
  quest,
  progress,
  index,
  onClaim,
}: {
  quest: typeof DAILY_QUESTS[number]
  progress: QuestProgress
  index: number
  onClaim: () => void
}) {
  const { completed, claimed, progress: cur } = progress
  const percent = Math.min(100, Math.round((cur / quest.goal) * 100))
  const claimable = completed && !claimed

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className={cn(
        'flex items-center gap-3 rounded-xl p-3 ring-1 transition-colors',
        claimed
          ? 'bg-slate-800/30 ring-slate-700/40 opacity-60'
          : completed
            ? 'bg-emerald-500/10 ring-emerald-500/40'
            : 'bg-slate-800/40 ring-slate-700/50',
      )}
    >
      {/* Emoji */}
      <div
        className={cn(
          'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl',
          claimed ? 'bg-slate-900/60 grayscale' : completed ? 'bg-emerald-500/20' : 'bg-slate-900/60',
        )}
      >
        {claimed ? <Check className="h-5 w-5 text-slate-500" /> : <span>{quest.emoji}</span>}
      </div>

      {/* İçerik */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className={cn('text-sm font-semibold truncate', completed ? 'text-emerald-200' : 'text-slate-200')}>
            {quest.title}
          </p>
          {completed && !claimed && (
            <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-medium text-emerald-300">
              Hazır
            </span>
          )}
        </div>
        <p className="text-xs text-slate-400 line-clamp-1">{quest.desc}</p>

        {/* İlerleme barı */}
        {!completed && (
          <div className="mt-1.5 flex items-center gap-2">
            <div className="h-1.5 flex-1 rounded-full bg-slate-900 overflow-hidden">
              <div
                className="h-full rounded-full bg-indigo-500"
                style={{ width: `${percent}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-500 tabular-nums">
              {cur}/{quest.goal}
            </span>
          </div>
        )}

        {/* Ödül */}
        <div className="mt-1 flex items-center gap-2 text-[11px]">
          <span className="inline-flex items-center gap-0.5 text-amber-400">
            <Coins className="h-3 w-3" />
            {quest.rewardCoins}
          </span>
          <span className="inline-flex items-center gap-0.5 text-indigo-400">
            <Sparkles className="h-3 w-3" />
            {quest.rewardXp} XP
          </span>
        </div>
      </div>

      {/* Aksiyon butonu */}
      <div className="shrink-0">
        {claimable ? (
          <Button size="sm" variant="success" onClick={onClaim}>
            <Gift className="h-3.5 w-3.5" />
            Al
          </Button>
        ) : claimed ? (
          <span className="inline-flex items-center gap-1 text-xs text-slate-500">
            <Check className="h-3.5 w-3.5" />
            Alındı
          </span>
        ) : null}
      </div>
    </motion.div>
  )
}
