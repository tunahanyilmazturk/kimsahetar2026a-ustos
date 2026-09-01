import { useMemo, useState } from 'react'
import { Eye, EyeOff, KeyRound, Lightbulb, Loader2, LogIn, ShieldCheck, Sparkles, UserPlus, Users } from 'lucide-react'
import { Button } from '../common/Button'
import { authApi } from '../../lib/authApi'
import { profileApi } from '../../lib/profileApi'

const USERNAME_PATTERN = /^[a-zA-Z0-9ğüşöçıİĞÜŞÖÇ_-]+$/

export function AuthScreen({ onSuccess }: { onSuccess: () => void }) {
  const [registering, setRegistering] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const passwordScore = useMemo(() => [password.length >= 6, /[A-ZÇĞİÖŞÜ]/.test(password), /\d/.test(password), /[^a-zA-Z0-9ğüşöçıİĞÜŞÖÇ]/.test(password)].filter(Boolean).length, [password])

  const switchMode = () => { setRegistering((value) => !value); setUsername(''); setPassword(''); setError(''); setShowPassword(false) }
  const submit = async () => {
    setError('')
    const name = username.trim()
    if (name.length < 3 || name.length > 18) return setError('Oyun adı 3–18 karakter arasında olmalı')
    if (!USERNAME_PATTERN.test(name)) return setError('Oyun adında yalnızca harf, rakam, _ veya - kullanabilirsin')
    if (password.length < 6) return setError('Şifren en az 6 karakter olmalı')
    setLoading(true)
    try {
      const result = registering ? await authApi.register(name, password, profileApi.get().playerId) : await authApi.login(name, password)
      if (!result.ok) { setError(result.error ?? 'İşlem başarısız'); return }
      onSuccess()
    } catch { setError('Bağlantı kurulamadı. İnternetini kontrol edip tekrar dene.') } finally { setLoading(false) }
  }

  return <main className="relative flex min-h-svh items-center justify-center overflow-hidden bg-[#07051a] px-4 py-8 text-slate-100">
    <div className="pointer-events-none absolute -left-32 top-1/4 h-80 w-80 rounded-full bg-fuchsia-600/20" /><div className="pointer-events-none absolute -right-32 bottom-1/4 h-96 w-96 rounded-full bg-cyan-500/15" />
    <div className="relative grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950 lg:grid-cols-[.9fr_1.1fr]">
      <section className="relative hidden flex-col justify-between overflow-hidden border-r border-white/10 bg-linear-to-br from-indigo-950/90 via-purple-950/70 to-slate-950 p-10 lg:flex"><div><div className="mb-8 flex items-center gap-3"><img src="/brand-emblem.png" alt="Sahtekar Kim?" className="h-12 w-12 rounded-2xl" /><div><p className="text-xs font-bold uppercase tracking-[.24em] text-cyan-300">Sahtekar Kim?</p><p className="text-sm text-slate-400">Şüphe. İpucu. Zafer.</p></div></div><h2 className="max-w-sm text-4xl font-black leading-tight">Kimin doğru,<br /><span className="text-cyan-300">kimin sahtekar</span> olduğunu bul.</h2><p className="mt-5 max-w-sm text-sm leading-6 text-slate-400">Arkadaşlarınla aynı odada ya da online oyna. Rolünü gizle, doğru ipucunu ver ve son oyu kazan.</p></div><div className="space-y-3 text-sm text-slate-300"><p><Sparkles className="mr-2 inline h-4 w-4 text-fuchsia-300" /> Hızlı ve eğlenceli turlar</p><p><Users className="mr-2 inline h-4 w-4 text-cyan-300" /> Arkadaşlarınla rekabet et</p><p><ShieldCheck className="mr-2 inline h-4 w-4 text-emerald-300" /> İlerlemen hesabında güvende</p></div></section>
      <section className="p-6 sm:p-10"><div className="mb-8 flex items-center gap-3 lg:hidden"><img src="/brand-emblem.png" alt="Sahtekar Kim?" className="h-11 w-11 rounded-xl" /><div><p className="font-bold">Sahtekar Kim?</p><p className="text-xs text-slate-500">Oyuna devam etmek için giriş yap</p></div></div><div className="mb-7"><p className="mb-2 text-xs font-bold uppercase tracking-[.22em] text-indigo-300">{registering ? 'Yeni oyuncu' : 'Tekrar hoş geldin'}</p><h1 className="text-3xl font-black">{registering ? 'Ekibine katıl' : 'Oyuna giriş yap'}</h1><p className="mt-2 text-sm text-slate-400">{registering ? 'Bir oyun adı seç, sahne senin olsun.' : 'İstatistiklerin ve başarıların seni bekliyor.'}</p></div>
        <div className="space-y-4"><label className="block"><span className="mb-2 block text-xs font-semibold text-slate-300">Oyun adı</span><div className="relative"><Users className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" /><input value={username} onChange={(e) => setUsername(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !loading && submit()} placeholder="örn. GizemliOyuncu" aria-label="Oyun adı" autoComplete="username" disabled={loading} className="w-full rounded-2xl border border-white/10 bg-white/5 py-3.5 pl-12 pr-4 outline-none transition placeholder:text-slate-600 focus:border-indigo-400 focus:bg-white/10 disabled:opacity-50" /></div></label><label className="block"><span className="mb-2 block text-xs font-semibold text-slate-300">Şifre</span><div className="relative"><KeyRound className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" /><input value={password} onChange={(e) => setPassword(e.target.value)} type={showPassword ? 'text' : 'password'} onKeyDown={(e) => e.key === 'Enter' && !loading && submit()} placeholder="En az 6 karakter" aria-label="Şifre" autoComplete={registering ? 'new-password' : 'current-password'} disabled={loading} className="w-full rounded-2xl border border-white/10 bg-white/5 py-3.5 pl-12 pr-12 outline-none transition placeholder:text-slate-600 focus:border-indigo-400 focus:bg-white/10 disabled:opacity-50" /><button type="button" aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'} onClick={() => setShowPassword((value) => !value)} className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl text-slate-500 hover:bg-white/10 hover:text-slate-200">{showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button></div></label>
          {registering && <div aria-label="Şifre gücü" className="space-y-2"><div className="flex gap-1.5">{[1, 2, 3, 4].map((level) => <span key={level} className={`h-1.5 flex-1 rounded-full transition-colors ${passwordScore >= level ? passwordScore >= 3 ? 'bg-emerald-400' : 'bg-amber-400' : 'bg-white/10'}`} />)}</div><p className="text-xs text-slate-500">{passwordScore < 2 ? 'Daha güçlü bir şifre seç' : passwordScore < 4 ? 'İyi gidiyor, biraz daha güçlendir' : 'Güçlü şifre'}</p></div>}
          {error && <p role="alert" className="rounded-xl border border-rose-400/20 bg-rose-400/10 px-3 py-2.5 text-sm text-rose-200">{error}</p>}<Button fullWidth size="lg" onClick={submit} disabled={loading} className="mt-2 shadow-xl shadow-indigo-950/40">{loading ? <Loader2 className="h-5 w-5 animate-spin" /> : registering ? <UserPlus className="h-5 w-5" /> : <LogIn className="h-5 w-5" />}{loading ? 'Kontrol ediliyor...' : registering ? 'Hesabımı oluştur' : 'Giriş yap'}</Button></div>
        <button type="button" onClick={switchMode} disabled={loading} className="mt-6 flex min-h-11 w-full items-center justify-center gap-1 text-sm text-indigo-300 transition hover:text-indigo-200 disabled:opacity-50">{registering ? 'Zaten hesabın var mı?' : 'İlk kez mi oynuyorsun?'} <span className="font-bold underline underline-offset-4">{registering ? 'Giriş yap' : 'Ücretsiz kayıt ol'}</span></button><p className="mt-5 flex items-center justify-center gap-1.5 text-center text-[11px] leading-5 text-slate-500"><ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> İlerlemen bulutta güvenle saklanır. Aynı hesapla her cihazdan devam et.</p>{!registering && <p className="mt-4 text-center text-xs text-slate-600"><Lightbulb className="mr-1 inline h-3.5 w-3.5" /> Kullanıcı adını ve şifreni büyük/küçük harfe dikkat ederek gir.</p>}</section>
    </div></main>
}
