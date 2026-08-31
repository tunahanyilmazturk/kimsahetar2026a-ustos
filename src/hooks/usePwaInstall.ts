import { useEffect, useState } from 'react'

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
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    // Zaten yüklü mü? (standalone modda)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      // iOS Safari
      (window.navigator as unknown as { standalone?: boolean }).standalone === true
    if (isStandalone) {
      setInstalled(true)
      return
    }

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
