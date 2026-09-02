import { useEffect, useState } from 'react'
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
  Users,
  X,
  LogOut,
  Flame,
} from 'lucide-react'
import { Button } from '../common/Button'
import { Avatar } from '../common/Avatar'
import { useProfile } from '../../hooks/useProfile'
import { usePwaInstall } from '../../hooks/usePwaInstall'
import { questsApi } from '../../lib/questsApi'
import { authApi } from '../../lib/authApi'
import { supabase } from '../../lib/supabase'
import { statsApi } from '../../lib/profileApi'
import { MarketProfileModal } from './MarketProfileModal'
import { AchievementsModal } from './AchievementsModal'
import { DailyQuestsModal } from './DailyQuestsModal'
import { LeaderboardModal } from './LeaderboardModal'
import { SettingsModal } from './SettingsModal'
import { useToast } from '../common/toast-context'
import { cn } from '../../utils/cn'
import { SocialModal } from './SocialModal'

export interface MainMenuPanelProps {
  /** Offline oyun başlatıldığında çağrılır. */
  onPlay: () => void
  onOnline: () => void
  /** Oda daveti kabul edildiğinde çağrılır — online ekrana geç + odaya katıl */
  onJoinRoom?: (roomCode: string) => void
}

export function MainMenuPanel({ onPlay, onOnline, onJoinRoom }: MainMenuPanelProps) {
  const { profile, inventory } = useProfile()
  const { canInstall, promptInstall } = usePwaInstall()
  const toast = useToast()
  const [profileOpen, setProfileOpen] = useState(false)
  const [achievementsOpen, setAchievementsOpen] = useState(false)
  const [questsOpen, setQuestsOpen] = useState(false)
  const [leaderboardOpen, setLeaderboardOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [socialOpen, setSocialOpen] = useState(false)
  const [pendingRequests, setPendingRequests] = useState(0)
  const [pendingRoomInvites, setPendingRoomInvites] = useState(0)

  // Pending arkadaş isteklerini + oda davetlerini yükle
  useEffect(() => {
    let cancelled = false
    const loadPending = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || cancelled) return
      const [friendsRes, invitesRes] = await Promise.all([
        supabase
          .from('friends')
          .select('*', { count: 'exact', head: true })
          .eq('friend_id', user.id)
          .eq('status', 'pending'),
        supabase
          .from('room_invites')
          .select('*', { count: 'exact', head: true })
          .eq('invitee_id', user.id)
          .eq('status', 'pending'),
      ])
      if (!cancelled) {
        setPendingRequests(friendsRes.count ?? 0)
        setPendingRoomInvites(invitesRes.count ?? 0)
      }
    }
    void loadPending()

    // Realtime: friends + room_invites değişince yeniden yükle
    const channel = supabase
      .channel('pending_requests')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friends' }, () => void loadPending())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_invites' }, () => void loadPending())
      .subscribe()

    return () => { cancelled = true; void supabase.removeChannel(channel) }
  }, [])
  const [quickMenuOpen, setQuickMenuOpen] = useState(false)

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
    <div className="safe-area-top safe-area-bottom relative min-h-dvh w-full overflow-hidden bg-slate-950 text-slate-100 flex flex-col items-center px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-8 sm:pb-12 sm:py-12">
      <div className="pointer-events-none absolute inset-x-0 top-0 mx-auto h-72 max-w-3xl opacity-25" style={{ backgroundImage: "url('/role-duel.png')", backgroundPosition: 'center 18%', backgroundSize: 'cover', maskImage: 'linear-gradient(to bottom, black, transparent)' }} />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-purple-600/15" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-72 w-72 rounded-full bg-cyan-500/10" />
      {/* ─── Başlık ────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        className="relative z-10 mb-2 flex items-center gap-3"
      >
        <motion.span
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          className="flex h-12 w-12 items-center justify-center"
        >
          <img src="/brand-emblem.png" alt="Sahtekar Kim? logosu" className="h-full w-full object-contain drop-shadow-[0_0_14px_rgba(99,102,241,0.45)]" />
        </motion.span>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight bg-linear-to-r from-indigo-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent animate-gradient">
          Sahtekar Kim?
        </h1>
      </motion.div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="relative z-10 mb-8 max-w-sm text-center text-sm leading-6 text-slate-400"
      >
        <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-indigo-400/20 bg-indigo-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-300">
          <Sparkles className="h-3 w-3" /> Gizli rol · bolca şüphe
        </span>
        <span className="block">Arkadaşlarına güvenme… Aranızda kelimeyi bilmeyen biri var. İpucunu ver, blöfünü yap ve sahtekarı yakala!</span>
      </motion.div>

      {quickMenuOpen && <button type="button" aria-label="Menüyü kapat" onClick={() => setQuickMenuOpen(false)} className="fixed inset-0 z-40 bg-slate-950/45 sm:hidden" />}
      {quickMenuOpen && (
        <div className="fixed inset-x-3 bottom-[5.25rem] z-50 mx-auto max-w-md rounded-2xl border border-indigo-400/25 bg-slate-900 p-3 shadow-2xl shadow-black/50 sm:hidden">
          <div className="mb-2 flex items-center justify-between px-1"><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Tüm menüler</p><button type="button" onClick={() => setQuickMenuOpen(false)} aria-label="Menüyü kapat" className="rounded-lg p-2 text-slate-400 hover:bg-slate-800"><X className="h-4 w-4" /></button></div>
          <div className="grid grid-cols-2 gap-2">
            <QuickMenuButton icon={<Users className="h-4 w-4 text-cyan-300" />} label="Sosyal" badge={pendingRequests + pendingRoomInvites} onClick={() => { setQuickMenuOpen(false); setSocialOpen(true) }} />
            <QuickMenuButton icon={<Trophy className="h-4 w-4 text-amber-300" />} label="Liderlik" onClick={() => { setQuickMenuOpen(false); setLeaderboardOpen(true) }} />
            <QuickMenuButton icon={<Award className="h-4 w-4 text-fuchsia-300" />} label="Başarımlar" onClick={() => { setQuickMenuOpen(false); setAchievementsOpen(true) }} />
            <QuickMenuButton icon={<SettingsIcon className="h-4 w-4 text-slate-300" />} label="Ayarlar" onClick={() => { setQuickMenuOpen(false); setSettingsOpen(true) }} />
          </div>
        </div>
      )}
      <nav className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 mx-auto flex h-[4.25rem] max-w-sm items-center justify-between overflow-hidden rounded-[1.35rem] border border-indigo-300/30 bg-slate-950/95 px-2 shadow-2xl shadow-black/60 sm:hidden" aria-label="Mobil menü">
        <MobileNavItem image="/brand-emblem.png" label="Ana Sayfa" active />
        <MobileNavItem image="/menu-icons/offline-play.png" label="Oyna" onClick={onPlay} primary />
        <button type="button" onClick={() => setQuickMenuOpen(!quickMenuOpen)} aria-label="Tüm menüleri aç" className={cn('relative -mt-8 flex h-16 w-16 shrink-0 flex-col items-center justify-end overflow-hidden rounded-full text-white transition-transform hover:scale-105', quickMenuOpen ? 'bg-fuchsia-950/90' : 'bg-transparent')}>
          {!quickMenuOpen && <img src="/brand-emblem.png" alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-contain" />}
          {quickMenuOpen && <X className="absolute top-3 h-6 w-6" />}<span className="relative z-10 mb-1 rounded-full bg-slate-950/75 px-2 py-0.5 text-[9px] font-semibold">Menü</span>
        </button>
        <MobileNavItem image="/menu-icons/market.png" label="Profil" onClick={() => setProfileOpen(true)} />
        <MobileNavItem image="/menu-icons/daily-quests.png" label="Görevler" onClick={() => setQuestsOpen(true)} badge={claimableQuests} />
      </nav>

      {/* ─── Profil Kartı ───────────────────────────────────────────── */}
      <motion.button
        type="button"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.15, type: 'spring', stiffness: 300, damping: 25 }}
        onClick={() => setProfileOpen(true)}
        aria-label="Profili düzenle"
        className="group relative mb-6 flex w-full max-w-md items-center gap-3 overflow-hidden rounded-2xl border border-indigo-300/20 bg-slate-900/95 px-4 py-3 shadow-2xl shadow-indigo-950/30 transition-all hover:-translate-y-0.5 hover:border-indigo-400/50 hover:bg-slate-800 min-h-11"
      >
        <img src="/profile-card-art.png" alt="" aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-55 transition-opacity duration-300 group-hover:opacity-70" />
        <span className="pointer-events-none absolute inset-0 bg-linear-to-r from-slate-950/75 via-slate-950/45 to-indigo-950/20" />
        <span className="relative z-10"><Avatar avatarId={inventory.equippedAvatar} frameId={inventory.equippedFrame} size="md" /></span>
        <div className="relative z-10 flex-1 text-left">
          <p className="font-semibold text-slate-100">{profile.username}</p>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="inline-flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-indigo-400" />
              Seviye {profile.level}
              {profile.level >= 100 && (
                <span className="ml-1 rounded bg-amber-500/20 px-1 text-[9px] font-bold text-amber-300">MAX</span>
              )}
            </span>
            <span className="text-slate-600">•</span>
            <span className="inline-flex items-center gap-1">
              <Coins className="h-3 w-3 text-amber-400" />
              {profile.coins}
            </span>
            <span className="text-slate-600">•</span>
            <span className="inline-flex items-center gap-1 text-amber-300">
              <Trophy className="h-3 w-3" />
              {statsApi.get().points} puan
            </span>
          </div>
          <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-500">
            <span>{statsApi.get().wins}G</span>
            <span className="text-slate-700">·</span>
            <span>{statsApi.get().gamesPlayed} oyun</span>
            <span className="text-slate-700">·</span>
            <span className="inline-flex items-center gap-0.5">
              <Flame className="h-2.5 w-2.5 text-orange-400" />
              {statsApi.get().streak} seri
            </span>
            <span className="text-slate-700">·</span>
            <span className="font-mono text-cyan-400/60">{profile.playerId}</span>
          </div>
        </div>
        <User className="relative z-10 h-5 w-5 text-slate-400" />
      </motion.button>

      {/* ─── Ana Butonlar ───────────────────────────────────────────── */}
      <motion.div
        initial="hidden"
        animate="show"
        variants={{
          hidden: {},
          show: { transition: { staggerChildren: 0.08, delayChildren: 0.25 } },
        }}
        className="menu-buttons flex w-full max-w-md flex-col gap-3"
      >
        <motion.div
          variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
        >
          <Button size="lg" fullWidth onClick={onPlay} className="group relative overflow-hidden menu-primary-button justify-start px-5">
            <img src="/menu-icons/offline-play.png" alt="" aria-hidden="true" className="pointer-events-none absolute -right-3 -top-7 h-28 w-28 object-contain opacity-25 transition-transform duration-300 group-hover:scale-110" />
            <Gamepad2 className="relative z-10 h-5 w-5" />
            <span className="flex-1 text-left"><span className="block">Oyna</span><span className="block text-xs font-medium text-white/70">Aynı cihazda yeni oyun başlat</span></span>
            <span className="rounded-full bg-white/15 px-2 py-1 text-[10px] uppercase tracking-wider">Offline</span>
          </Button>
        </motion.div>
        <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}>
          <Button size="lg" variant="secondary" fullWidth onClick={onOnline} className="group relative overflow-hidden border border-cyan-400/30 bg-linear-to-r from-cyan-500/15 via-indigo-500/15 to-fuchsia-500/10 shadow-lg shadow-cyan-950/20 hover:border-cyan-300/50 hover:bg-cyan-500/20">
            <img src="/online-play.png" alt="" aria-hidden="true" className="pointer-events-none absolute -right-2 -top-8 h-28 w-28 object-contain opacity-35 transition-transform duration-300 group-hover:scale-110" />
            <span className="pointer-events-none absolute inset-y-0 right-0 w-2/3 bg-linear-to-l from-indigo-950/10 to-transparent" />
            <span className="relative z-10 flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-400/15 ring-1 ring-cyan-300/25"><Users className="h-5 w-5 text-cyan-300" /></span>
            <span className="relative z-10 flex-1 text-left"><span className="block">Online Oyna</span><span className="block text-xs font-medium text-slate-400">Arkadaşlarınla aynı odaya katıl</span></span>
            <span className="relative z-10 rounded-full bg-cyan-400/15 px-2 py-1 text-[10px] uppercase tracking-wider text-cyan-300">Beta</span>
          </Button>
        </motion.div>
        <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}>
          <Button size="lg" variant="secondary" fullWidth onClick={() => setLeaderboardOpen(true)} className="group relative overflow-hidden border border-amber-400/15 hover:border-amber-300/35">
            <img src="/menu-icons/leaderboard.png" alt="" aria-hidden="true" className="pointer-events-none absolute -right-3 -top-8 h-28 w-28 object-contain opacity-20 transition-transform duration-300 group-hover:scale-110" />
            <Trophy className="relative z-10 h-5 w-5 text-amber-400" />
            Liderlik Tablosu
          </Button>
        </motion.div>

        <div className="grid grid-cols-2 gap-3">
          <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}>
            <Button size="md" variant="secondary" fullWidth onClick={() => setProfileOpen(true)} className="group relative overflow-hidden">
              <img src="/menu-icons/market.png" alt="" aria-hidden="true" className="pointer-events-none absolute -right-4 -top-5 h-20 w-20 object-contain opacity-20 transition-transform duration-300 group-hover:scale-110" />
              <User className="relative z-10 h-4 w-4" />
              Market
            </Button>
          </motion.div>
          <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}>
            <Button size="md" variant="secondary" fullWidth onClick={() => setAchievementsOpen(true)} className="group relative overflow-hidden">
              <img src="/menu-icons/achievements.png" alt="" aria-hidden="true" className="pointer-events-none absolute -right-4 -top-5 h-20 w-20 object-contain opacity-20 transition-transform duration-300 group-hover:scale-110" />
              <Award className="relative z-10 h-4 w-4" />
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
            className="group relative overflow-hidden"
          >
            <img src="/menu-icons/daily-quests.png" alt="" aria-hidden="true" className="pointer-events-none absolute -right-4 -top-6 h-24 w-24 object-contain opacity-20 transition-transform duration-300 group-hover:scale-110" />
            <CalendarCheck className="relative z-10 h-4 w-4" />
            Günlük Görevler
            {claimableQuests > 0 && (
              <span className="ml-1 inline-flex items-center justify-center rounded-full bg-emerald-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                {claimableQuests}
              </span>
            )}
          </Button>
        </motion.div>

        <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}>
          <Button size="md" variant="secondary" fullWidth onClick={() => setSettingsOpen(true)} className="group relative overflow-hidden">
            <img src="/menu-icons/settings.png" alt="" aria-hidden="true" className="pointer-events-none absolute -right-4 -top-6 h-24 w-24 object-contain opacity-20 transition-transform duration-300 group-hover:scale-110" />
            <SettingsIcon className="relative z-10 h-4 w-4" />
            Ayarlar
          </Button>
        </motion.div>

        <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}>
          <Button size="md" variant="secondary" fullWidth onClick={() => setSocialOpen(true)} className="group relative overflow-hidden">
            <img src="/menu-icons/social.png" alt="" aria-hidden="true" className="pointer-events-none absolute -right-4 -top-6 h-24 w-24 object-contain opacity-20 transition-transform duration-300 group-hover:scale-110" />
            <Users className="relative z-10 h-4 w-4 text-cyan-300" />
            Sosyal
            {(pendingRequests + pendingRoomInvites) > 0 && (
              <span className="ml-1 inline-flex items-center justify-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                {pendingRequests + pendingRoomInvites}
              </span>
            )}
          </Button>
        </motion.div>

        <motion.div variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}>
          <button
            type="button"
            onClick={async () => {
              await authApi.logout()
              window.location.reload()
            }}
            className="group relative flex min-h-11 w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-slate-800/40 px-4 py-2.5 text-sm font-medium text-rose-300 ring-1 ring-rose-500/20 transition-colors hover:bg-rose-500/10 hover:ring-rose-500/40"
          >
            <img src="/menu-icons/logout.png" alt="" aria-hidden="true" className="pointer-events-none absolute -right-4 -top-7 h-24 w-24 object-contain opacity-15 transition-transform duration-300 group-hover:scale-110" />
            <LogOut className="relative z-10 h-4 w-4" />
            <span className="relative z-10">Çıkış Yap</span>
          </button>
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
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="mt-8 flex items-center gap-2 text-xs text-slate-600"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Hazır · Offline oynanabilir · v0.1
      </motion.div>

      {/* ─── Modal'lar ──────────────────────────────────────────────── */}
      <MarketProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
      <AchievementsModal open={achievementsOpen} onClose={() => setAchievementsOpen(false)} />
      <DailyQuestsModal open={questsOpen} onClose={() => setQuestsOpen(false)} />
      <LeaderboardModal open={leaderboardOpen} onClose={() => setLeaderboardOpen(false)} />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} onLogout={() => window.location.reload()} />
      <SocialModal open={socialOpen} onClose={() => setSocialOpen(false)} onJoinRoom={onJoinRoom} />
    </div>
  )
}

function MobileNavItem({ image, label, onClick, active, primary, badge = 0 }: { image: string; label: string; onClick?: () => void; active?: boolean; primary?: boolean; badge?: number }) {
  return (
    <button type="button" onClick={onClick} className={cn('relative flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-1 text-[10px] font-medium transition-colors', primary ? 'bg-indigo-500/20 text-indigo-200' : active ? 'text-indigo-300' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100')}>
      <img src={image} alt="" aria-hidden="true" className="h-7 w-9 object-contain" /><span>{label}</span>
      {badge > 0 && <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500 px-1 text-[9px] font-bold text-white">{badge}</span>}
    </button>
  )
}

function QuickMenuButton({ icon, label, badge, onClick }: { icon: React.ReactNode; label: string; badge?: number; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="relative flex min-h-11 items-center gap-2 rounded-xl bg-slate-800 px-3 py-2 text-left text-sm font-medium text-slate-200 transition-colors hover:bg-slate-700">
      {icon}
      <span>{label}</span>
      {badge != null && badge > 0 && <span className="absolute right-2 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">{badge}</span>}
    </button>
  )
}
