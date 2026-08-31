import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.tsx'

// PWA service worker — autoUpdate + offline ready
const updateSW = registerSW({
  onNeedRefresh() {
    // Yeni sürüm var — kullanıcıya bildir (basit alert yerine console)
    console.info('[PWA] Yeni sürüm hazır, yenileniyor...')
  },
  onOfflineReady() {
    console.info('[PWA] Offline hazır — uygulama internet olmadan çalışabilir')
  },
})

// Update'i tetikle (autoUpdate modunda otomatik)
void updateSW

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
