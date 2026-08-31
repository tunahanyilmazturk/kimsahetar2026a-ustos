import { useEffect, useRef, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/**
 * PWA install prompt hook'u.
 * `beforeinstallprompt` event'ini yakalar ve kullanıcıya "Ana ekrana ekle" butonu gösterir.
 * Mobile tarayıcılarda çalışır; desktop'ta da desteklenir.
 */
export function usePwaInstall() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null)
  // Zaten yüklü mü? (standalone modda) — lazy initializer ile effect içinde setState'ten kaçın
  const [installed, setInstalled] = useState(() => {
    if (typeof window === 'undefined') return false
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      // iOS Safari
      (window.navigator as unknown as { standalone?: boolean }).standalone === true
    )
  })

  // Mount anlık `installed` durumunu ref'te tut — effect sadece bir kez çalışmalı
  const installedRef = useRef(installed)

  useEffect(() => {
    if (installedRef.current) return

    const onBeforeInstall = (e: Event) => {
      e.preventDefault()
      setInstallEvent(e as BeforeInstallPromptEvent)
    }
    const onInstalled = () => {
      setInstalled(true)
      setInstallEvent(null)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const promptInstall = async (): Promise<boolean> => {
    if (!installEvent) return false
    await installEvent.prompt()
    const choice = await installEvent.userChoice
    setInstallEvent(null)
    return choice.outcome === 'accepted'
  }

  return {
    canInstall: Boolean(installEvent) && !installed,
    installed,
    promptInstall,
  }
}
