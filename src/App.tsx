import { useState } from 'react'
import { ToastProvider } from './components/common/Toast'
import { MainMenuPanel } from './components/menu/MainMenuPanel'
import { OfflineGame } from './OfflineGame'

type Screen = 'menu' | 'game'

function AppInner() {
  const [screen, setScreen] = useState<Screen>('menu')

  if (screen === 'game') {
    return <OfflineGame onExit={() => setScreen('menu')} />
  }

  return <MainMenuPanel onPlay={() => setScreen('game')} />
}

export default function App() {
  return (
    <ToastProvider>
      <AppInner />
    </ToastProvider>
  )
}
