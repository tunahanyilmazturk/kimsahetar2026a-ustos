import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import {
  Send,
  SkipForward,
  Timer,
  Eye,
  Vote,
  ArrowLeft,
  Users,
  MessageSquare,
} from 'lucide-react'
import { Button } from '../common/Button'
import { Avatar } from '../common/Avatar'
import { ChatPanel } from './ChatPanel'
import { PlayerList } from './PlayerList'
import { cn } from '../../utils/cn'
import type { Player, ChatMessage, GameSettings } from '../../types'

export interface PlayingScreenProps {
  players: Player[]
  turnIndex: number
  round: number
  chat: ChatMessage[]
  settings: GameSettings
  /** Sıradaki oyuncu sahtekar mı? */
  isCurrentImpostor: boolean
  /** Sıradaki oyuncunun kelimeyi görme durumu (sahtekar görmez). */
  currentWord: string
  currentHint: string
  currentCategory: string
  /** Bu turda ipucu vermiş oyuncular. */
  hintedThisRound: Set<string>
  /** Bu turda pas geçmiş oyuncular. */
  passedThisRound: Set<string>
  /** Oyunda pas hakkı kalmayan oyuncular (oyun bazlı). */
  passUsed: Record<string, boolean>
  /** Oylama başlatılabilir mi (roundsBeforeVoting şartı). */
  canStartVoting: boolean
  onSendHint: (text: string) => void
  onPass: () => void
  onStartVoting: () => void
  onExit: () => void
}

export function PlayingScreen({
  players,
  turnIndex,
  round,
  chat,
  settings,
  isCurrentImpostor,
  currentWord,
  currentHint,
  currentCategory,
  hintedThisRound,
  passedThisRound,
  passUsed,
  canStartVoting,
  onSendHint,
  onPass,
  onStartVoting,
  onExit,
}: PlayingScreenProps) {
  // ─── Alt-state: 'pass' (cihazı geç) | 'write' (ipucu yaz) ───────────────────
  const [phase, setPhase] = useState<'pass' | 'write'>(() => (players[turnIndex]?.isBot ? 'write' : 'pass'))
  const [hintText, setHintText] = useState('')
  const [timeLeft, setTimeLeft] = useState(settings.turnTimeLimit)
  const [confirmVoting, setConfirmVoting] = useState(false)
  const timedOutRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const currentPlayer = players[turnIndex]
  const canPass = !passUsed[currentPlayer?.id ?? '']
  const totalRounds = settings.roundsBeforeVoting

  // ─── Timer ──────────────────────────────────────────────────────────────────
  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  // Write phase'e geçince timer başlat (sadece interval yönetimi — setState yok)
  useEffect(() => {
    if (phase !== 'write') {
      stopTimer()
      return
    }
    timedOutRef.current = false
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          if (timedOutRef.current) return 0
          timedOutRef.current = true
          stopTimer()
          // Süre doldu → otomatik pas (eğer pas hakkı varsa) veya boş ipucu
          if (canPass) {
            onPass()
          } else {
            onSendHint('...')
          }
          return 0
        }
        return t - 1
      })
    }, 1000)
    return stopTimer
  }, [phase, canPass, onPass, onSendHint, stopTimer])

  // ─── Aksiyonlar ─────────────────────────────────────────────────────────────
  const handleSend = () => {
    const text = hintText.trim()
    if (!text) return
    if (text.length > 100) return
    stopTimer()
    onSendHint(text)
    setHintText('')
  }

  const handlePass = () => {
    stopTimer()
    onPass()
  }

  const handleReady = () => {
    setTimeLeft(settings.turnTimeLimit)
    setPhase('write')
  }

  if (!currentPlayer) return null

  const timePercent = (timeLeft / settings.turnTimeLimit) * 100
  const timeUrgent = timeLeft <= 10

  // ─── PASS phase: cihazı geç ─────────────────────────────────────────────────
  if (phase === 'pass') {
    return (
      <div className="min-h-svh w-full bg-slate-950 text-slate-100 flex flex-col items-center justify-center px-6 py-8">
        <motion.div
          key={`pass-${turnIndex}`}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 280, damping: 25 }}
          className="w-full max-w-md flex flex-col items-center gap-6"
        >
          <div className="text-center">
            <p className="text-sm text-slate-400 mb-1">Tur {round}/{totalRounds}</p>
            <p className="text-slate-300">Cihazı şu oyuncuya ver:</p>
          </div>

          <div className="flex flex-col items-center gap-3">
            <Avatar avatarId={currentPlayer.avatar} size="xl" hideFrame />
            <h2 className="text-2xl font-bold text-indigo-300">{currentPlayer.name}</h2>
          </div>

          <Button size="lg" fullWidth onClick={handleReady}>
            <Eye className="h-5 w-5" />
            Hazırım, Göster
          </Button>

          <p className="text-center text-xs text-slate-500">
            Diğer oyuncular ekranı görmemeli!
          </p>

          {/* İpucu özeti (önceki ipuçları) */}
          {chat.length > 0 && (
            <div className="w-full rounded-xl bg-slate-900/60 ring-1 ring-slate-800 p-3 max-h-32 overflow-y-auto">
              <p className="text-xs text-slate-500 mb-1.5">Önceki ipuçları:</p>
              <div className="space-y-1">
                {chat.slice(-3).map((m) => (
                  <p key={m.id} className="text-xs text-slate-400">
                    <span className="text-slate-500">{m.playerName}:</span> {m.text}
                  </p>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    )
  }

  // ─── WRITE phase: ipucu yaz ─────────────────────────────────────────────────
  return (
    <div className="min-h-svh w-full bg-slate-950 text-slate-100 flex flex-col px-4 py-4">
      {/* ─── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={onExit}
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors min-h-11"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-xs">Çık</span>
        </button>
        <div className="flex items-center gap-2">
          <span className="rounded-lg bg-slate-800 px-2.5 py-1 text-xs text-slate-300">
            Tur {round}/{totalRounds}
          </span>
          {/* Timer */}
          <div className={cn(
            'flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold tabular-nums ring-1',
            timeUrgent ? 'bg-rose-500/15 text-rose-300 ring-rose-500/40' : 'bg-slate-800 text-slate-300 ring-slate-700',
          )}>
            <Timer className="h-3.5 w-3.5" />
            {timeLeft}sn
          </div>
        </div>
      </div>

      {/* Timer bar */}
      <div className="mb-3 h-1 w-full rounded-full bg-slate-800 overflow-hidden">
        <motion.div
          className={cn('h-full rounded-full', timeUrgent ? 'bg-rose-500' : 'bg-indigo-500')}
          animate={{ width: `${timePercent}%` }}
          transition={{ duration: 1, ease: 'linear' }}
        />
      </div>

      {/* ─── Sıradaki oyuncu + kelime ───────────────────────────────── */}
      <motion.div
        key={`write-${turnIndex}`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-3 rounded-xl bg-slate-900/80 ring-1 ring-slate-800 p-3"
      >
        <div className="flex items-center gap-3">
          <Avatar avatarId={currentPlayer.avatar} size="sm" hideFrame />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-indigo-300 truncate">
              Sıra: {currentPlayer.name}
            </p>
          </div>
        </div>

        {/* Kelime (sahtekar değilse) */}
        <div className="mt-3">
          {isCurrentImpostor ? (
            <div className="rounded-lg bg-rose-950/40 ring-1 ring-rose-500/30 px-3 py-2.5">
              <p className="text-xs text-rose-300/70 mb-0.5">Sen sahtekarsın — kelimeyi bilmiyorsun</p>
              <p className="text-sm text-rose-200">Kategori: <span className="font-semibold">{currentCategory}</span></p>
            </div>
          ) : (
            <div className="rounded-lg bg-indigo-950/40 ring-1 ring-indigo-500/30 px-3 py-2.5">
              <p className="text-xs text-indigo-300/70 mb-0.5">Kelimen:</p>
              <p className="text-lg font-bold text-slate-100">{currentWord}</p>
              <p className="text-xs text-slate-400 mt-0.5">{currentHint}</p>
            </div>
          )}
        </div>
      </motion.div>

      {/* ─── İçerik: Chat + PlayerList ──────────────────────────────── */}
      <div className="flex-1 grid grid-cols-1 sm:grid-cols-[1fr_220px] gap-3 min-h-0">
        {/* Chat */}
        <div className="flex flex-col rounded-xl bg-slate-900/40 ring-1 ring-slate-800 p-2 min-h-0">
          <div className="flex items-center gap-1.5 px-1 py-1 mb-1">
            <MessageSquare className="h-3.5 w-3.5 text-slate-500" />
            <span className="text-xs font-medium text-slate-400">İpuçları ({chat.length})</span>
          </div>
          <ChatPanel
            messages={chat}
            players={players}
            currentTurnPlayerId={currentPlayer.id}
            className="flex-1 max-h-[40svh] sm:max-h-none"
          />
        </div>

        {/* PlayerList — desktop'ta sağda, mobile'da altta */}
        <div className="flex flex-col rounded-xl bg-slate-900/40 ring-1 ring-slate-800 p-2 min-h-0 order-2 sm:order-none">
          <div className="flex items-center gap-1.5 px-1 py-1 mb-1">
            <Users className="h-3.5 w-3.5 text-slate-500" />
            <span className="text-xs font-medium text-slate-400">Oyuncular</span>
          </div>
          <PlayerList
            players={players}
            turnIndex={turnIndex}
            hintedThisRound={hintedThisRound}
            passedThisRound={passedThisRound}
            className="flex-1 overflow-y-auto"
          />
        </div>
      </div>

      {/* ─── İpucu yazma alanı (gerçek oyuncu) / Bot bekleme ─────────── */}
      {currentPlayer.isBot ? (
        <div className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-slate-900/60 ring-1 ring-slate-800 px-4 py-3 text-slate-400">
          <span className="h-4 w-4 rounded-full border-2 border-slate-700 border-t-indigo-400 animate-spin" />
          <span className="text-sm">{currentPlayer.name} düşünüyor...</span>
        </div>
      ) : (
        <div className="mt-3 flex gap-2">
          <input
            value={hintText}
            onChange={(e) => setHintText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={isCurrentImpostor ? 'İpucu ver (kelimeyi tahmin etmeye çalış)...' : 'İpucu yaz...'}
            maxLength={100}
            aria-label="İpucu"
            className="flex-1 rounded-xl bg-slate-900 px-4 py-3 text-slate-100 ring-1 ring-slate-700 focus:outline-none focus:ring-indigo-400 placeholder:text-slate-500"
            autoFocus
          />
          {canPass && (
            <Button variant="secondary" onClick={handlePass} disabled={hintText.trim().length > 0} aria-label="Pas geç">
              <SkipForward className="h-4 w-4" />
              <span className="hidden sm:inline">Pas</span>
            </Button>
          )}
          <Button onClick={handleSend} disabled={!hintText.trim()} aria-label="İpucu gönder">
            <Send className="h-4 w-4" />
            <span className="hidden sm:inline">Gönder</span>
          </Button>
        </div>
      )}

      {/* ─── Oylama başlat ──────────────────────────────────────────── */}
      {canStartVoting && !confirmVoting && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-2"
        >
          <Button variant="danger" fullWidth size="sm" onClick={() => setConfirmVoting(true)}>
            <Vote className="h-4 w-4" />
            Oylamayı Başlat
          </Button>
        </motion.div>
      )}
      {canStartVoting && confirmVoting && (
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Button variant="secondary" size="sm" onClick={() => setConfirmVoting(false)}>Vazgeç</Button>
          <Button variant="danger" size="sm" onClick={onStartVoting}>Evet, Oyla</Button>
        </div>
      )}
    </div>
  )
}
