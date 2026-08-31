import { useCallback, useEffect, useState } from 'react'
import { settingsApi } from '../lib/profileApi'
import type { Settings } from '../types'

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
    return next
  }, [])

  const reset = useCallback(() => {
    settingsApi.reset()
    setSettings(settingsApi.get())
  }, [])

  return { settings, update, reset }
}
