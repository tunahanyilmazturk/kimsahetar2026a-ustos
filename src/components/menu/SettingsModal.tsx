import { motion } from 'motion/react'
import { Volume2, VolumeX, Music, Music2, Vibrate, RotateCcw } from 'lucide-react'
import { Modal } from '../common/Modal'
import { Button } from '../common/Button'
import { useSettings } from '../../hooks/useSettings'
import { useToast } from '../common/toast-context'
import { cn } from '../../utils/cn'
import type { BotDifficulty, WordDifficulty } from '../../types'

export interface SettingsModalProps {
  open: boolean
  onClose: () => void
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const { settings, update, reset } = useSettings()
  const toast = useToast()

  const handleReset = () => {
    reset()
    toast.success('Ayarlar sıfırlandı')
  }

  return (
    <Modal open={open} onClose={onClose} title="Ayarlar" size="md">
      <div className="space-y-6">
        {/* ─── Ses & Titreşim ───────────────────────────────────────── */}
        <section>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
            Ses & Titreşim
          </h3>
          <div className="space-y-2">
            <ToggleRow
              icon={settings.sound ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
              label="Ses Efektleri"
              desc="Buton tıklama, oyun olayları"
              checked={settings.sound}
              onChange={(v) => update({ sound: v })}
            />
            <ToggleRow
              icon={settings.music ? <Music className="h-5 w-5" /> : <Music2 className="h-5 w-5" />}
              label="Arka Plan Müziği"
              desc="Menü ve oyun müziği"
              checked={settings.music}
              onChange={(v) => update({ music: v })}
            />
            <ToggleRow
              icon={<Vibrate className="h-5 w-5" />}
              label="Titreşim"
              desc="Mobil cihazlarda dokunsal geri bildirim"
              checked={settings.haptics}
              onChange={(v) => update({ haptics: v })}
            />
          </div>
        </section>

        {/* ─── Oyun Varsayılanları ──────────────────────────────────── */}
        <section>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
            Oyun Varsayılanları
          </h3>
          <div className="space-y-4">
            {/* Tur süresi */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-sm text-slate-300">Tur Süresi</label>
                <span className="text-sm font-semibold text-indigo-300 tabular-nums">
                  {settings.defaultTurnTimeLimit}sn
                </span>
              </div>
              <input
                type="range"
                min={10}
                max={120}
                step={5}
                value={settings.defaultTurnTimeLimit}
                onChange={(e) => update({ defaultTurnTimeLimit: Number(e.target.value) })}
                className="w-full accent-indigo-500"
              />
            </div>

            {/* Oylama öncesi tur sayısı */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-sm text-slate-300">Oylama Öncesi Tur</label>
                <span className="text-sm font-semibold text-indigo-300 tabular-nums">
                  {settings.defaultRoundsBeforeVoting}
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={5}
                step={1}
                value={settings.defaultRoundsBeforeVoting}
                onChange={(e) => update({ defaultRoundsBeforeVoting: Number(e.target.value) })}
                className="w-full accent-indigo-500"
              />
            </div>

            {/* Bot zorluğu */}
            <div>
              <label className="mb-1.5 block text-sm text-slate-300">Bot Zorluğu</label>
              <div className="grid grid-cols-3 gap-2">
                {(['EASY', 'SMART', 'EXPERT'] as BotDifficulty[]).map((d) => (
                  <button
                    key={d}
                    onClick={() => update({ defaultBotDifficulty: d })}
                    className={cn(
                      'rounded-lg px-3 py-2 text-sm font-medium transition-colors min-h-11',
                      settings.defaultBotDifficulty === d
                        ? 'bg-indigo-500 text-white'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700',
                    )}
                  >
                    {d === 'EASY' ? 'Kolay' : d === 'SMART' ? 'Akıllı' : 'Uzman'}
                  </button>
                ))}
              </div>
            </div>

            {/* Kelime zorluğu */}
            <div>
              <label className="mb-1.5 block text-sm text-slate-300">Kelime Zorluğu</label>
              <div className="grid grid-cols-4 gap-2">
                {(['EASY', 'MEDIUM', 'HARD', 'MIXED'] as WordDifficulty[]).map((d) => (
                  <button
                    key={d}
                    onClick={() => update({ defaultWordDifficulty: d })}
                    className={cn(
                      'rounded-lg px-2 py-2 text-xs font-medium transition-colors min-h-11',
                      settings.defaultWordDifficulty === d
                        ? 'bg-indigo-500 text-white'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700',
                    )}
                  >
                    {d === 'EASY' ? 'Kolay' : d === 'MEDIUM' ? 'Orta' : d === 'HARD' ? 'Zor' : 'Karışık'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ─── Sıfırla ──────────────────────────────────────────────── */}
        <Button variant="danger" fullWidth onClick={handleReset}>
          <RotateCcw className="h-4 w-4" />
          Ayarları Sıfırla
        </Button>
      </div>
    </Modal>
  )
}

function ToggleRow({
  icon,
  label,
  desc,
  checked,
  onChange,
}: {
  icon: React.ReactNode
  label: string
  desc: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={cn(
        'flex w-full items-center gap-3 rounded-xl px-4 py-3 ring-1 transition-colors text-left min-h-11',
        checked ? 'bg-indigo-500/10 ring-indigo-500/40' : 'bg-slate-800/40 ring-slate-700',
      )}
    >
      <span className={cn('shrink-0', checked ? 'text-indigo-300' : 'text-slate-500')}>{icon}</span>
      <div className="flex-1">
        <p className="text-sm font-medium text-slate-100">{label}</p>
        <p className="text-xs text-slate-400">{desc}</p>
      </div>
      {/* Switch */}
      <span
        className={cn(
          'relative h-6 w-11 shrink-0 rounded-full transition-colors',
          checked ? 'bg-indigo-500' : 'bg-slate-700',
        )}
      >
        <motion.span
          layout
          transition={{ type: 'spring', stiffness: 500, damping: 32 }}
          className={cn(
            'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow',
            checked ? 'left-[1.375rem]' : 'left-0.5',
          )}
        />
      </span>
    </button>
  )
}
