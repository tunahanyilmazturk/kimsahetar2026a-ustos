import { useCallback, useEffect, useState } from 'react'
import { settingsApi } from '../lib/profileApi'
import type { Settings } from '../types'
import { audioApi } from '../lib/audio'

/** Uygulama ayarları hook'u — ses, müzik, titreşim, oyun varsayılanları. */
export function useSettings() {
  const [settings, setSettings] = useState<Settings>(() => settingsApi.get())

  // Cross-tab senkronizasyon
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'sahtekar:settings') setSettings(settingsApi.get())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const update = useCallback((patch: Partial<Settings>) => {
    const next = settingsApi.update(patch)
    setSettings(next)
    audioApi.sync(next)
    if (patch.sound === true || patch.haptics === true) audioApi.play('success')
    if (patch.haptics !== undefined) audioApi.haptic(12)
    return next
  }, [])

  const reset = useCallback(() => {
    settingsApi.reset()
    const next = settingsApi.get()
    setSettings(next)
    audioApi.sync(next)
  }, [])

  return { settings, update, reset }
}
