import { motion } from 'motion/react'
import { Lock, Check, Trophy } from 'lucide-react'
import { Modal } from '../common/Modal'
import { useProfile } from '../../hooks/useProfile'
import { achievementsApi } from '../../lib/achievementsApi'
import { statsApi } from '../../lib/profileApi'
import { ACHIEVEMENTS } from '../../config/achievements'
import { cn } from '../../utils/cn'

export interface AchievementsModalProps {
  open: boolean
  onClose: () => void
}

export function AchievementsModal({ open, onClose }: AchievementsModalProps) {
  const { profile } = useProfile()
  const unlocked = achievementsApi.get()
  const stats = statsApi.get()

  const totalCount = ACHIEVEMENTS.length
  const unlockedCount = ACHIEVEMENTS.filter((a) => unlocked[a.id]).length
  const progressPercent = Math.round((unlockedCount / totalCount) * 100)

  return (
    <Modal open={open} onClose={onClose} title="Başarımlar" size="lg">
      {/* ─── Özet ───────────────────────────────────────────────────── */}
      <div className="mb-4 rounded-xl bg-slate-800/60 ring-1 ring-slate-700 px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-400" />
            <span className="font-semibold text-slate-100">İlerleme</span>
          </div>
          <span className="text-sm font-semibold text-amber-300 tabular-nums">
            {unlockedCount}/{totalCount}
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-slate-900 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-linear-to-r from-amber-500 to-yellow-400"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ type: 'spring', stiffness: 200, damping: 25 }}
          />
        </div>
        <p className="mt-1.5 text-xs text-slate-400">
          %{progressPercent} tamamlandı · {profile.coins} coin mevcut
        </p>
      </div>

      {/* ─── Başarım Listesi ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {ACHIEVEMENTS.map((ach, i) => {
          const isUnlocked = Boolean(unlocked[ach.id])
          const current = stats[ach.condition.stat] ?? 0
          const target = ach.condition.value
          const itemProgress = Math.min(100, Math.round((current / target) * 100))
          const tier = current >= target * 5 ? 'Platin' : current >= target * 2 ? 'Elmas' : isUnlocked ? 'Altın' : current >= target / 2 ? 'Gümüş' : 'Bronz'
          const tierClass = tier === 'Platin' ? 'text-slate-200' : tier === 'Elmas' ? 'text-cyan-300' : tier === 'Altın' ? 'text-amber-300' : tier === 'Gümüş' ? 'text-slate-300' : 'text-orange-300'

          return (
            <motion.div
              key={ach.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className={cn(
                'flex items-start gap-3 rounded-xl p-3 ring-1 transition-colors',
                isUnlocked
                  ? 'bg-amber-500/10 ring-amber-500/40'
                  : 'bg-slate-800/40 ring-slate-700/50',
              )}
            >
              {/* Emoji / Lock */}
              <div
                className={cn(
                  'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl',
                  isUnlocked ? 'bg-amber-500/20' : 'bg-slate-900/60 grayscale',
                )}
              >
                <span className="absolute inset-0 bg-[length:400%_400%] bg-no-repeat" style={{ backgroundImage: "url('/achievement-badges.png')", backgroundPosition: `${(i % 4) * 33.333}% ${Math.min(3, Math.floor(i / 4)) * 33.333}%` }} />
                {!isUnlocked && <span className="absolute inset-0 flex items-center justify-center rounded-xl bg-slate-950/55"><Lock className="h-5 w-5 text-slate-300" /></span>}
              </div>

              {/* İçerik */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className={cn('text-sm font-semibold truncate', isUnlocked ? 'text-amber-200' : 'text-slate-300')}>
                    {ach.title}
                  </p>
                  {isUnlocked && <Check className="h-3.5 w-3.5 text-amber-400 shrink-0" />}
                </div>
                <p className="text-xs text-slate-400 line-clamp-2">{ach.desc}</p>
                {ach.reward && <p className="mt-1 text-[10px] font-medium text-emerald-300">Ödül: {ach.reward.label}</p>}
                <p className={cn('mt-1 text-[10px] font-semibold uppercase tracking-wider', tierClass)}>{tier} seviye</p>

                {/* İlerleme barı (kilitliyse) */}
                {!isUnlocked && (
                  <div className="mt-1.5">
                    <div className="h-1 w-full rounded-full bg-slate-900 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-slate-600"
                        style={{ width: `${itemProgress}%` }}
                      />
                    </div>
                    <p className="mt-0.5 text-[10px] text-slate-500 tabular-nums">
                      {current}/{target}
                    </p>
                  </div>
                )}

                {/* Unlock tarihi (açıkysa) */}
                {isUnlocked && unlocked[ach.id] && (
                  <p className="mt-0.5 text-[10px] text-amber-400/60">
                    {new Date(unlocked[ach.id] as number).toLocaleDateString('tr-TR')}
                  </p>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>
    </Modal>
  )
}
