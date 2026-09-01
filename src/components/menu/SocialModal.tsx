import { useCallback, useEffect, useState } from 'react'
import { UserPlus, UserRoundX, Users, Wifi, Loader2 } from 'lucide-react'
import { Modal } from '../common/Modal'
import { Button } from '../common/Button'
import { Avatar } from '../common/Avatar'
import { useToast } from '../common/toast-context'
import { supabase } from '../../lib/supabase'

interface Friend {
  user_id: string
  username: string
  avatar: string
  status: 'pending' | 'accepted'
}

export function SocialModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [friends, setFriends] = useState<Friend[]>([])
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const toast = useToast()

  const loadFriends = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }

    const { data } = await supabase
      .from('friends')
      .select('friend_id, status')
      .eq('user_id', user.id)

    if (!data || data.length === 0) {
      setFriends([])
      setLoading(false)
      return
    }

    const friendIds = data.map((f) => f.friend_id)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, avatar')
      .in('id', friendIds)

    const { data: inventories } = await supabase
      .from('inventory')
      .select('user_id, equipped_avatar')
      .in('user_id', friendIds)

    const equippedMap = new Map<string, string>()
    for (const inv of inventories ?? []) {
      equippedMap.set(inv.user_id, inv.equipped_avatar)
    }

    const friendList: Friend[] = (profiles ?? []).map((p) => ({
      user_id: p.id,
      username: p.username,
      avatar: equippedMap.get(p.id) ?? p.avatar,
      status: data.find((f) => f.friend_id === p.id)?.status as 'pending' | 'accepted' ?? 'accepted',
    }))

    setFriends(friendList)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    void (async () => {
      if (!cancelled) setLoading(true)
      await loadFriends()
    })()
    return () => { cancelled = true }
  }, [open, loadFriends])

  const addFriend = async () => {
    const value = name.trim()
    if (!value) return
    if (value.length < 3) {
      toast.warning('Geçerli bir kullanıcı adı gir')
      return
    }

    setAdding(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('Giriş yapmanız gerekli')
        return
      }

      // Kullanıcı adıyla profile ara
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, username')
        .ilike('username', value)
        .single()

      if (!profile) {
        toast.error('Bu kullanıcı adı bulunamadı')
        return
      }

      if (profile.id === user.id) {
        toast.warning('Kendini ekleyemezsin')
        return
      }

      // Zaten arkadaş mı?
      const existing = friends.find((f) => f.user_id === profile.id)
      if (existing) {
        toast.warning('Bu arkadaş zaten listede')
        return
      }

      const { error } = await supabase
        .from('friends')
        .insert({
          user_id: user.id,
          friend_id: profile.id,
          status: 'accepted',
        })

      if (error) {
        toast.error('Eklenemedi: ' + error.message)
        return
      }

      setName('')
      toast.success(`${profile.username} arkadaş olarak eklendi`)
      await loadFriends()
    } catch {
      toast.error('Bir hata oluştu')
    } finally {
      setAdding(false)
    }
  }

  const removeFriend = async (friendId: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('friends')
      .delete()
      .eq('user_id', user.id)
      .eq('friend_id', friendId)

    if (error) {
      toast.error('Kaldırılamadı')
      return
    }

    setFriends(friends.filter((f) => f.user_id !== friendId))
    toast.info('Arkadaş kaldırıldı')
  }

  return (
    <Modal open={open} onClose={onClose} title="Sosyal" size="md">
      <div className="space-y-4">
        <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-4">
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-cyan-300" />
            <div>
              <p className="font-semibold text-cyan-100">Arkadaşlarınla oyna</p>
              <p className="text-xs text-slate-400">Kullanıcı adıyla arkadaş ekle ve online odana davet et.</p>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !adding && addFriend()}
            placeholder="Kullanıcı adı"
            aria-label="Arkadaş kullanıcı adı"
            disabled={adding}
            className="min-w-0 flex-1 rounded-xl bg-slate-800 px-3 py-3 text-sm text-slate-100 ring-1 ring-slate-700 focus:outline-none focus:ring-cyan-400 disabled:opacity-50"
          />
          <Button onClick={addFriend} disabled={!name.trim() || adding}>
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            Ekle
          </Button>
        </div>

        <div className="space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
            </div>
          ) : friends.length === 0 ? (
            <div className="rounded-xl bg-slate-800/50 px-4 py-8 text-center text-sm text-slate-500">
              Henüz arkadaş eklenmedi. Yukarıya kullanıcı adı yazarak arkadaş ekleyebilirsin.
            </div>
          ) : (
            friends.map((friend) => (
              <div key={friend.user_id} className="flex items-center gap-3 rounded-xl bg-slate-800/60 px-3 py-3">
                <Avatar avatarId={friend.avatar} size="sm" hideFrame />
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm text-slate-200">{friend.username}</p>
                  <p className="flex items-center gap-1 text-xs text-emerald-400">
                    <Wifi className="h-3 w-3" />
                    Arkadaş
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeFriend(friend.user_id)}
                  aria-label={`${friend.username} kaldır`}
                  className="rounded-lg p-2 text-slate-500 hover:bg-rose-500/10 hover:text-rose-300"
                >
                  <UserRoundX className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  )
}
