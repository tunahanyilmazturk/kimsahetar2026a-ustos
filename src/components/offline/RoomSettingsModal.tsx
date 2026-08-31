import { useState } from 'react'
import { Plus, X, Check } from 'lucide-react'
import { Modal } from '../common/Modal'
import { Button } from '../common/Button'
import { useToast } from '../common/toast-context'
import { CATEGORIES, categoryCount } from '../../constants'
import { cn } from '../../utils/cn'
import type { GameSettings, BotDifficulty, WordDifficulty } from '../../types'

export interface RoomSettingsModalProps {
  open: boolean
  onClose: () => void
  settings: GameSettings
  onChange: (patch: Partial<GameSettings>) => void
}

const ROUND_OPTIONS = [1, 2, 3, 4, 5] as const
const WORD_DIFFICULTIES: WordDifficulty[] = ['EASY', 'MEDIUM', 'HARD', 'MIXED']
const BOT_DIFFICULTIES: BotDifficulty[] = ['EASY', 'SMART', 'EXPERT']

export function RoomSettingsModal({ open, onClose, settings, onChange }: RoomSettingsModalProps) {
  const toast = useToast()
  const [customWordInput, setCustomWordInput] = useState('')

  const toggleCategory = (cat: string) => {
    const selected = settings.selectedCategories
    if (selected.includes(cat)) {
      // En az 1 kategori kalmalı
      if (selected.length <= 1) {
        toast.warning('En az bir kategori seçili olmalı')
        return
      }
      onChange({ selectedCategories: selected.filter((c) => c !== cat) })
    } else {
      onChange({ selectedCategories: [...selected, cat] })
    }
  }

  const addCustomWord = () => {
    const word = customWordInput.trim()
    if (!word) return
    if (word.length > 30) {
      toast.warning('Kelime en fazla 30 karakter')
      return
    }
    if (settings.customWords.includes(word)) {
      toast.warning('Bu kelime zaten ekli')
      return
    }
    if (settings.customWords.length >= 30) {
      toast.warning('En fazla 30 özel kelime')
      return
    }
    onChange({ customWords: [...settings.customWords, word] })
    setCustomWordInput('')
  }

  const removeCustomWord = (word: string) => {
    onChange({ customWords: settings.customWords.filter((w) => w !== word) })
  }

  return (
    <Modal open={open} onClose={onClose} title="Oda Ayarları" size="lg">
      <div className="space-y-6">
        {/* ─── Tur Süresi ────────────────────────────────────────────── */}
        <section>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-semibold text-slate-200">Tur Süresi</label>
            <span className="text-sm font-semibold text-indigo-300 tabular-nums">
              {settings.turnTimeLimit}sn
            </span>
          </div>
          <input
            type="range"
            min={10}
            max={120}
            step={5}
            value={settings.turnTimeLimit}
            onChange={(e) => onChange({ turnTimeLimit: Number(e.target.value) })}
            aria-label="Tur süresi"
            className="w-full accent-indigo-500"
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>10sn</span>
            <span>120sn</span>
          </div>
        </section>

        {/* ─── Oylama Öncesi Tur ─────────────────────────────────────── */}
        <section>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-semibold text-slate-200">Oylama Öncesi Tur</label>
            <span className="text-sm font-semibold text-indigo-300 tabular-nums">
              {settings.roundsBeforeVoting}
            </span>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {ROUND_OPTIONS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => onChange({ roundsBeforeVoting: n })}
                className={cn(
                  'rounded-lg py-2.5 text-sm font-medium transition-colors min-h-11',
                  settings.roundsBeforeVoting === n
                    ? 'bg-indigo-500 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700',
                )}
              >
                {n}
              </button>
            ))}
          </div>
        </section>

        {/* ─── Kelime Zorluğu ────────────────────────────────────────── */}
        <section>
          <label className="mb-2 block text-sm font-semibold text-slate-200">Kelime Zorluğu</label>
          <div className="grid grid-cols-4 gap-2">
            {WORD_DIFFICULTIES.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => onChange({ wordDifficulty: d })}
                className={cn(
                  'rounded-lg py-2.5 text-xs font-medium transition-colors min-h-11',
                  settings.wordDifficulty === d
                    ? 'bg-indigo-500 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700',
                )}
              >
                {d === 'EASY' ? 'Kolay' : d === 'MEDIUM' ? 'Orta' : d === 'HARD' ? 'Zor' : 'Karışık'}
              </button>
            ))}
          </div>
        </section>

        {/* ─── Bot Zorluğu ───────────────────────────────────────────── */}
        <section>
          <label className="mb-2 block text-sm font-semibold text-slate-200">Bot Zorluğu</label>
          <div className="grid grid-cols-3 gap-2">
            {BOT_DIFFICULTIES.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => onChange({ botDifficulty: d })}
                className={cn(
                  'rounded-lg py-2.5 text-sm font-medium transition-colors min-h-11',
                  settings.botDifficulty === d
                    ? 'bg-indigo-500 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700',
                )}
              >
                {d === 'EASY' ? 'Kolay' : d === 'SMART' ? 'Akıllı' : 'Uzman'}
              </button>
            ))}
          </div>
        </section>

        {/* ─── Kategoriler ───────────────────────────────────────────── */}
        <section>
          <label className="mb-2 block text-sm font-semibold text-slate-200">
            Kategoriler{' '}
            <span className="text-slate-500 font-normal">
              ({settings.selectedCategories.length}/{CATEGORIES.length})
            </span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {CATEGORIES.map((cat) => {
              const selected = settings.selectedCategories.includes(cat)
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => toggleCategory(cat)}
                  className={cn(
                    'flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors min-h-11',
                    selected
                      ? 'bg-indigo-500/15 text-indigo-200 ring-1 ring-indigo-500/40'
                      : 'bg-slate-800/50 text-slate-400 ring-1 ring-slate-700 hover:bg-slate-800',
                  )}
                >
                  <span className="truncate">{cat}</span>
                  <span className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-500">{categoryCount(cat)}</span>
                    {selected && <Check className="h-4 w-4 text-indigo-400" />}
                  </span>
                </button>
              )
            })}
          </div>
        </section>

        {/* ─── Özel Kelimeler ────────────────────────────────────────── */}
        <section>
          <label className="mb-2 block text-sm font-semibold text-slate-200">
            Özel Kelimeler{' '}
            <span className="text-slate-500 font-normal">({settings.customWords.length}/30)</span>
          </label>
          <div className="flex gap-2 mb-2">
            <input
              value={customWordInput}
              onChange={(e) => setCustomWordInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addCustomWord()}
              placeholder="Kelime ekle..."
              maxLength={30}
              aria-label="Özel kelime ekle"
              className="flex-1 rounded-lg bg-slate-800 px-3 py-2.5 text-slate-100 ring-1 ring-slate-700 focus:outline-none focus:ring-indigo-400 placeholder:text-slate-500"
            />
            <Button size="md" onClick={addCustomWord} disabled={!customWordInput.trim()} aria-label="Kelime ekle">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {settings.customWords.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {settings.customWords.map((w) => (
                <span
                  key={w}
                  className="inline-flex items-center gap-1.5 rounded-full bg-slate-800 px-3 py-1.5 text-sm text-slate-200 ring-1 ring-slate-700"
                >
                  {w}
                  <button
                    type="button"
                    onClick={() => removeCustomWord(w)}
                    className="text-slate-400 hover:text-rose-400 transition-colors"
                    aria-label={`${w} kaldır`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <p className="mt-2 text-xs text-slate-500">
            Özel kelime eklendiğinde, her turda bunlardan rastgele biri seçilir (kategori/zorluk göz ardı edilir).
          </p>
        </section>

        {/* ─── Kapat ─────────────────────────────────────────────────── */}
        <Button fullWidth onClick={onClose}>
          Tamam
        </Button>
      </div>
    </Modal>
  )
}
