import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  Trash2,
  Bot,
  Settings as SettingsIcon,
  Play,
  ArrowLeft,
  Users,
  UserPlus,
} from 'lucide-react'
import { Button } from '../common/Button'
import { Avatar } from '../common/Avatar'
import { useToast } from '../common/toast-context'
import { RoomSettingsModal } from './RoomSettingsModal'
import { randomId } from '../../utils/wordPool'
import { cn } from '../../utils/cn'
import type { Player, GameSettings } from '../../types'

export interface LobbyScreenProps {
  players: Player[]
  onPlayersChange: (players: Player[]) => void
  settings: GameSettings
  onSettingsChange: (patch: Partial<GameSettings>) => void
  onStart: () => void
  onExit: () => void
}

const BOT_NAMES = ['Robot', 'Alpha', 'Beta', 'Gamma', 'Delta', 'Zeta', 'Omega', 'Sigma', 'Theta', 'Kappa', 'Lambda', 'Mu']

export function LobbyScreen({
  players,
  onPlayersChange,
  settings,
  onSettingsChange,
  onStart,
  onExit,
}: LobbyScreenProps) {
  const toast = useToast()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [newName, setNewName] = useState('')

  const realPlayers = useMemo(() => players.filter((p) => !p.isBot), [players])
  const botPlayers = useMemo(() => players.filter((p) => p.isBot), [players])
  const canStart = players.length >= 3 && players.length <= 12

  const addPlayer = () => {
    const name = newName.trim()
    if (!name) {
      toast.warning('İsim boş olamaz')
      return
    }
    if (name.length > 16) {
      toast.warning('İsim en fazla 16 karakter')
      return
    }
    if (players.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
      toast.warning('Bu isim zaten var')
      return
    }
    if (players.length >= 12) {
      toast.warning('En fazla 12 oyuncu')
      return
    }
    const player: Player = {
      id: randomId('p_'),
      name,
      avatar: 'avatar_default',
      score: 0,
      isReady: true,
      isBot: false,
    }
    onPlayersChange([...players, player])
    setNewName('')
  }

  const addBot = () => {
    if (players.length >= 12) {
      toast.warning('En fazla 12 oyuncu')
      return
    }
    // Kullanılmayan bot ismi bul
    const usedNames = new Set(players.map((p) => p.name))
    const availableName = BOT_NAMES.find((n) => !usedNames.has(n)) ?? `Bot${botPlayers.length + 1}`
    const bot: Player = {
      id: randomId('b_'),
      name: availableName,
      avatar: 'avatar_cool',
      score: 0,
      isReady: true,
      isBot: true,
      botDifficulty: settings.botDifficulty,
    }
    onPlayersChange([...players, bot])
  }

  const removePlayer = (id: string) => {
    onPlayersChange(players.filter((p) => p.id !== id))
  }

  const handleStart = () => {
    if (!canStart) {
      toast.warning('En az 3 oyuncu gerekli')
      return
    }
    onStart()
  }

  return (
    <div className="min-h-svh w-full bg-slate-950 text-slate-100 flex flex-col px-4 py-6">
      {/* ─── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <button
          type="button"
          onClick={onExit}
          className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors min-h-11"
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="text-sm">Geri</span>
        </button>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Users className="h-5 w-5 text-indigo-400" />
          Lobi
        </h1>
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          aria-label="Oda ayarları"
          className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors min-h-11"
        >
          <SettingsIcon className="h-5 w-5" />
          <span className="text-sm hidden sm:inline">Ayarlar</span>
        </button>
      </div>

      {/* ─── Oyuncu Ekleme ──────────────────────────────────────────── */}
      <div className="mb-4 flex gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addPlayer()}
          placeholder="Oyuncu ismi..."
          maxLength={16}
          aria-label="Oyuncu ismi"
          className="flex-1 rounded-xl bg-slate-900 px-4 py-3 text-slate-100 ring-1 ring-slate-700 focus:outline-none focus:ring-indigo-400 placeholder:text-slate-500"
        />
        <Button onClick={addPlayer} disabled={!newName.trim()} aria-label="Oyuncu ekle">
          <UserPlus className="h-4 w-4" />
          <span className="hidden sm:inline">Ekle</span>
        </Button>
      </div>

      {/* ─── Oyuncu Listesi ─────────────────────────────────────────── */}
      <div className="flex-1 space-y-2 mb-4">
        <AnimatePresence>
          {players.map((p, i) => (
            <motion.div
              key={p.id}
              layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="flex items-center gap-3 rounded-xl bg-slate-900/80 ring-1 ring-slate-800 px-4 py-3"
            >
              <span className="w-6 text-center text-sm font-medium text-slate-500 tabular-nums">
                {i + 1}
              </span>
              <Avatar avatarId={p.avatar} size="sm" hideFrame />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-100 truncate">{p.name}</p>
                {p.isBot && (
                  <p className="text-xs text-indigo-400 flex items-center gap-1">
                    <Bot className="h-3 w-3" />
                    {p.botDifficulty === 'EASY' ? 'Kolay Bot' : p.botDifficulty === 'SMART' ? 'Akıllı Bot' : 'Uzman Bot'}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => removePlayer(p.id)}
                className="text-slate-400 hover:text-rose-400 transition-colors p-1.5 min-h-11 min-w-11 flex items-center justify-center"
                aria-label={`${p.name} kaldır`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>

        {players.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <Users className="h-12 w-12 text-slate-700" />
            <p className="text-slate-400">Henüz oyuncu yok</p>
            <p className="text-sm text-slate-500">İsim girerek oyuncu ekle veya bot ekle</p>
          </div>
        )}
      </div>

      {/* ─── Alt Bilgi ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between text-sm text-slate-400 mb-3">
        <span>
          {realPlayers.length} oyuncu · {botPlayers.length} bot
        </span>
        <span className={cn(canStart ? 'text-emerald-400' : 'text-amber-400')}>
          {players.length}/3+ oyuncu
        </span>
      </div>

      {/* ─── Butonlar ───────────────────────────────────────────────── */}
      <div className="flex gap-3">
        <Button variant="secondary" onClick={addBot} disabled={players.length >= 12}>
          <Bot className="h-4 w-4" />
          Bot Ekle
        </Button>
        <Button variant="success" fullWidth onClick={handleStart} disabled={!canStart}>
          <Play className="h-5 w-5" />
          Başlat ({players.length})
        </Button>
      </div>

      <RoomSettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onChange={onSettingsChange}
      />
    </div>
  )
}
