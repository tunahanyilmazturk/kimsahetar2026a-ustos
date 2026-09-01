import { useCallback, useEffect, useState } from 'react'
import { UserPlus, UserRoundX, Users, Wifi, Loader2, Check, X, Clock, UserCheck, Inbox, Gamepad2, DoorOpen } from 'lucide-react'
import { Modal } from '../common/Modal'
import { Button } from '../common/Button'
import { Avatar } from '../common/Avatar'
import { useToast } from '../common/toast-context'
import { supabase } from '../../lib/supabase'
import { cn } from '../../utils/cn'

interface Friend {
  user_id: string
  username: string
  avatar: string
  status: 'pending' | 'accepted'
  direction: 'sent' | 'received' // sent: ben gönderdim, received: bana geldi
  created_at: string
}

interface RoomInvite {
  id: string
  room_id: string
  room_code: string
  inviter_id: string
  inviter_name: string
  inviter_avatar: string
  status: 'pending' | 'accepted' | 'rejected' | 'expired'
  created_at: string
}

type Tab = 'friends' | 'requests' | 'invites'

export function SocialModal({ open, onClose, onJoinRoom }: { open: boolean; onClose: () => void; onJoinRoom?: (roomCode: string) => void }) {
  const [tab, setTab] = useState<Tab>('friends')
  const [friends, setFriends] = useState<Friend[]>([])
  const [roomInvites, setRoomInvites] = useState<RoomInvite[]>([])
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [acting, setActing] = useState<string | null>(null) // işlem yapılan friend_id
  const [inviteActing, setInviteActing] = useState<string | null>(null)
  const toast = useToast()

  // ─── Load friends + requests ─────────────────────────────────────────────
  const loadFriends = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }

    // Benim gönderdiğim istekler (user_id = ben)
    const { data: sent } = await supabase
      .from('friends')
      .select('friend_id, status, created_at')
      .eq('user_id', user.id)

    // Bana gelen istekler (friend_id = ben)
    const { data: received } = await supabase
      .from('friends')
      .select('user_id, status, created_at')
      .eq('friend_id', user.id)

    // Tüm ilgili user_id'leri topla
    const userIds = new Set<string>()
    for (const f of sent ?? []) userIds.add(f.friend_id)
    for (const f of received ?? []) userIds.add(f.user_id)
    if (userIds.size === 0) {
      setFriends([])
      setLoading(false)
      return
    }

    // Profile'ları çek
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, avatar')
      .in('id', [...userIds])

    const { data: inventories } = await supabase
      .from('inventory')
      .select('user_id, equipped_avatar')
      .in('user_id', [...userIds])

    const equippedMap = new Map<string, string>()
    for (const inv of inventories ?? []) {
      equippedMap.set(inv.user_id, inv.equipped_avatar)
    }

    const friendList: Friend[] = []

    // Sent (ben gönderdim) — friend_id karşı taraf
    for (const f of sent ?? []) {
      const p = profiles?.find((pr) => pr.id === f.friend_id)
      if (!p) continue
      friendList.push({
        user_id: f.friend_id,
        username: p.username,
        avatar: equippedMap.get(p.id) ?? p.avatar,
        status: f.status as 'pending' | 'accepted',
        direction: 'sent',
        created_at: f.created_at,
      })
    }

    // Received (bana geldi) — user_id karşı taraf
    for (const f of received ?? []) {
      const p = profiles?.find((pr) => pr.id === f.user_id)
      if (!p) continue
      friendList.push({
        user_id: f.user_id,
        username: p.username,
        avatar: equippedMap.get(p.id) ?? p.avatar,
        status: f.status as 'pending' | 'accepted',
        direction: 'received',
        created_at: f.created_at,
      })
    }

    setFriends(friendList)
    setLoading(false)
  }, [])

  // ─── Load room invites ────────────────────────────────────────────────────
  const loadRoomInvites = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: invites } = await supabase
      .from('room_invites')
      .select('id, room_id, room_code, inviter_id, status, created_at')
      .eq('invitee_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (!invites || invites.length === 0) {
      setRoomInvites([])
      return
    }

    const inviterIds = [...new Set(invites.map((i) => i.inviter_id))]
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, avatar')
      .in('id', inviterIds)
    const { data: inv } = await supabase
      .from('inventory')
      .select('user_id, equipped_avatar')
      .in('user_id', inviterIds)
    const equippedMap = new Map<string, string>()
    for (const i of inv ?? []) equippedMap.set(i.user_id, i.equipped_avatar)

    // Oda hala aktif mi kontrol et
    const roomIds = [...new Set(invites.map((i) => i.room_id))]
    const { data: rooms } = await supabase
      .from('rooms')
      .select('id, state')
      .in('id', roomIds)
    const activeRoomIds = new Set((rooms ?? []).filter((r) => r.state === 'LOBBY').map((r) => r.id))

    const inviteList: RoomInvite[] = []
    for (const inv of invites) {
      // Oda artık aktif değilse daveti expired işaretle
      if (!activeRoomIds.has(inv.room_id)) {
        await supabase.from('room_invites').update({ status: 'expired' }).eq('id', inv.id)
        continue
      }
      const p = profiles?.find((pr) => pr.id === inv.inviter_id)
      if (!p) continue
      inviteList.push({
        id: inv.id,
        room_id: inv.room_id,
        room_code: inv.room_code,
        inviter_id: inv.inviter_id,
        inviter_name: p.username,
        inviter_avatar: equippedMap.get(p.id) ?? p.avatar,
        status: inv.status as RoomInvite['status'],
        created_at: inv.created_at,
      })
    }
    setRoomInvites(inviteList)
  }, [])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    void (async () => {
      if (!cancelled) setLoading(true)
      await Promise.all([loadFriends(), loadRoomInvites()])
    })()
    return () => { cancelled = true }
  }, [open, loadFriends, loadRoomInvites])

  // ─── Realtime: friends + room_invites değişince yeniden yükle ─────────────
  useEffect(() => {
    if (!open) return
    const channel = supabase
      .channel('social_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'friends' },
        () => { void loadFriends() },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'room_invites' },
        () => { void loadRoomInvites() },
      )
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [open, loadFriends, loadRoomInvites])

  // ─── Derived values ──────────────────────────────────────────────────────
  const acceptedFriends = friends.filter((f) => f.status === 'accepted')
  const pendingReceived = friends.filter((f) => f.status === 'pending' && f.direction === 'received')
  const pendingSent = friends.filter((f) => f.status === 'pending' && f.direction === 'sent')
  const pendingRoomInvites = roomInvites.filter((i) => i.status === 'pending')

  // ─── Send friend request ─────────────────────────────────────────────────
  const sendRequest = async () => {
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

      // Kullanıcıyı ara — username, player_id, veya kısmi eşleşme
      let profile: { id: string; username: string } | null = null

      // 1. Username tam eşleşme
      const { data: byUsername } = await supabase
        .from('profiles')
        .select('id, username')
        .ilike('username', value)
        .limit(1)
        .maybeSingle()
      profile = byUsername

      // 2. Player ID ile
      if (!profile && value.toUpperCase().startsWith('SK-')) {
        const { data: byPlayerId } = await supabase
          .from('profiles')
          .select('id, username')
          .eq('player_id', value.toUpperCase())
          .limit(1)
          .maybeSingle()
        profile = byPlayerId
      }

      // 3. Kısmi eşleşme
      if (!profile) {
        const { data: partial } = await supabase
          .from('profiles')
          .select('id, username')
          .ilike('username', `%${value}%`)
          .limit(1)
          .maybeSingle()
        profile = partial
      }

      if (!profile) {
        toast.error('Bu kullanıcı bulunamadı')
        return
      }

      if (profile.id === user.id) {
        toast.warning('Kendini ekleyemezsin')
        return
      }

      // Zaten kayıt var mı?
      const existing = friends.find((f) => f.user_id === profile!.id)
      if (existing) {
        if (existing.status === 'accepted') toast.warning('Bu arkadaş zaten listede')
        else if (existing.direction === 'sent') toast.info('Bu kişiye zaten istek gönderdin')
        else toast.info('Bu kişiden zaten istek var — İstekler sekmesinden kabul et')
        return
      }

      // İstek gönder — pending status
      const { error } = await supabase
        .from('friends')
        .insert({
          user_id: user.id,
          friend_id: profile.id,
          status: 'pending',
        })

      if (error) {
        toast.error('İstek gönderilemedi: ' + error.message)
        return
      }

      setName('')
      toast.success(`${profile.username} kişisine arkadaşlık isteği gönderildi`)
      await loadFriends()
    } catch {
      toast.error('Bir hata oluştu')
    } finally {
      setAdding(false)
    }
  }

  // ─── Accept friend request ───────────────────────────────────────────────
  const acceptRequest = async (friendId: string) => {
    setActing(friendId)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Status'u accepted yap (ben friend_id'yim, karşı taraf user_id)
      const { error } = await supabase
        .from('friends')
        .update({ status: 'accepted' })
        .eq('user_id', friendId)
        .eq('friend_id', user.id)

      if (error) {
        toast.error('Kabul edilemedi')
        return
      }

      // Ters yönde de kayıt ekle (karşılıklı arkadaşlık)
      await supabase
        .from('friends')
        .upsert({
          user_id: user.id,
          friend_id: friendId,
          status: 'accepted',
        })

      toast.success('Arkadaşlık isteği kabul edildi')
      await loadFriends()
    } catch {
      toast.error('Bir hata oluştu')
    } finally {
      setActing(null)
    }
  }

  // ─── Reject friend request ───────────────────────────────────────────────
  const rejectRequest = async (friendId: string) => {
    setActing(friendId)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('friends')
        .delete()
        .eq('user_id', friendId)
        .eq('friend_id', user.id)

      if (error) {
        toast.error('Reddedilemedi')
        return
      }

      toast.info('Arkadaşlık isteği reddedildi')
      await loadFriends()
    } catch {
      toast.error('Bir hata oluştu')
    } finally {
      setActing(null)
    }
  }

  // ─── Cancel sent request ─────────────────────────────────────────────────
  const cancelRequest = async (friendId: string) => {
    setActing(friendId)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('friends')
        .delete()
        .eq('user_id', user.id)
        .eq('friend_id', friendId)

      if (error) {
        toast.error('İstek iptal edilemedi')
        return
      }

      toast.info('Arkadaşlık isteği iptal edildi')
      await loadFriends()
    } catch {
      toast.error('Bir hata oluştu')
    } finally {
      setActing(null)
    }
  }

  // ─── Remove friend ───────────────────────────────────────────────────────
  const removeFriend = async (friendId: string) => {
    setActing(friendId)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Her iki yönden de sil
      await supabase.from('friends').delete().eq('user_id', user.id).eq('friend_id', friendId)
      await supabase.from('friends').delete().eq('user_id', friendId).eq('friend_id', user.id)

      setFriends(friends.filter((f) => f.user_id !== friendId))
      toast.info('Arkadaş kaldırıldı')
    } catch {
      toast.error('Kaldırılamadı')
    } finally {
      setActing(null)
    }
  }

  // ─── Accept room invite (odaya katıl) ─────────────────────────────────────
  const acceptRoomInvite = async (invite: RoomInvite) => {
    setInviteActing(invite.id)
    try {
      await supabase
        .from('room_invites')
        .update({ status: 'accepted' })
        .eq('id', invite.id)

      toast.success(`${invite.inviter_name} odasına katılınıyor...`)
      setRoomInvites(roomInvites.filter((i) => i.id !== invite.id))
      onClose()
      onJoinRoom?.(invite.room_code)
    } catch {
      toast.error('Odaya katılınamadı')
    } finally {
      setInviteActing(null)
    }
  }

  // ─── Reject room invite ───────────────────────────────────────────────────
  const rejectRoomInvite = async (inviteId: string) => {
    setInviteActing(inviteId)
    try {
      await supabase
        .from('room_invites')
        .update({ status: 'rejected' })
        .eq('id', inviteId)

      setRoomInvites(roomInvites.filter((i) => i.id !== inviteId))
      toast.info('Oda daveti reddedildi')
    } catch {
      toast.error('Reddedilemedi')
    } finally {
      setInviteActing(null)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Sosyal" size="md">
      <div className="space-y-4">
        {/* ─── Bilgi kartı ─────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-4">
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-cyan-300" />
            <div>
              <p className="font-semibold text-cyan-100">Arkadaşlarınla oyna</p>
              <p className="text-xs text-slate-400">Kullanıcı adı veya Player ID ile arkadaşlık isteği gönder.</p>
            </div>
          </div>
        </div>

        {/* ─── İstek gönder ────────────────────────────────────────────── */}
        <div className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !adding && sendRequest()}
            placeholder="Kullanıcı adı veya Player ID (SK-XXXXXXXX)"
            aria-label="Arkadaş kullanıcı adı"
            disabled={adding}
            className="min-w-0 flex-1 rounded-xl bg-slate-800 px-3 py-3 text-sm text-slate-100 ring-1 ring-slate-700 focus:outline-none focus:ring-cyan-400 disabled:opacity-50"
          />
          <Button onClick={sendRequest} disabled={!name.trim() || adding}>
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            İstek Gönder
          </Button>
        </div>

        {/* ─── Sekmeler ────────────────────────────────────────────────── */}
        <div className="flex gap-2 rounded-xl bg-slate-800/40 p-1">
          <button
            type="button"
            onClick={() => setTab('friends')}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition-colors',
              tab === 'friends' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-slate-200',
            )}
          >
            <UserCheck className="h-3.5 w-3.5" />
            Arkadaşlar
            {acceptedFriends.length > 0 && (
              <span className="rounded-full bg-slate-700 px-1.5 text-[10px]">{acceptedFriends.length}</span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setTab('requests')}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition-colors',
              tab === 'requests' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-slate-200',
            )}
          >
            <Inbox className="h-3.5 w-3.5" />
            İstekler
            {pendingReceived.length > 0 && (
              <span className="rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white">{pendingReceived.length}</span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setTab('invites')}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition-colors',
              tab === 'invites' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-slate-200',
            )}
          >
            <Gamepad2 className="h-3.5 w-3.5" />
            Davetler
            {pendingRoomInvites.length > 0 && (
              <span className="rounded-full bg-emerald-500 px-1.5 text-[10px] font-bold text-white">{pendingRoomInvites.length}</span>
            )}
          </button>
        </div>

        {/* ─── İçerik ──────────────────────────────────────────────────── */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
          </div>
        ) : tab === 'friends' ? (
          /* ─── Arkadaşlar listesi ── */
          <div className="space-y-2">
            {acceptedFriends.length === 0 ? (
              <div className="rounded-xl bg-slate-800/50 px-4 py-8 text-center text-sm text-slate-500">
                Henüz arkadaşın yok. Yukarıya kullanıcı adı yazarak arkadaşlık isteği gönder.
              </div>
            ) : (
              acceptedFriends.map((friend) => (
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
                    disabled={acting === friend.user_id}
                    aria-label={`${friend.username} kaldır`}
                    className="rounded-lg p-2 text-slate-500 hover:bg-rose-500/10 hover:text-rose-300 disabled:opacity-50"
                  >
                    {acting === friend.user_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserRoundX className="h-4 w-4" />}
                  </button>
                </div>
              ))
            )}
          </div>
        ) : tab === 'requests' ? (
          /* ─── İstekler listesi ── */
          <div className="space-y-3">
            {/* Bana gelen istekler */}
            {pendingReceived.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Gelen İstekler</p>
                <div className="space-y-2">
                  {pendingReceived.map((req) => (
                    <div key={req.user_id} className="flex items-center gap-3 rounded-xl bg-rose-500/10 px-3 py-3 ring-1 ring-rose-500/20">
                      <Avatar avatarId={req.avatar} size="sm" hideFrame />
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm text-slate-200">{req.username}</p>
                        <p className="text-xs text-slate-500">Sana arkadaşlık isteği gönderdi</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => acceptRequest(req.user_id)}
                        disabled={acting === req.user_id}
                        aria-label="Kabul et"
                        className="rounded-lg bg-emerald-500/20 p-2 text-emerald-300 hover:bg-emerald-500/30 disabled:opacity-50"
                      >
                        {acting === req.user_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => rejectRequest(req.user_id)}
                        disabled={acting === req.user_id}
                        aria-label="Reddet"
                        className="rounded-lg bg-rose-500/20 p-2 text-rose-300 hover:bg-rose-500/30 disabled:opacity-50"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Benim gönderdiğim istekler */}
            {pendingSent.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Gönderilen İstekler</p>
                <div className="space-y-2">
                  {pendingSent.map((req) => (
                    <div key={req.user_id} className="flex items-center gap-3 rounded-xl bg-slate-800/60 px-3 py-3 ring-1 ring-slate-700">
                      <Avatar avatarId={req.avatar} size="sm" hideFrame />
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm text-slate-200">{req.username}</p>
                        <p className="flex items-center gap-1 text-xs text-amber-400">
                          <Clock className="h-3 w-3" />
                          Beklemede
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => cancelRequest(req.user_id)}
                        disabled={acting === req.user_id}
                        aria-label="İsteği iptal et"
                        className="rounded-lg p-2 text-slate-500 hover:bg-rose-500/10 hover:text-rose-300 disabled:opacity-50"
                      >
                        {acting === req.user_id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Boş durum */}
            {pendingReceived.length === 0 && pendingSent.length === 0 && (
              <div className="rounded-xl bg-slate-800/50 px-4 py-8 text-center text-sm text-slate-500">
                Bekleyen arkadaşlık isteği yok.
              </div>
            )}
          </div>
        ) : (
          /* ─── Oda davetleri listesi ── */
          <div className="space-y-2">
            {pendingRoomInvites.length === 0 ? (
              <div className="rounded-xl bg-slate-800/50 px-4 py-8 text-center text-sm text-slate-500">
                Aktif oda davetin yok. Arkadaşların seni oyuna davet ettiğinde burada görünecek.
              </div>
            ) : (
              pendingRoomInvites.map((invite) => (
                <div key={invite.id} className="flex items-center gap-3 rounded-xl bg-emerald-500/10 px-3 py-3 ring-1 ring-emerald-500/20">
                  <Avatar avatarId={invite.inviter_avatar} size="sm" hideFrame />
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm text-slate-200">
                      <span className="font-semibold text-emerald-300">{invite.inviter_name}</span>
                      {' '}seni odaya davet etti
                    </p>
                    <p className="flex items-center gap-1.5 text-xs text-slate-400">
                      <Gamepad2 className="h-3 w-3" />
                      Oda kodu: <span className="font-mono font-semibold text-cyan-300">{invite.room_code}</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => acceptRoomInvite(invite)}
                    disabled={inviteActing === invite.id}
                    aria-label="Odaya katıl"
                    className="flex items-center gap-1 rounded-lg bg-emerald-500/20 px-3 py-2 text-xs font-medium text-emerald-300 hover:bg-emerald-500/30 disabled:opacity-50"
                  >
                    {inviteActing === invite.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><DoorOpen className="h-3.5 w-3.5" /> Katıl</>}
                  </button>
                  <button
                    type="button"
                    onClick={() => rejectRoomInvite(invite.id)}
                    disabled={inviteActing === invite.id}
                    aria-label="Reddet"
                    className="rounded-lg bg-rose-500/20 p-2 text-rose-300 hover:bg-rose-500/30 disabled:opacity-50"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}
