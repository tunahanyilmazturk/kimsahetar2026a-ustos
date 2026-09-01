import { useState } from 'react'
import { LogIn, UserPlus, ShieldCheck, Loader2 } from 'lucide-react'
import { Button } from '../common/Button'
import { authApi } from '../../lib/authApi'
import { profileApi } from '../../lib/profileApi'

/** Google "G" logosu — lucide'de yok, inline SVG. */
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
  )
}

export function AuthScreen({ onSuccess }: { onSuccess: () => void }) {
  const [registering, setRegistering] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    setError('')
    const name = username.trim()
    if (name.length < 3 || password.length < 4) {
      setError('Kullanıcı adı en az 3, şifre en az 4 karakter olmalı')
      return
    }
    setLoading(true)
    try {
      const result = registering
        ? await authApi.register(name, password, profileApi.get().playerId)
        : await authApi.login(name, password)
      if (!result.ok) {
        setError(result.error ?? 'İşlem başarısız')
        return
      }
      // onAuthChange App.tsx'te authenticated'ı handle eder
      onSuccess()
    } catch {
      setError('Bir hata oluştu, tekrar dene')
    } finally {
      setLoading(false)
    }
  }

  const signInWithGoogle = async () => {
    setError('')
    setLoading(true)
    try {
      const result = await authApi.signInWithGoogle()
      if (!result.ok) {
        setError(result.error ?? 'Google giriş başarısız')
        setLoading(false)
      }
      // Başarılıysa tarayıcı yönlendirilir — geri dönüşte onAuthChange tetiklenir
    } catch {
      setError('Google giriş başarısız')
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-slate-950 px-4 text-slate-100">
      <div className="w-full max-w-sm rounded-3xl border border-indigo-400/20 bg-slate-900/90 p-6 shadow-2xl shadow-indigo-950/40">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-300">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold">Sahtekar Kim?</h1>
          <p className="mt-1 text-sm text-slate-400">Oyuncu hesabına giriş yap</p>
        </div>
        <div className="space-y-3">
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Kullanıcı adı"
            aria-label="Kullanıcı adı"
            disabled={loading}
            className="w-full rounded-xl bg-slate-800 px-4 py-3 ring-1 ring-slate-700 focus:outline-none focus:ring-indigo-400 disabled:opacity-50"
          />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            onKeyDown={(e) => e.key === 'Enter' && !loading && submit()}
            placeholder="Şifre"
            aria-label="Şifre"
            disabled={loading}
            className="w-full rounded-xl bg-slate-800 px-4 py-3 ring-1 ring-slate-700 focus:outline-none focus:ring-indigo-400 disabled:opacity-50"
          />
          {error && <p className="text-sm text-rose-300">{error}</p>}
          <Button fullWidth size="lg" onClick={submit} disabled={loading}>
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : registering ? (
              <UserPlus className="h-5 w-5" />
            ) : (
              <LogIn className="h-5 w-5" />
            )}
            {loading ? 'Bekleyin...' : registering ? 'Hızlı kayıt oluştur' : 'Giriş yap'}
          </Button>
        </div>

        {/* ─── OAuth: Google ──────────────────────────────────────────── */}
        <div className="my-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-700" />
          <span className="text-xs text-slate-500">veya</span>
          <div className="h-px flex-1 bg-slate-700" />
        </div>

        <button
          type="button"
          onClick={signInWithGoogle}
          disabled={loading}
          className="flex w-full items-center justify-center gap-3 rounded-xl bg-white px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-50"
        >
          <GoogleIcon className="h-5 w-5" />
          {loading ? 'Bekleyin...' : 'Google ile devam et'}
        </button>
        <button
          type="button"
          onClick={() => {
            setRegistering(!registering)
            setError('')
          }}
          disabled={loading}
          className="mt-5 w-full text-sm text-indigo-300 hover:text-indigo-200 disabled:opacity-50"
        >
          {registering ? 'Zaten hesabım var, giriş yap' : 'Yeni hesap oluştur'}
        </button>
        <p className="mt-4 text-center text-[11px] text-slate-500">
          Hesabın bulut'ta saklanır — farklı cihazlarda aynı hesapla giriş yapabilirsin.
        </p>
      </div>
    </main>
  )
}
