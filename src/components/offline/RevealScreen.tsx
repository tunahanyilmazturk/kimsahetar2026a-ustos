import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Eye, EyeOff, ArrowRight, AlertTriangle, Sparkles } from 'lucide-react'
import { Button } from '../common/Button'
import { Avatar } from '../common/Avatar'
import type { Player } from '../../types'

export interface RevealScreenProps {
  players: Player[]
  currentIndex: number
  /** Bu oyuncu sahtekar mı? */
  isImpostor: boolean
  /** Sahtekar olmayanların gördüğü kelime. */
  word: string
  /** Kelimenin kategorisi (ipucu). */
  category: string
  /** Kelimenin ipucu. */
  hint: string
  /** Bir sonraki oyuncuya geç. */
  onNext: () => void
}

export function RevealScreen({
  players,
  currentIndex,
  isImpostor,
  word,
  category,
  hint,
  onNext,
}: RevealScreenProps) {
  const [revealed, setRevealed] = useState(false)
  const player = players[currentIndex]
  const isLast = currentIndex === players.length - 1

  if (!player) return null

  return (
    <div className="min-h-svh w-full bg-slate-950 text-slate-100 flex flex-col items-center justify-center px-6 py-8">
      {/* ─── İlerleme ───────────────────────────────────────────────── */}
      <div className="mb-8 flex items-center gap-2">
        {players.map((p, i) => (
          <div
            key={p.id}
            className={`h-2 rounded-full transition-all ${
              i < currentIndex ? 'w-2 bg-emerald-500' : i === currentIndex ? 'w-8 bg-indigo-500' : 'w-2 bg-slate-700'
            }`}
          />
        ))}
      </div>

      {/* ─── Oyuncu Kartı ───────────────────────────────────────────── */}
      <motion.div
        key={player.id}
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 280, damping: 25 }}
        className="w-full max-w-md flex flex-col items-center gap-6"
      >
        <div className="flex flex-col items-center gap-3">
          <Avatar avatarId={player.avatar} size="xl" hideFrame />
          <h2 className="text-2xl font-bold text-slate-100">{player.name}</h2>
          <p className="text-sm text-slate-400">
            Sıra {currentIndex + 1} / {players.length}
          </p>
        </div>

        {/* ─── Reveal Butonu ────────────────────────────────────────── */}
        {!revealed && (
          <div className="flex flex-col items-center gap-4 py-8">
            <p className="text-center text-slate-300 max-w-xs">
              Cihazı sadece <span className="font-semibold text-indigo-300">{player.name}</span> görmeli.
              Diğer oyuncular bakmasın!
            </p>
            <Button size="lg" onClick={() => setRevealed(true)}>
              <Eye className="h-5 w-5" />
              Rolümü Gör
            </Button>
          </div>
        )}

        {/* ─── Reveal İçeriği ───────────────────────────────────────── */}
        <AnimatePresence>
          {revealed && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="w-full"
            >
              {isImpostor ? (
                /* ─── Sahtekar Kartı ─────────────────────────────────── */
                <div className="rounded-2xl bg-linear-to-br from-rose-950/60 to-red-950/40 ring-2 ring-rose-500/50 p-6 text-center shadow-2xl shadow-rose-500/20">
                  <div className="mb-3 flex justify-center">
                    <motion.div
                      animate={{ rotate: [0, -5, 5, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <AlertTriangle className="h-12 w-12 text-rose-400" />
                    </motion.div>
                  </div>
                  <h3 className="text-xl font-bold text-rose-300 mb-2">Sen Sahtekarsın!</h3>
                  <p className="text-sm text-rose-200/80 mb-4">
                    Kelimeyi bilmiyorsun. Diğer oyuncuların ipuçlarından kelimeyi tahmin etmeye çalış.
                    Yakalanma!
                  </p>
                  <div className="rounded-xl bg-slate-950/50 px-4 py-3 ring-1 ring-rose-500/30">
                    <p className="text-xs text-rose-300/70 mb-1">Kategori</p>
                    <p className="text-lg font-semibold text-rose-200">{category}</p>
                  </div>
                </div>
              ) : (
                /* ─── Oyuncu Kartı ───────────────────────────────────── */
                <div className="rounded-2xl bg-linear-to-br from-indigo-950/60 to-purple-950/40 ring-2 ring-indigo-500/50 p-6 text-center shadow-2xl shadow-indigo-500/20">
                  <div className="mb-3 flex justify-center">
                    <Sparkles className="h-12 w-12 text-indigo-400" />
                  </div>
                  <h3 className="text-xl font-bold text-indigo-300 mb-2">Kelimen</h3>
                  <div className="rounded-xl bg-slate-950/50 px-4 py-4 ring-1 ring-indigo-500/30 mb-3">
                    <p className="text-2xl font-bold text-slate-100 mb-2">{word}</p>
                    <p className="text-xs text-slate-400">{hint}</p>
                  </div>
                  <div className="rounded-lg bg-slate-950/30 px-3 py-2 inline-block">
                    <p className="text-xs text-indigo-300/70">Kategori: <span className="font-semibold text-indigo-200">{category}</span></p>
                  </div>
                </div>
              )}

              {/* ─── Gizle & Geç ─────────────────────────────────────── */}
              <div className="mt-6 flex flex-col gap-3">
                <Button
                  size="lg"
                  fullWidth
                  variant={isImpostor ? 'danger' : 'primary'}
                  onClick={() => {
                    setRevealed(false)
                    onNext()
                  }}
                >
                  <EyeOff className="h-5 w-5" />
                  {isLast ? 'Oyuna Başla' : 'Gizle & Sonraki Oyuncu'}
                  <ArrowRight className="h-5 w-5" />
                </Button>
                <p className="text-center text-xs text-slate-500">
                  {isLast
                    ? 'Tüm oyuncular rolünü gördü. Oyun başlıyor!'
                    : 'Cihazı sonraki oyuncuya vermeden önce ekranı gizle.'}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
