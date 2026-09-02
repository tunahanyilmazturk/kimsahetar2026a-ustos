import { useState } from 'react'
import { motion } from 'motion/react'
import { Volume2, VolumeX, Music, Music2, Vibrate, RotateCcw, Eye, Type, LogOut, Loader2 } from 'lucide-react'
import { Modal } from '../common/Modal'
import { Button } from '../common/Button'
import { useSettings } from '../../hooks/useSettings'
import { useToast } from '../common/toast-context'
import { authApi } from '../../lib/authApi'
import { cn } from '../../utils/cn'
import type { BotDifficulty, WordDifficulty } from '../../types'

export interface SettingsModalProps {
  open: boolean
  onClose: () => void
  onLogout?: () => void
}

const BOT_DIFFICULTIES: BotDifficulty[] = ['EASY', 'SMART', 'EXPERT']
const WORD_DIFFICULTIES: WordDifficulty[] = ['EASY', 'MEDIUM', 'HARD', 'MIXED']

export function SettingsModal({ open, onClose, onLogout }: SettingsModalProps) {
  const { settings, update, reset } = useSettings()
  const toast = useToast()
  const [loggingOut, setLoggingOut] = useState(false)
  const [activeTab, setActiveTab] = useState<'sound' | 'appearance' | 'game' | 'account'>('sound')

  const handleReset = () => {
    reset()
    toast.success('Ayarlar sıfırlandı')
  }

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await authApi.logout()
      toast.info('Çıkış yapıldı')
      onLogout?.()
      onClose()
    } catch {
      toast.error('Çıkış yapılamadı')
    } finally {
      setLoggingOut(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Ayarlar" size="md">
      <div className="space-y-6">
        <div className="rounded-2xl border border-indigo-400/20 bg-indigo-500/10 px-4 py-3">
          <p className="text-sm font-semibold text-indigo-200">Oyun deneyimini kişiselleştir</p>
          <p className="mt-1 text-xs leading-5 text-slate-400">Ayarlar otomatik kaydedilir ve bir sonraki oyunda uygulanır.</p>
        </div>
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-900/80 p-1 ring-1 ring-slate-700/70 sm:grid-cols-4">
          {([
            ['sound', 'Ses'],
            ['appearance', 'Görünüm'],
            ['game', 'Oyun'],
            ['account', 'Hesap'],
          ] as const).map(([tab, label]) => (
            <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={cn('min-h-10 rounded-lg px-2 py-2 text-xs font-bold transition-colors', activeTab === tab ? 'bg-indigo-500/25 text-indigo-200 ring-1 ring-indigo-400/40' : 'text-slate-500 hover:text-slate-300')}>
              {label}
            </button>
          ))}
        </div>
        {/* ─── Ses & Titreşim ───────────────────────────────────────── */}
        {activeTab === 'sound' && <section>
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
        </section>}

        {activeTab === 'appearance' && <section>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Görünüm & Erişilebilirlik</h3>
          <div className="space-y-2">
            <ToggleRow icon={<Eye className="h-5 w-5" />} label="Yüksek Kontrast" desc="Kartları ve metinleri daha belirgin yap" checked={settings.highContrast} onChange={(v) => update({ highContrast: v })} />
            <ToggleRow icon={<Type className="h-5 w-5" />} label="Büyük Yazı" desc="Arayüz metinlerini büyüt" checked={settings.largeText} onChange={(v) => update({ largeText: v })} />
          </div>
        </section>}

        {/* ─── Oyun Varsayılanları ──────────────────────────────────── */}
        {activeTab === 'game' && <section>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
            Oyun Varsayılanları
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <PresetButton label="Hızlı" desc="15sn · 1 tur" onClick={() => update({ defaultTurnTimeLimit: 15, defaultRoundsBeforeVoting: 1 })} />
              <PresetButton label="Dengeli" desc="30sn · 2 tur" active={settings.defaultTurnTimeLimit === 30 && settings.defaultRoundsBeforeVoting === 2} onClick={() => update({ defaultTurnTimeLimit: 30, defaultRoundsBeforeVoting: 2 })} />
              <PresetButton label="Uzun Oyun" desc="60sn · 3 tur" onClick={() => update({ defaultTurnTimeLimit: 60, defaultRoundsBeforeVoting: 3 })} />
            </div>
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
                aria-label="Tur süresi"
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
                aria-label="Oylama öncesi tur sayısı"
                className="w-full accent-indigo-500"
              />
            </div>

            {/* Bot zorluğu */}
            <div>
              <label className="mb-1.5 block text-sm text-slate-300">Bot Zorluğu</label>
              <div className="grid grid-cols-3 gap-2">
                {BOT_DIFFICULTIES.map((d) => (
                  <button
                    key={d}
                    type="button"
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
                {WORD_DIFFICULTIES.map((d) => (
                  <button
                    key={d}
                    type="button"
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
        </section>}

        {/* ─── Sıfırla ──────────────────────────────────────────────── */}
        {activeTab === 'account' && <>
        <div className="rounded-xl bg-slate-800/50 px-4 py-3 ring-1 ring-slate-700/60">
          <p className="text-sm font-semibold text-slate-200">Ayar yönetimi</p>
          <p className="mt-1 text-xs leading-5 text-slate-400">Tüm tercihler bu cihazda otomatik olarak saklanır.</p>
        </div>
        <Button variant="danger" fullWidth onClick={handleReset}>
          <RotateCcw className="h-4 w-4" />
          Ayarları Sıfırla
        </Button>

        {/* ─── Çıkış ──────────────────────────────────────────────── */}
        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-800/60 px-4 py-3 text-sm font-medium text-rose-300 ring-1 ring-rose-500/20 transition-colors hover:bg-rose-500/10 hover:ring-rose-500/40 disabled:opacity-50 min-h-11"
        >
          {loggingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
          {loggingOut ? 'Çıkış yapılıyor...' : 'Hesaptan Çıkış Yap'}
        </button>
        </>}
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
      type="button"
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

function PresetButton({ label, desc, active, onClick }: { label: string; desc: string; active?: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={cn('rounded-xl px-2 py-2 text-center ring-1 transition-colors', active ? 'bg-indigo-500/20 text-indigo-200 ring-indigo-400/50' : 'bg-slate-800/60 text-slate-300 ring-slate-700 hover:bg-slate-700')}>
      <span className="block text-xs font-semibold">{label}</span>
      <span className="mt-0.5 block text-[10px] text-slate-500">{desc}</span>
    </button>
  )
}
