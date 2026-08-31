import { useState } from 'react'
import { motion } from 'motion/react'
import {
  Trophy,
  AlertTriangle,
  Sparkles,
  RotateCcw,
  Home,
  Send,
  Check,
  X,
  Star,
} from 'lucide-react'
import { Button } from '../common/Button'
import { Avatar } from '../common/Avatar'
import { cn } from '../../utils/cn'
import type { Player, Winner, Award } from '../../types'

export interface FinishedScreenProps {
  players: Player[]
  impostorId: string
  word: string
  category: string
  winner: Winner
  /** En çok oy alan oyuncu (tahmin edilen sahtekar). */
  votedImpostorId: string | null
  /** Sahtekarın kelime tahmini (varsa). */
  impostorGuess: string | null
  /** Ödüller (playerId -> Award). */
  awards?: Record<string, Award>
  onImpostorGuess: (guess: string) => void
  onPlayAgain: () => void
  onExit: () => void
}

export function FinishedScreen({
  players,
  impostorId,
  word,
  category,
  winner,
  votedImpostorId,
  impostorGuess,
  awards,
  onImpostorGuess,
  onPlayAgain,
  onExit,
}: FinishedScreenProps) {
  // ─── Alt-state: reveal | guess (sahtekar yakalanmadıysa) | result ────────────
  const [phase, setPhase] = useState<'reveal' | 'guess' | 'result'>('reveal')
  const [guessText, setGuessText] = useState('')

  const impostor = players.find((p) => p.id === impostorId)
  const impostorCaught = votedImpostorId === impostorId

  // ─── Reveal: sahtekar kim ───────────────────────────────────────────────────
  const handleRevealContinue = () => {
    if (impostorCaught) {
      // Sahtekar yakalandı → sahtekara kelime tahmini şansı
      setPhase('guess')
    } else {
      // Sahtekar yakalanmadı → sahtekar kazanır
      setPhase('result')
    }
  }

  // ─── Guess: sahtekar kelime tahmini ─────────────────────────────────────────
  const handleGuess = () => {
    const guess = guessText.trim()
    if (!guess) return
    onImpostorGuess(guess)
    setPhase('result')
  }

  const handleSkipGuess = () => {
    onImpostorGuess('')
    setPhase('result')
  }

  // ─── REVEAL phase ───────────────────────────────────────────────────────────
  if (phase === 'reveal') {
    return (
      <div className="min-h-svh w-full bg-slate-950 text-slate-100 flex flex-col items-center justify-center px-6 py-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 250, damping: 22 }}
          className="w-full max-w-md flex flex-col items-center gap-6"
        >
          <motion.div
            animate={{ rotate: [0, -8, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <AlertTriangle className="h-16 w-16 text-rose-400" />
          </motion.div>

          <h1 className="text-2xl font-bold text-rose-300">Sahtekar Açığa Çıktı!</h1>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col items-center gap-3 rounded-2xl bg-linear-to-br from-rose-950/60 to-red-950/40 ring-2 ring-rose-500/50 p-6 w-full"
          >
            <Avatar avatarId={impostor?.avatar ?? 'avatar_default'} size="xl" hideFrame />
            <div className="text-center">
              <p className="text-sm text-rose-300/70">Sahtekar:</p>
              <p className="text-2xl font-bold text-rose-200">{impostor?.name}</p>
            </div>
          </motion.div>

          {/* Oylama sonucu */}
          {votedImpostorId && (
            <div className={cn(
              'rounded-xl px-4 py-3 ring-1 text-center w-full',
              impostorCaught
                ? 'bg-emerald-500/10 ring-emerald-500/40'
                : 'bg-amber-500/10 ring-amber-500/40',
            )}>
              {impostorCaught ? (
                <p className="text-emerald-300">
                  <Check className="inline h-4 w-4 mr-1" />
                  Doğru tahmin edildi! Sahtekar yakalandı.
                </p>
              ) : (
                <p className="text-amber-300">
                  <X className="inline h-4 w-4 mr-1" />
                  Yanlış tahmin: {players.find((p) => p.id === votedImpostorId)?.name}
                  {' '}suçlandı ama sahtekar değildi.
                </p>
              )}
            </div>
          )}

          <Button size="lg" fullWidth onClick={handleRevealContinue}>
            Devam Et
          </Button>
        </motion.div>
      </div>
    )
  }

  // ─── GUESS phase (sahtekar yakalandıysa son şans) ───────────────────────────
  if (phase === 'guess') {
    return (
      <div className="min-h-svh w-full bg-slate-950 text-slate-100 flex flex-col items-center justify-center px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md flex flex-col items-center gap-6"
        >
          <div className="text-center">
            <motion.div
              animate={{ rotate: [0, -5, 5, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="mb-3 flex justify-center"
            >
              <Sparkles className="h-12 w-12 text-amber-400" />
            </motion.div>
            <h1 className="text-2xl font-bold text-amber-300 mb-2">Son Şans!</h1>
            <p className="text-sm text-slate-400">
              Sahtekar yakalandı ama kelimeyi bilirse yine de kazanır.
              <br />
              <span className="text-amber-200 font-semibold">{impostor?.name}</span>, kelimeyi tahmin et!
            </p>
          </div>

          <div className="w-full rounded-xl bg-slate-900/80 ring-1 ring-slate-800 p-4">
            <p className="text-xs text-slate-500 mb-1">İpucu / Kategori:</p>
            <p className="text-sm text-slate-300">{category}</p>
          </div>

          <div className="w-full flex gap-2">
            <input
              value={guessText}
              onChange={(e) => setGuessText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleGuess()}
              placeholder="Kelime tahminin..."
              maxLength={30}
              className="flex-1 rounded-xl bg-slate-900 px-4 py-3 text-slate-100 ring-1 ring-slate-700 focus:outline-none focus:ring-amber-400 placeholder:text-slate-500"
              autoFocus
            />
            <Button onClick={handleGuess} disabled={!guessText.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>

          <button
            onClick={handleSkipGuess}
            className="text-sm text-slate-500 hover:text-slate-300 transition-colors min-h-11 px-3"
          >
            Tahmin yapmadan geç
          </button>
        </motion.div>
      </div>
    )
  }

  // ─── RESULT phase ───────────────────────────────────────────────────────────
  const playersWon = winner === 'PLAYERS'
  const guessCorrect = impostorGuess && impostorGuess.toLowerCase() === word.toLowerCase()

  return (
    <div className="min-h-svh w-full bg-slate-950 text-slate-100 flex flex-col items-center px-4 py-6 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md flex flex-col items-center gap-5"
      >
        {/* ─── Kazanan banner ───────────────────────────────────────── */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 18, delay: 0.1 }}
          className={cn(
            'w-full rounded-2xl p-6 text-center ring-2',
            playersWon
              ? 'bg-linear-to-br from-emerald-950/60 to-green-950/40 ring-emerald-500/50 shadow-2xl shadow-emerald-500/20'
              : 'bg-linear-to-br from-rose-950/60 to-red-950/40 ring-rose-500/50 shadow-2xl shadow-rose-500/20',
          )}
        >
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="mb-2 flex justify-center"
          >
            {playersWon ? (
              <Trophy className="h-14 w-14 text-emerald-400" />
            ) : (
              <AlertTriangle className="h-14 w-14 text-rose-400" />
            )}
          </motion.div>
          <h1 className={cn('text-3xl font-bold', playersWon ? 'text-emerald-300' : 'text-rose-300')}>
            {playersWon ? 'Oyuncular Kazandı!' : 'Sahtekar Kazandı!'}
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            {playersWon
              ? impostorCaught && !guessCorrect
                ? 'Sahtekar yakalandı ve kelimeyi bilemedi.'
                : 'Sahtekar yakalanamadı.'
              : impostorCaught && guessCorrect
                ? 'Sahtekar yakalandı ama kelimeyi bildi!'
                : 'Sahtekar yakalanamadı.'}
          </p>
        </motion.div>

        {/* ─── Kelime reveal ─────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="w-full rounded-xl bg-slate-900/80 ring-1 ring-slate-800 p-4 text-center"
        >
          <p className="text-xs text-slate-500 mb-1">Kelime:</p>
          <p className="text-2xl font-bold text-slate-100">{word}</p>
          <p className="text-xs text-slate-400 mt-1">Kategori: {category}</p>
          {impostorGuess && (
            <p className={cn('mt-2 text-sm', guessCorrect ? 'text-emerald-400' : 'text-rose-400')}>
              Sahtekarın tahmini: "{impostorGuess}"{' '}
              {guessCorrect ? <Check className="inline h-4 w-4" /> : <X className="inline h-4 w-4" />}
            </p>
          )}
        </motion.div>

        {/* ─── Sahtekar kartı ────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="w-full flex items-center gap-3 rounded-xl bg-rose-950/30 ring-1 ring-rose-500/30 p-3"
        >
          <Avatar avatarId={impostor?.avatar ?? 'avatar_default'} size="md" hideFrame />
          <div className="flex-1">
            <p className="text-xs text-rose-300/70">Sahtekar:</p>
            <p className="font-semibold text-rose-200">{impostor?.name}</p>
          </div>
          <span className={cn(
            'rounded-full px-2.5 py-1 text-xs font-medium',
            playersWon ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300',
          )}>
            {playersWon ? 'Kaybetti' : 'Kazandı'}
          </span>
        </motion.div>

        {/* ─── Ödüller ───────────────────────────────────────────────── */}
        {awards && Object.keys(awards).length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="w-full"
          >
            <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-300">
              <Star className="h-4 w-4 text-amber-400" />
              Ödüller
            </h3>
            <div className="space-y-1.5">
              {Object.entries(awards).map(([playerId, award]) => {
                const player = players.find((p) => p.id === playerId)
                if (!player) return null
                return (
                  <motion.div
                    key={playerId}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 }}
                    className="flex items-center gap-3 rounded-lg bg-slate-800/40 ring-1 ring-slate-700/50 px-3 py-2"
                  >
                    <span className="text-xl">{award.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-200 truncate">{player.name}</p>
                      <p className="text-xs text-slate-400 truncate">{award.title}</p>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
        )}

        {/* ─── Butonlar ──────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="w-full flex gap-3 mt-2"
        >
          <Button variant="secondary" onClick={onExit}>
            <Home className="h-4 w-4" />
            Menü
          </Button>
          <Button variant="success" fullWidth onClick={onPlayAgain}>
            <RotateCcw className="h-5 w-5" />
            Tekrar Oyna
          </Button>
        </motion.div>
      </motion.div>
    </div>
  )
}
