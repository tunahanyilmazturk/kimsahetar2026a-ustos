import { useState } from 'react'
import { motion } from 'motion/react'
import { Coins, Check, Lock, User, Award, Sparkles, ShoppingBag, Shield, Gem, Copy, TrendingUp, Flame, Target, Skull, Eye, Trophy, Zap, Gamepad2 } from 'lucide-react'
import { Modal } from '../common/Modal'
import { Button } from '../common/Button'
import { Avatar, RarityBadge } from '../common/Avatar'
import { useToast } from '../common/toast-context'
import { useProfile } from '../../hooks/useProfile'
import { ALL_AVATARS, AVATAR_MAP } from '../../config/customShopAvatars'
import { AVATAR_FRAMES, AVATAR_FRAME_MAP } from '../../config/avatarFrames'
import { ACHIEVEMENTS } from '../../config/achievements'
import { achievementsApi } from '../../lib/achievementsApi'
import { statsApi, xpForLevel, xpForLevelStart, MAX_LEVEL } from '../../lib/profileApi'
import { cn } from '../../utils/cn'

type Tab = 'profile' | 'avatars' | 'frames' | 'achievements'

export interface MarketProfileModalProps {
  open: boolean
  onClose: () => void
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'profile', label: 'Profil' },
  { id: 'avatars', label: 'Avatarlar' },
  { id: 'frames', label: 'Çerçeveler' },
  { id: 'achievements', label: 'Başarımlar' },
]

export function MarketProfileModal({ open, onClose }: MarketProfileModalProps) {
  const [tab, setTab] = useState<Tab>('profile')
  const { profile, inventory, updateProfile, buyAvatar, buyFrame, equipAvatar, equipFrame } =
    useProfile()
  const toast = useToast()
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState(profile.username)
  const ownedAvatars = inventory.avatars.length
  const ownedFrames = inventory.frames.length
  const stats = statsApi.get()
  const winRate = stats.gamesPlayed ? Math.round((stats.wins / stats.gamesPlayed) * 100) : 0
  const impostorWinRate = stats.winsAsImpostor > 0 && stats.gamesPlayed > 0
    ? Math.round((stats.winsAsImpostor / stats.gamesPlayed) * 100) : 0
  const playerWinRate = stats.winsAsPlayer > 0 && stats.gamesPlayed > 0
    ? Math.round((stats.winsAsPlayer / stats.gamesPlayed) * 100) : 0
  // XP bar — yeni progresyona göre
  const isMaxLevel = profile.level >= MAX_LEVEL
  const xpNeeded = isMaxLevel ? 0 : xpForLevel(profile.level)
  const xpStart = xpForLevelStart(profile.level)
  const xpInLevel = isMaxLevel ? 0 : profile.xp - xpStart
  const xpProgress = isMaxLevel ? 100 : xpNeeded > 0 ? Math.min(100, Math.round((xpInLevel / xpNeeded) * 100)) : 0
  // Mağlubiyet
  const losses = stats.gamesPlayed - stats.wins

  const handleSaveName = () => {
    const trimmed = nameDraft.trim()
    if (!trimmed) {
      toast.warning('İsim boş olamaz')
      return
    }
    if (trimmed.length > 16) {
      toast.warning('İsim en fazla 16 karakter')
      return
    }
    updateProfile({ username: trimmed })
    setEditingName(false)
    toast.success('İsim güncellendi')
  }

  const copyPlayerId = async () => {
    await navigator.clipboard?.writeText(profile.playerId)
    toast.success('Oyuncu ID kopyalandı')
  }

  const handleBuyAvatar = (id: string, price: number) => {
    const r = buyAvatar(id, price)
    if (r.ok) toast.success('Avatar satın alındı!')
    else toast.error(r.reason ?? 'Satın alma başarısız')
  }

  const handleBuyFrame = (id: string, price: number) => {
    const r = buyFrame(id, price)
    if (r.ok) toast.success('Çerçeve satın alındı!')
    else toast.error(r.reason ?? 'Satın alma başarısız')
  }

  const handleEquipAvatar = (id: string) => {
    if (equipAvatar(id)) toast.success('Avatar donatıldı')
  }

  const handleEquipFrame = (id: string | null) => {
    if (equipFrame(id)) toast.success(id ? 'Çerçeve donatıldı' : 'Çerçeve kaldırıldı')
  }

  return (
    <Modal open={open} onClose={onClose} title="Profil & Market" size="lg">
      {/* Üst özet — coin + level */}
      <div className="relative mb-4 overflow-hidden rounded-2xl border border-indigo-400/20 bg-slate-900 px-4 py-4 shadow-lg shadow-indigo-950/20">
        <div className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-55" style={{ backgroundImage: "url('/profile-card-bg.png')" }} aria-hidden="true" />
        <div className="pointer-events-none absolute inset-0 bg-linear-to-r from-slate-950/35 via-slate-950/10 to-slate-950/45" aria-hidden="true" />
        <div className="relative z-10">
        <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar avatarId={inventory.equippedAvatar} frameId={inventory.equippedFrame} size="lg" />
          <div>
            <p className="font-semibold text-slate-100">{profile.username}</p>
            <p className="text-sm text-slate-400">Seviye {profile.level}</p>
            <button type="button" onClick={copyPlayerId} className="mt-1 inline-flex items-center gap-1 rounded-md bg-slate-950/40 px-2 py-1 text-[11px] font-mono text-cyan-300 hover:bg-slate-950/70" aria-label="Oyuncu ID'sini kopyala">
              {profile.playerId} <Copy className="h-3 w-3" />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-3 py-1.5 text-amber-300 ring-1 ring-amber-500/30">
          <Coins className="h-4 w-4" />
          <span className="font-semibold tabular-nums">{profile.coins}</span>
        </div>
        </div>
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between text-[11px] text-slate-400">
            <span className="inline-flex items-center gap-1"><Sparkles className="h-3 w-3 text-indigo-300" /> Seviye ilerlemesi</span>
            <span>{isMaxLevel ? 'MAX Seviye' : `${xpInLevel}/${xpNeeded} XP`}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-950/70">
            <div className="h-full rounded-full bg-linear-to-r from-indigo-400 to-fuchsia-400 transition-all" style={{ width: `${xpProgress}%` }} />
          </div>
          {!isMaxLevel && (
            <p className="mt-1 text-[10px] text-slate-500">
              Bir sonraki seviyeye {xpNeeded - xpInLevel} XP
            </p>
          )}
        </div>
        </div>
      </div>

      {/* Tab seçici */}
      <div className="mb-4 flex gap-1 rounded-xl bg-slate-800/60 p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              'flex min-w-0 flex-1 items-center justify-center gap-1 rounded-lg px-1.5 py-2 text-xs font-medium transition-colors min-h-11 whitespace-nowrap',
              tab === t.id ? 'bg-slate-700 text-slate-100' : 'text-slate-400 hover:text-slate-200',
            )}
          >
            {t.id === 'avatars' && <ShoppingBag className="h-3.5 w-3.5" />}
            {t.id === 'frames' && <Shield className="h-3.5 w-3.5" />}
            {t.id === 'achievements' && <Award className="h-3.5 w-3.5" />}
            {t.label}
            {t.id === 'avatars' && <span className="text-[10px] opacity-70">{ownedAvatars}</span>}
            {t.id === 'frames' && <span className="text-[10px] opacity-70">{ownedFrames}</span>}
          </button>
        ))}
      </div>

      {/* ─── Profil tab ──────────────────────────────────────────────── */}
      {tab === 'profile' && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-4"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800 ring-1 ring-slate-700">
              <User className="h-5 w-5 text-slate-400" />
            </div>
            <div className="flex-1">
              {editingName ? (
                <div className="flex gap-2">
                  <input
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    maxLength={16}
                    aria-label="Kullanıcı adı"
                    className="flex-1 rounded-lg bg-slate-800 px-3 py-2 text-slate-100 ring-1 ring-slate-700 focus:outline-none focus:ring-indigo-400"
                    autoFocus
                  />
                  <Button size="sm" onClick={handleSaveName}>
                    Kaydet
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-100">{profile.username}</span>
                  <Button size="sm" variant="ghost" onClick={() => { setNameDraft(profile.username); setEditingName(true) }}>
                    Düzenle
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Stat label="Oyuncu ID" value={profile.playerId} />
            <Stat label="Seviye" value={profile.level} />
            <Stat label="XP" value={profile.xp} />
            <Stat label="Avatar" value={AVATAR_MAP[inventory.equippedAvatar]?.name ?? '-'} />
            <Stat
              label="Çerçeve"
              value={
                inventory.equippedFrame
                  ? AVATAR_FRAME_MAP[inventory.equippedFrame]?.name ?? '-'
                  : 'Çerçevesiz'
              }
            />
          </div>

          {/* ─── Detaylı İstatistik Paneli ─────────────────────────────── */}
          <div className="rounded-xl border border-slate-700/70 bg-slate-800/40 p-3">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Oyun İstatistikleri</p>

            {/* Üst satır — ana metrikler */}
            <div className="grid grid-cols-4 gap-2">
              <StatCard icon={Trophy} label="Galibiyet" value={stats.wins} color="text-amber-300" />
              <StatCard icon={Target} label="Mağlubiyet" value={losses} color="text-rose-300" />
              <StatCard icon={TrendingUp} label="Kazanma %" value={`%${winRate}`} color="text-emerald-300" />
              <StatCard icon={Gamepad2} label="Oyun" value={stats.gamesPlayed} color="text-indigo-300" />
            </div>

            {/* Orta satır — rol bazlı */}
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-slate-900/60 px-3 py-2 ring-1 ring-slate-700/50">
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Skull className="h-3 w-3 text-rose-400" />
                  <span>Sahtekar Galibiyeti</span>
                </div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-lg font-bold text-rose-300 tabular-nums">{stats.winsAsImpostor}</span>
                  <span className="text-[10px] text-slate-500">(%{impostorWinRate} oran)</span>
                </div>
              </div>
              <div className="rounded-lg bg-slate-900/60 px-3 py-2 ring-1 ring-slate-700/50">
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Eye className="h-3 w-3 text-cyan-400" />
                  <span>Dedektif Galibiyeti</span>
                </div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-lg font-bold text-cyan-300 tabular-nums">{stats.winsAsPlayer}</span>
                  <span className="text-[10px] text-slate-500">(%{playerWinRate} oran)</span>
                </div>
              </div>
            </div>

            {/* Alt satır — seri ve puan */}
            <div className="mt-2 grid grid-cols-3 gap-2">
              <div className="rounded-lg bg-slate-900/60 px-3 py-2 text-center ring-1 ring-slate-700/50">
                <Flame className="mx-auto h-3.5 w-3.5 text-orange-400" />
                <p className="mt-1 text-lg font-bold text-orange-300 tabular-nums">{stats.streak}</p>
                <p className="text-[10px] text-slate-500">Aktif Seri</p>
              </div>
              <div className="rounded-lg bg-slate-900/60 px-3 py-2 text-center ring-1 ring-slate-700/50">
                <Zap className="mx-auto h-3.5 w-3.5 text-yellow-400" />
                <p className="mt-1 text-lg font-bold text-yellow-300 tabular-nums">{stats.bestStreak}</p>
                <p className="text-[10px] text-slate-500">En İyi Seri</p>
              </div>
              <div className="rounded-lg bg-slate-900/60 px-3 py-2 text-center ring-1 ring-slate-700/50">
                <Trophy className="mx-auto h-3.5 w-3.5 text-amber-400" />
                <p className="mt-1 text-lg font-bold text-amber-300 tabular-nums">{stats.points}</p>
                <p className="text-[10px] text-slate-500">Toplam Puan</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-700/70 bg-slate-800/40 p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Donanım vitrini</p>
              <p className="text-[10px] text-slate-500">Koleksiyon: {ownedAvatars} avatar · {ownedFrames} çerçeve</p>
            </div>
            <div className="flex items-center gap-4">
              <Avatar avatarId={inventory.equippedAvatar} frameId={inventory.equippedFrame} size="lg" />
              <div className="min-w-0 space-y-1">
                <p className="truncate text-sm font-semibold text-slate-100">{AVATAR_MAP[inventory.equippedAvatar]?.name ?? 'Avatar'}</p>
                <p className="truncate text-xs text-slate-400">{inventory.equippedFrame ? AVATAR_FRAME_MAP[inventory.equippedFrame]?.name : 'Çerçevesiz'}</p>
                <p className="text-[11px] text-indigo-300">Profilini özelleştirmek için koleksiyona göz at.</p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ─── Avatarlar tab ───────────────────────────────────────────── */}
      {tab === 'avatars' && (
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          className="grid min-w-0 grid-cols-2 sm:grid-cols-3 items-start gap-3 max-h-[48svh] overflow-y-auto pr-1"
        >
          {ALL_AVATARS.map((a) => {
            const owned = inventory.avatars.includes(a.id)
            const equipped = inventory.equippedAvatar === a.id
            return (
              <div
                key={a.id}
                className={cn(
                  'group flex min-w-0 h-[236px] flex-col items-center gap-2 overflow-visible rounded-xl border p-3 ring-1 transition-all hover:-translate-y-0.5',
                  equipped ? 'ring-indigo-500 bg-indigo-500/10' : 'ring-slate-700 bg-slate-800/40',
                )}
              >
                <div className="relative"><Avatar avatarId={a.id} size="lg" hideFrame />{a.rarity === 'LEGENDARY' && <Gem className="absolute -right-1 -top-1 h-4 w-4 text-fuchsia-300" />}</div>
                <div className="text-center">
                  <p className="min-h-10 text-center text-sm font-medium leading-5 text-slate-100">{a.name}</p>
                  <RarityBadge rarity={a.rarity} />
                </div>
                {equipped ? (
                  <span className="inline-flex items-center gap-1 text-xs text-indigo-300">
                    <Check className="h-3.5 w-3.5" /> Donatıldı
                  </span>
                ) : owned ? (
                  <Button size="sm" variant="secondary" fullWidth onClick={() => handleEquipAvatar(a.id)}>
                    Donat
                  </Button>
                ) : (
                  <Button size="sm" fullWidth onClick={() => handleBuyAvatar(a.id, a.price)}>
                    <Coins className="h-3.5 w-3.5" /> {a.price}
                  </Button>
                )}
              </div>
            )
          })}
        </motion.div>
      )}

      {/* ─── Çerçeveler tab ──────────────────────────────────────────── */}
      {tab === 'frames' && (
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          className="grid min-w-0 grid-cols-2 sm:grid-cols-3 items-start gap-3 max-h-[48svh] overflow-y-auto pr-1"
        >
          {AVATAR_FRAMES.map((f) => {
            const owned = inventory.frames.includes(f.id)
            const equipped = inventory.equippedFrame === f.id
            return (
              <div
                key={f.id}
                className={cn(
                  'flex flex-col items-center gap-2 rounded-xl p-3 ring-1 transition-colors',
                  equipped ? 'ring-indigo-500 bg-indigo-500/10' : 'ring-slate-700 bg-slate-800/40',
                )}
              >
                <Avatar avatarId={inventory.equippedAvatar} frameId={f.id} size="lg" />
                <div className="text-center">
                  <p className="text-sm font-medium text-slate-100">{f.name}</p>
                  <RarityBadge rarity={f.rarity} />
                </div>
                {equipped ? (
                  <span className="inline-flex items-center gap-1 text-xs text-indigo-300">
                    <Check className="h-3.5 w-3.5" /> Donatıldı
                  </span>
                ) : owned ? (
                  <Button size="sm" variant="secondary" fullWidth onClick={() => handleEquipFrame(f.id)}>
                    Donat
                  </Button>
                ) : f.price === 0 ? (
                  <Button size="sm" variant="secondary" fullWidth onClick={() => handleEquipFrame(f.id)}>
                    <Lock className="h-3.5 w-3.5" /> Ücretsiz
                  </Button>
                ) : (
                  <Button size="sm" fullWidth onClick={() => handleBuyFrame(f.id, f.price)}>
                    <Coins className="h-3.5 w-3.5" /> {f.price}
                  </Button>
                )}
              </div>
            )
          })}
        </motion.div>
      )}

      {/* ─── Başarımlar tab ─────────────────────────────────────────── */}
      {tab === 'achievements' && (
        <AchievementsTab />
      )}
    </Modal>
  )
}

// ─── Başarımlar Tab (MarketProfileModal içinde) ──────────────────────────────

function AchievementsTab() {
  const unlocked = achievementsApi.get()
  const stats = statsApi.get()
  const totalCount = ACHIEVEMENTS.length
  const unlockedCount = ACHIEVEMENTS.filter((a) => unlocked[a.id]).length
  const progressPercent = Math.round((unlockedCount / totalCount) * 100)

  return (
    <motion.div
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-3"
    >
      {/* Özet */}
      <div className="rounded-xl bg-slate-800/60 ring-1 ring-slate-700 px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Award className="h-4 w-4 text-amber-400" />
            <span className="text-sm font-semibold text-slate-200">İlerleme</span>
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
      </div>

      {/* Liste */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[40svh] overflow-y-auto pr-1">
        {ACHIEVEMENTS.map((ach) => {
          const isUnlocked = Boolean(unlocked[ach.id])
          const current = stats[ach.condition.stat] ?? 0
          const target = ach.condition.value
          const itemProgress = Math.min(100, Math.round((current / target) * 100))

          return (
            <div
              key={ach.id}
              className={cn(
                'flex items-start gap-2.5 rounded-xl p-2.5 ring-1',
                isUnlocked
                  ? 'bg-amber-500/10 ring-amber-500/40'
                  : 'bg-slate-800/40 ring-slate-700/50',
              )}
            >
              <div
                className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-base',
                  isUnlocked ? 'bg-amber-500/20' : 'bg-slate-900/60 grayscale',
                )}
              >
                {isUnlocked ? <span>{ach.emoji}</span> : <Lock className="h-4 w-4 text-slate-500" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <p className={cn('text-xs font-semibold truncate', isUnlocked ? 'text-amber-200' : 'text-slate-300')}>
                    {ach.title}
                  </p>
                  {isUnlocked && <Check className="h-3 w-3 text-amber-400 shrink-0" />}
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-1">{ach.desc}</p>
                {ach.reward && (
                  <p className="mt-1 truncate text-[10px] font-medium text-emerald-300">
                    Ödül: {ach.reward.label}{isUnlocked ? ' · Kazanıldı' : ''}
                  </p>
                )}
                {!isUnlocked && (
                  <div className="mt-1 flex items-center gap-1.5">
                    <div className="h-1 flex-1 rounded-full bg-slate-900 overflow-hidden">
                      <div className="h-full rounded-full bg-slate-600" style={{ width: `${itemProgress}%` }} />
                    </div>
                    <span className="text-[10px] text-slate-500 tabular-nums">{current}/{target}</span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </motion.div>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-slate-800/40 ring-1 ring-slate-700 px-3 py-2.5">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="font-semibold text-slate-100 truncate">{value}</p>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color }: { icon: typeof Trophy; label: string; value: string | number; color: string }) {
  return (
    <div className="rounded-lg bg-slate-900/60 px-2 py-2 text-center ring-1 ring-slate-700/50">
      <Icon className={cn('mx-auto h-3.5 w-3.5', color)} />
      <p className={cn('mt-1 text-sm font-bold tabular-nums', color)}>{value}</p>
      <p className="text-[9px] text-slate-500">{label}</p>
    </div>
  )
}
