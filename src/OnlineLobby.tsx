import { useState } from 'react'
import { ArrowLeft, Copy, Link, Plus, Users, UserPlus } from 'lucide-react'
import { Button } from './components/common/Button'
import { useToast } from './components/common/toast-context'

export function OnlineLobby({ onExit }: { onExit: () => void }) {
  const [roomCode, setRoomCode] = useState('')
  const [createdCode, setCreatedCode] = useState<string | null>(null)
  const toast = useToast()
  const createRoom = () => setCreatedCode(Math.random().toString(36).slice(2, 8).toUpperCase())
  const copyInvite = async () => { if (!createdCode) return; await navigator.clipboard?.writeText(createdCode); toast.success('Oda kodu kopyalandı') }
  return <div className="min-h-svh w-full bg-slate-950 px-4 py-6 text-slate-100">
    <div className="mx-auto w-full max-w-md">
      <button type="button" onClick={onExit} className="mb-8 flex min-h-11 items-center gap-2 text-slate-400 hover:text-white"><ArrowLeft className="h-5 w-5" /> Ana Menü</button>
      <div className="mb-6"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Online oyun</p><h1 className="mt-2 text-3xl font-bold">Ekibini topla</h1><p className="mt-2 text-sm text-slate-400">Arkadaşlarını davet et, odayı kur ve gizli rol oyununa başla.</p></div>
      <div className="space-y-3">
        <section className="rounded-2xl border border-indigo-400/30 bg-indigo-500/10 p-4"><div className="flex items-center gap-3"><Plus className="h-5 w-5 text-indigo-300" /><div><h2 className="font-semibold">Yeni oda kur</h2><p className="text-xs text-slate-400">Bir davet kodu oluştur.</p></div></div>{createdCode ? <div className="mt-4 flex items-center justify-between rounded-xl bg-slate-950/70 px-3 py-3"><span className="font-mono text-xl tracking-[0.3em] text-cyan-300">{createdCode}</span><button type="button" onClick={copyInvite} aria-label="Oda kodunu kopyala" className="rounded-lg p-2 text-slate-300 hover:bg-slate-800"><Copy className="h-4 w-4" /></button></div> : <Button fullWidth className="mt-4" onClick={createRoom}><Plus className="h-4 w-4" /> Oda Oluştur</Button>}</section>
        <section className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4"><div className="flex items-center gap-3"><Link className="h-5 w-5 text-cyan-300" /><div><h2 className="font-semibold">Odaya katıl</h2><p className="text-xs text-slate-400">Arkadaşının kodunu gir.</p></div></div><div className="mt-4 flex gap-2"><input value={roomCode} onChange={e => setRoomCode(e.target.value.toUpperCase())} maxLength={6} placeholder="ABC123" aria-label="Oda kodu" className="min-w-0 flex-1 rounded-xl bg-slate-950 px-4 font-mono tracking-widest text-slate-100 ring-1 ring-slate-700 focus:outline-none focus:ring-cyan-400" /><Button disabled={roomCode.length < 4} onClick={() => toast.info('Online sunucu bağlantısı yakında aktif olacak')}>Katıl</Button></div></section>
        <section className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4"><div className="flex items-center justify-between"><div className="flex items-center gap-3"><Users className="h-5 w-5 text-emerald-300" /><div><h2 className="font-semibold">Arkadaşlar</h2><p className="text-xs text-slate-400">Davet göndermek için hazır.</p></div></div><button type="button" aria-label="Arkadaş ekle" className="rounded-lg p-2 text-slate-300 hover:bg-slate-800"><UserPlus className="h-4 w-4" /></button></div><p className="mt-4 rounded-xl bg-slate-950/60 px-3 py-3 text-xs text-slate-500">Arkadaş listesi ve gerçek zamanlı davetler sunucu bağlantısı eklendiğinde burada görünecek.</p></section>
      </div>
    </div>
  </div>
}
