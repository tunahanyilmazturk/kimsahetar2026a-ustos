import { useState } from 'react'
import { UserPlus, UserRoundX, Users, Wifi } from 'lucide-react'
import { Modal } from '../common/Modal'
import { Button } from '../common/Button'
import { useToast } from '../common/toast-context'

const KEY = 'sahtekar:friends'
function loadFriends(): string[] { try { return JSON.parse(localStorage.getItem(KEY) ?? '[]') as string[] } catch { return [] } }

export function SocialModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [friends, setFriends] = useState<string[]>(loadFriends)
  const [name, setName] = useState('')
  const toast = useToast()
  const save = (next: string[]) => { setFriends(next); localStorage.setItem(KEY, JSON.stringify(next)) }
  const add = () => { const value = name.trim(); if (!value) return; if (friends.some(f => f.toLocaleLowerCase('tr-TR') === value.toLocaleLowerCase('tr-TR'))) { toast.warning('Bu arkadaş zaten listede'); return } save([...friends, value]); setName(''); toast.success('Arkadaş eklendi') }
  return <Modal open={open} onClose={onClose} title="Sosyal" size="md">
    <div className="space-y-4">
      <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-4"><div className="flex items-center gap-3"><Users className="h-5 w-5 text-cyan-300" /><div><p className="font-semibold text-cyan-100">Arkadaşlarınla oyna</p><p className="text-xs text-slate-400">Arkadaşlarını ekle ve online odana davet et.</p></div></div></div>
      <div className="flex gap-2"><input value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} placeholder="Kullanıcı adı veya oyuncu kodu" aria-label="Arkadaş adı" className="min-w-0 flex-1 rounded-xl bg-slate-800 px-3 py-3 text-sm text-slate-100 ring-1 ring-slate-700 focus:outline-none focus:ring-cyan-400" /><Button onClick={add} disabled={!name.trim()}><UserPlus className="h-4 w-4" /> Ekle</Button></div>
      <div className="space-y-2">{friends.length === 0 ? <div className="rounded-xl bg-slate-800/50 px-4 py-8 text-center text-sm text-slate-500">Henüz arkadaş eklenmedi.</div> : friends.map(friend => <div key={friend} className="flex items-center gap-3 rounded-xl bg-slate-800/60 px-3 py-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300"><Wifi className="h-4 w-4" /></span><span className="flex-1 text-sm text-slate-200">{friend}</span><button type="button" onClick={() => { save(friends.filter(f => f !== friend)); toast.info('Arkadaş kaldırıldı') }} aria-label={`${friend} kaldır`} className="rounded-lg p-2 text-slate-500 hover:bg-rose-500/10 hover:text-rose-300"><UserRoundX className="h-4 w-4" /></button></div>)}</div>
      <p className="text-xs text-slate-500">Online sunucu bağlantısı geldiğinde arkadaş durumu ve davet bildirimleri burada canlı güncellenecek.</p>
    </div>
  </Modal>
}
