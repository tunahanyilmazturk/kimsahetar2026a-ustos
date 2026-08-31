import { useState } from 'react'
import { LogIn, UserPlus, ShieldCheck } from 'lucide-react'
import { Button } from '../common/Button'
import { authApi } from '../../lib/authApi'
import { profileApi } from '../../lib/profileApi'

export function AuthScreen({ onSuccess }: { onSuccess: () => void }) {
  const [registering, setRegistering] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const submit = () => {
    setError(''); const name = username.trim()
    if (name.length < 3 || password.length < 4) { setError('Kullanıcı adı en az 3, şifre en az 4 karakter olmalı'); return }
    const result = registering ? authApi.register(name, password, profileApi.get().playerId) : authApi.login(name, password)
    if (!result.ok) { setError(result.error ?? 'İşlem başarısız'); return }
    profileApi.update({ username: name }); onSuccess()
  }
  return <main className="flex min-h-svh items-center justify-center bg-slate-950 px-4 text-slate-100"><div className="w-full max-w-sm rounded-3xl border border-indigo-400/20 bg-slate-900/90 p-6 shadow-2xl shadow-indigo-950/40"><div className="mb-6 text-center"><div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-300"><ShieldCheck className="h-7 w-7" /></div><h1 className="text-2xl font-bold">Sahtekar Kim?</h1><p className="mt-1 text-sm text-slate-400">Oyuncu hesabına giriş yap</p></div><div className="space-y-3"><input value={username} onChange={e => setUsername(e.target.value)} placeholder="Kullanıcı adı" className="w-full rounded-xl bg-slate-800 px-4 py-3 ring-1 ring-slate-700 focus:outline-none focus:ring-indigo-400" /><input value={password} onChange={e => setPassword(e.target.value)} type="password" onKeyDown={e => e.key === 'Enter' && submit()} placeholder="Şifre" className="w-full rounded-xl bg-slate-800 px-4 py-3 ring-1 ring-slate-700 focus:outline-none focus:ring-indigo-400" />{error && <p className="text-sm text-rose-300">{error}</p>}<Button fullWidth size="lg" onClick={submit}>{registering ? <UserPlus className="h-5 w-5" /> : <LogIn className="h-5 w-5" />}{registering ? 'Hızlı kayıt oluştur' : 'Giriş yap'}</Button></div><button type="button" onClick={() => { setRegistering(!registering); setError('') }} className="mt-5 w-full text-sm text-indigo-300 hover:text-indigo-200">{registering ? 'Zaten hesabım var, giriş yap' : 'Yeni hesap oluştur'}</button><p className="mt-4 text-center text-[11px] text-slate-500">Bu sürümde hesap bilgileri yalnızca bu cihazda saklanır.</p></div></main>
}
