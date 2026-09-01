import { lazy, Suspense, useEffect, useState } from 'react'
import { ToastProvider } from './components/common/Toast'
import { useToast } from './components/common/toast-context'
import { MainMenuPanel } from './components/menu/MainMenuPanel'
import { OnlineLobby } from './OnlineLobby'
import { AuthScreen } from './components/auth/AuthScreen'
import { authApi, type AuthRecord } from './lib/authApi'
import { profileApi } from './lib/profileApi'
import { achievementsApi } from './lib/achievementsApi'
import { questsApi } from './lib/questsApi'
import { useSettings } from './hooks/useSettings'
import { WelcomeIntro } from './components/auth/WelcomeIntro'

// OfflineGame + OnlineGame lazy-load ile ayrı chunk
const OfflineGame = lazy(() =>
  import('./OfflineGame').then((m) => ({ default: m.OfflineGame })),
)
const OnlineGame = lazy(() =>
  import('./OnlineGame').then((m) => ({ default: m.OnlineGame })),
)

type Screen = 'menu' | 'game' | 'online' | 'online-game'

interface OnlineRoomInfo {
  roomId: string
  roomCode: string
}

function AppInner() {
  const [screen, setScreen] = useState<Screen>('menu')
  const [authUser, setAuthUser] = useState<AuthRecord | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [introSeen, setIntroSeen] = useState(() => localStorage.getItem('sahtekar:intro-seen') === '1')
  const [onlineRoom, setOnlineRoom] = useState<OnlineRoomInfo | null>(null)
  const [joinRoomCode, setJoinRoomCode] = useState<string | null>(null)
  const { settings } = useSettings()

  // İlk yüklemede session'ı kontrol et + auth state değişimini dinle
  useEffect(() => {
    let unsubscribe: (() => void) | undefined
    let lastUserId: string | null = null

    const syncAll = async () => {
      try {
        await Promise.all([
          profileApi.syncFromSupabase(),
          achievementsApi.syncFromSupabase(),
          questsApi.syncDailyFromSupabase(),
          questsApi.syncWeeklyFromSupabase(),
        ])
      } catch (err) {
        console.warn('[sync] Supabase sync başarısız, offline modda devam:', err)
      }
    }

    ;(async () => {
      const current = await authApi.currentAsync()
      setAuthUser(current)
      setAuthLoading(false)
      if (current && current.id !== lastUserId) {
        lastUserId = current.id
        // Session token'ın tam yüklenmesi için kısa bekle
        setTimeout(() => void syncAll(), 300)
      }
      unsubscribe = authApi.onAuthChange((record) => {
        setAuthUser(record)
        if (record && record.id !== lastUserId) {
          lastUserId = record.id
          // Yeni giriş/çıkış — session hazır olunca sync
          setTimeout(() => void syncAll(), 300)
        }
      })
    })()
    return () => unsubscribe?.()
  }, [])

  if (authLoading) return <LoadingScreen />
  if (!authUser) return <AuthScreen onSuccess={() => { void authApi.currentAsync().then(setAuthUser) }} />
  if (!introSeen) return <WelcomeIntro onDone={() => setIntroSeen(true)} />

  if (screen === 'game') {
    return (
      <div className={settings.largeText ? 'large-text' : undefined} data-contrast={settings.highContrast ? 'high' : 'normal'}><Suspense fallback={<LoadingScreen />}>
        <OfflineGame onExit={() => setScreen('menu')} />
      </Suspense></div>
    )
  }
  if (screen === 'online') return <div className={settings.largeText ? 'large-text' : undefined} data-contrast={settings.highContrast ? 'high' : 'normal'}><OnlineLobby onExit={() => setScreen('menu')} onEnterRoom={(info) => { setOnlineRoom(info); setScreen('online-game') }} initialJoinCode={joinRoomCode} onJoined={() => setJoinRoomCode(null)} /></div>
  if (screen === 'online-game' && onlineRoom) return <div className={settings.largeText ? 'large-text' : undefined} data-contrast={settings.highContrast ? 'high' : 'normal'}><Suspense fallback={<LoadingScreen />}><OnlineGame roomId={onlineRoom.roomId} roomCode={onlineRoom.roomCode} onExit={() => { setOnlineRoom(null); setScreen('online') }} /></Suspense></div>

  return <div className={settings.largeText ? 'large-text' : undefined} data-contrast={settings.highContrast ? 'high' : 'normal'}><MainMenuPanel onPlay={() => setScreen('game')} onOnline={() => setScreen('online')} onJoinRoom={(code) => { setJoinRoomCode(code); setScreen('online') }} /></div>
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
