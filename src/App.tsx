import { lazy, Suspense, useEffect, useState } from 'react'
import { ToastProvider } from './components/common/Toast'
import { useToast } from './components/common/toast-context'
import { MainMenuPanel } from './components/menu/MainMenuPanel'

// OfflineGame sadece "Oyna" tıklandığında gerekir — lazy-load ile ayrı chunk
const OfflineGame = lazy(() =>
  import('./OfflineGame').then((m) => ({ default: m.OfflineGame })),
)

type Screen = 'menu' | 'game'

function AppInner() {
  const [screen, setScreen] = useState<Screen>('menu')

  if (screen === 'game') {
    return (
      <Suspense fallback={<LoadingScreen />}>
        <OfflineGame onExit={() => setScreen('menu')} />
      </Suspense>
    )
  }

  return <MainMenuPanel onPlay={() => setScreen('game')} />
}

function LoadingScreen() {
  return (
    <div className="min-h-svh w-full bg-slate-950 flex items-center justify-center">
      <div className="h-8 w-8 rounded-full border-2 border-slate-700 border-t-indigo-500 animate-spin" />
    </div>
  )
}

function PwaUpdatePrompt() {
  const toast = useToast()
  const [applyUpdate, setApplyUpdate] = useState<(() => Promise<void>) | null>(null)

  useEffect(() => {
    const onUpdate = (event: Event) => {
      const apply = (event as CustomEvent<{ apply: () => Promise<void> }>).detail?.apply
      if (!apply) return
      setApplyUpdate(() => apply)
      toast.info('Yeni sürüm hazır')
    }
    window.addEventListener('pwa-update', onUpdate)
    return () => window.removeEventListener('pwa-update', onUpdate)
  }, [toast])

  if (!applyUpdate) return null

  return (
    <div className="fixed inset-x-3 bottom-3 z-[100] mx-auto flex max-w-md items-center justify-between gap-3 rounded-xl bg-slate-800 px-4 py-3 shadow-2xl ring-1 ring-indigo-500/40">
      <p className="text-sm text-slate-200">Yeni sürüm kullanıma hazır.</p>
      <button
        type="button"
        onClick={() => void applyUpdate()}
        className="min-h-11 shrink-0 rounded-lg bg-indigo-500 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
      >
        Şimdi yenile
      </button>
    </div>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <AppInner />
      <PwaUpdatePrompt />
    </ToastProvider>
  )
}
