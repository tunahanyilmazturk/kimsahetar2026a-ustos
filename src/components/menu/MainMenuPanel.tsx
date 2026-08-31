import { useState } from 'react'
import { motion } from 'motion/react'
import {
  Trophy,
  Settings as SettingsIcon,
  User,
  Coins,
  Download,
  Gamepad2,
  Sparkles,
  Award,
  CalendarCheck,
} from 'lucide-react'
import { Button } from '../common/Button'
import { Avatar } from '../common/Avatar'
import { useProfile } from '../../hooks/useProfile'
import { usePwaInstall } from '../../hooks/usePwaInstall'
import { questsApi } from '../../lib/questsApi'
import { MarketProfileModal } from './MarketProfileModal'
import { AchievementsModal } from './AchievementsModal'
import { DailyQuestsModal } from './DailyQuestsModal'
import { LeaderboardModal } from './LeaderboardModal'
import { SettingsModal } from './SettingsModal'
import { useToast } from '../common/toast-context'

export interface MainMenuPanelProps {
  /** Offline oyun başlatıldığında çağrılır. */
  onPlay: () => void
}

export function MainMenuPanel({ onPlay }: MainMenuPanelProps) {
  const { profile, inventory } = useProfile()
  const { canInstall, promptInstall } = usePwaInstall()
  const toast = useToast()
  const [profileOpen, setProfileOpen] = useState(false)
  const [achievementsOpen, setAchievementsOpen] = useState(false)
  const [questsOpen, setQuestsOpen] = useState(false)
  const [leaderboardOpen, setLeaderboardOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  // Günlük görev rozet sayacı (talep edilebilir ödül)
  const questState = questsApi.get()
  const claimableQuests = questState.quests
    ? Object.values(questState.quests).filter((q) => q.completed && !q.claimed).length
    : 0

  const handleInstall = async () => {
    const ok = await promptInstall()
    if (ok) toast.success('Uygulama ana ekrana eklendi!')
    else toast.info('Install iptal edildi')
  }

  return (
    <div className="min-h-svh w-full bg-slate-950 text-slate-100 flex flex-col items-center px-4 py-8 sm:py-12">
      {/* ─── Başlık ────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        className="mb-2 flex items-center gap-3"
      >
        <motion.span
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          className="text-4xl"
        >
          🎭
        </motion.span>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight bg-linear-to-r from-indigo-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent animate-gradient">
          Sahtekar Kim?
        </h1>
      </motion.div>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="mb-8 text-sm text-slate-400 text-center max-w-sm"
      >
        Aynı cihazda oynanan sosyal-deduction oyunu. Sahtekarı yakala veya kelimeyi tahmin et!
      </motion.p>

      {/* ─── Profil Kartı ───────────────────────────────────────────── */}
      <motion.button
        type="button"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.15, type: 'spring', stiffness: 300, damping: 25 }}
        onClick={() => setProfileOpen(true)}
        aria-label="Profili düzenle"
        className="mb-6 flex w-full max-w-md items-center gap-3 rounded-2xl bg-slate-900/80 ring-1 ring-slate-800 px-4 py-3 shadow-xl transition-colors hover:ring-indigo-500/50 min-h-11"
      >
        <Avatar avatarId={inventory.equippedAvatar} frameId={inventory.equippedFrame} size="md" />
        <div className="flex-1 text-left">
          <p className="font-semibold text-slate-100">{profile.username}</p>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="inline-flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-indigo-400" />
              Seviye {profile.level}
            </span>
            <span className="text-slate-600">•</span>
            <span className="inline-flex items-center gap-1">
              <Coins className="h-3 w-3 text-amber-400" />
              {profile.coins}
            </span>
          </div>
        </div>
        <User className="h-5 w-5 text-slate-500" />
      </motion.button>

      {/* ─── Ana Butonlar ───────────────────────────────────────────── */}
      <motion.div
        initial="hidden"
        animate="show"
        variants={{
          hidden: {},
          show: { transition: { staggerChildren: 0.08, delayChildren: 0.25 } },
        }}
        className="flex w-full max-w-md flex-col gap-3"
      >
        <motion.div
          variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
        >
          <Button size="lg" fullWidth onClick={onPlay}>
            <Gamepad2 className="h-5 w-5" />
            Oyna (Offline)
          </Button>
        </motion.div>

        <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}>
          <Button size="lg" variant="secondary" fullWidth onClick={() => setLeaderboardOpen(true)}>
            <Trophy className="h-5 w-5 text-amber-400" />
            Liderlik Tablosu
          </Button>
        </motion.div>

        <div className="grid grid-cols-2 gap-3">
          <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}>
            <Button size="md" variant="secondary" fullWidth onClick={() => setProfileOpen(true)}>
              <User className="h-4 w-4" />
              Market
            </Button>
          </motion.div>
          <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}>
            <Button size="md" variant="secondary" fullWidth onClick={() => setAchievementsOpen(true)}>
              <Award className="h-4 w-4" />
              Başarımlar
            </Button>
          </motion.div>
        </div>

        <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}>
          <Button
            size="md"
            variant="secondary"
            fullWidth
            onClick={() => setQuestsOpen(true)}
          >
            <CalendarCheck className="h-4 w-4" />
            Günlük Görevler
            {claimableQuests > 0 && (
              <span className="ml-1 inline-flex items-center justify-center rounded-full bg-emerald-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                {claimableQuests}
              </span>
            )}
          </Button>
        </motion.div>

        <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}>
          <Button size="md" variant="secondary" fullWidth onClick={() => setSettingsOpen(true)}>
            <SettingsIcon className="h-4 w-4" />
            Ayarlar
          </Button>
        </motion.div>

        {/* PWA install — sadece install edilebilir durumda göster */}
        {canInstall && (
          <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}>
            <Button size="md" variant="ghost" fullWidth onClick={handleInstall}>
              <Download className="h-4 w-4" />
              Ana Ekrana Ekle
            </Button>
          </motion.div>
        )}
      </motion.div>

      {/* ─── Alt bilgi ──────────────────────────────────────────────── */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mt-8 text-xs text-slate-600"
      >
        v0.1 · Backend'siz MVP · localStorage
      </motion.p>

      {/* ─── Modal'lar ──────────────────────────────────────────────── */}
      <MarketProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
      <AchievementsModal open={achievementsOpen} onClose={() => setAchievementsOpen(false)} />
      <DailyQuestsModal open={questsOpen} onClose={() => setQuestsOpen(false)} />
      <LeaderboardModal open={leaderboardOpen} onClose={() => setLeaderboardOpen(false)} />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}
