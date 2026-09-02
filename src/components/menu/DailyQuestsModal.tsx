import { useState } from 'react'
import { motion } from 'motion/react'
import { Check, Gift, Clock, Coins, Sparkles, CalendarCheck, CalendarDays } from 'lucide-react'
import { Modal } from '../common/Modal'
import { Button } from '../common/Button'
import { useToast } from '../common/toast-context'
import { useProfile } from '../../hooks/useProfile'
import { questsApi } from '../../lib/questsApi'
import { DAILY_QUESTS, MONTHLY_QUESTS, WEEKLY_QUESTS } from '../../config/dailyQuests'
import { cn } from '../../utils/cn'
import type { QuestProgress } from '../../types'

export interface DailyQuestsModalProps {
  open: boolean
  onClose: () => void
}

export function DailyQuestsModal({ open, onClose }: DailyQuestsModalProps) {
  const { profile, addReward } = useProfile()
  const toast = useToast()
  const [, refresh] = useState(0)
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly' | 'monthly'>('daily')

  const state = questsApi.get()
  const weeklyState = questsApi.getWeekly()
  const monthlyState = questsApi.getMonthly()
  const totalQuests = DAILY_QUESTS.length
  const completedCount = DAILY_QUESTS.filter((q) => state.quests[q.id]?.completed).length
  const claimableCount = DAILY_QUESTS.filter((q) => {
    const p = state.quests[q.id]
    return p?.completed && !p.claimed
  }).length
  const remaining = timeUntilReset()

  const handleClaim = (questId: string) => {
    const r = questsApi.claim(questId)
    if (!r.ok) {
      toast.error(r.reason ?? 'Ödül alınamadı')
      return
    }
    if (r.reward) {
      addReward(r.reward.coins, r.reward.xp)
      refresh((value) => value + 1)
      toast.success(`+${r.reward.coins} coin, +${r.reward.xp} XP!`)
    }
  }

  const handleClaimAll = () => {
    if (claimableCount === 0) {
      toast.info('Talep edilecek ödül yok')
      return
    }
    const r = questsApi.claimAll()
    if (r.claimed.length > 0) {
      addReward(r.coins, r.xp)
      refresh((value) => value + 1)
    }
    toast.success(`${r.claimed.length} görev ödülü alındı! +${r.coins} coin, +${r.xp} XP`)
  }
  const handleWeeklyClaim = (id: string) => {
    const r = questsApi.claimWeekly(id)
    if (r.ok && r.reward) {
      addReward(r.reward.coins, r.reward.xp)
      refresh((value) => value + 1)
      toast.success(`Haftalık ödül: +${r.reward.coins} coin, +${r.reward.xp} XP`)
    } else toast.error(r.reason ?? 'Ödül alınamadı')
  }
  const handleMonthlyClaim = (id: string) => {
    const r = questsApi.claimMonthly(id)
    if (r.ok && r.reward) {
      addReward(r.reward.coins, r.reward.xp)
      refresh((value) => value + 1)
      toast.success(`Aylık ödül: +${r.reward.coins} coin, +${r.reward.xp} XP`)
    } else toast.error(r.reason ?? 'Ödül alınamadı')
  }

  return (
    <Modal open={open} onClose={onClose} title="Günlük Görevler" size="lg">
      <div className="mb-4 grid grid-cols-3 gap-1 rounded-xl bg-slate-900/80 p-1 ring-1 ring-slate-700/70">
        {([
          ['daily', 'Günlük', CalendarCheck],
          ['weekly', 'Haftalık', CalendarDays],
          ['monthly', 'Aylık', CalendarDays],
        ] as const).map(([tab, label, Icon]) => (
          <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={cn('flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-bold transition-colors', activeTab === tab ? 'bg-indigo-500/25 text-indigo-200 ring-1 ring-indigo-400/40' : 'text-slate-500 hover:text-slate-300')}>
            <Icon className="h-3.5 w-3.5" /> {label}
          </button>
        ))}
      </div>

      {activeTab === 'daily' && <>
      {/* ─── Üst özet ───────────────────────────────────────────────── */}
      <div className="mb-4 rounded-xl bg-slate-800/60 ring-1 ring-slate-700 px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <CalendarCheck className="h-5 w-5 text-indigo-400" />
            <span className="font-semibold text-slate-100">Bugün</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Clock className="h-3.5 w-3.5" />
            <span>Yenilenmeye {remaining}</span>
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
      </>}

      {activeTab === 'weekly' && <section className="border-t border-slate-800 pt-4">
        <div className="mb-3 flex items-center justify-between"><div><h3 className="font-semibold text-slate-100">Haftalık Görevler</h3><p className="text-xs text-slate-500">Her hafta yenilenir · büyük ödüller</p></div><span className="text-xs text-cyan-300">{WEEKLY_QUESTS.filter((q) => weeklyState.quests[q.id]?.completed).length}/{WEEKLY_QUESTS.length}</span></div>
        <div className="space-y-2">{WEEKLY_QUESTS.map((q) => { const p = weeklyState.quests[q.id] ?? { progress: 0, completed: false, claimed: false }; return <div key={q.id} className="flex items-center gap-3 rounded-xl bg-slate-800/50 p-3 ring-1 ring-slate-700/60"><span className="text-xl">{q.emoji}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-200">{q.title}</p><div className="mt-1 flex items-center gap-2"><div className="h-1.5 flex-1 rounded-full bg-slate-900"><div className="h-full rounded-full bg-cyan-500" style={{ width: `${Math.min(100, p.progress / q.goal * 100)}%` }} /></div><span className="text-[10px] text-slate-500">{p.progress}/{q.goal}</span></div></div>{p.completed && !p.claimed && <Button size="sm" variant="success" onClick={() => handleWeeklyClaim(q.id)}>Al</Button>}{p.claimed && <Check className="h-4 w-4 text-emerald-300" />}</div> })}</div>
      </section>
      }

      {activeTab === 'monthly' && <section className="border-t border-slate-800 pt-4">
        <div className="mb-3 flex items-center justify-between"><div><h3 className="font-semibold text-slate-100">Aylık Görevler</h3><p className="text-xs text-slate-500">Ay sonunda yenilenir · en büyük ödüller</p></div><span className="text-xs text-violet-300">{MONTHLY_QUESTS.filter((q) => monthlyState.quests[q.id]?.completed).length}/{MONTHLY_QUESTS.length}</span></div>
        <div className="space-y-2">{MONTHLY_QUESTS.map((q) => { const p = monthlyState.quests[q.id] ?? { progress: 0, completed: false, claimed: false }; return <QuestCard key={q.id} quest={q} progress={p} index={q.id.length} onClaim={() => handleMonthlyClaim(q.id)} /> })}</div>
      </section>}

      {/* ─── Alt bilgi ──────────────────────────────────────────────── */}
      <p className="mt-4 flex items-center gap-1.5 text-xs text-slate-500">
        <Clock className="h-3.5 w-3.5" />
        {activeTab === 'daily' ? 'Günlük görevler her gün yenilenir.' : activeTab === 'weekly' ? 'Haftalık görevler her pazartesi yenilenir.' : 'Aylık görevler her ayın ilk günü yenilenir.'} Mevcut coin: <span className="text-amber-400 font-medium">{profile.coins}</span>
      </p>
    </Modal>
  )
}

function timeUntilReset(): string {
  const now = new Date()
  const midnight = new Date(now)
  midnight.setHours(24, 0, 0, 0)
  const minutes = Math.max(1, Math.ceil((midnight.getTime() - now.getTime()) / 60000))
  const hours = Math.floor(minutes / 60)
  return hours > 0 ? `${hours}sa ${minutes % 60}dk`
    : `${minutes}dk`
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
