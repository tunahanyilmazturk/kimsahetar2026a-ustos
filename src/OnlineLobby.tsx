import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Copy, Link, Plus, Users, LogOut, Crown, Check } from 'lucide-react'
import { Button } from './components/common/Button'
import { Avatar } from './components/common/Avatar'
import { useToast } from './components/common/toast-context'
import { supabase } from './lib/supabase'
import { profileApi } from './lib/profileApi'
import { cn } from './utils/cn'

interface RoomPlayer {
  user_id: string
  username: string
  avatar: string
  is_ready: boolean
  is_host: boolean
}

function generateRoomCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('')
}

export function OnlineLobby({ onExit, onEnterRoom }: { onExit: () => void; onEnterRoom: (info: { roomId: string; roomCode: string }) => void }) {
  const [roomCode, setRoomCode] = useState('')
  const [activeRoom, setActiveRoom] = useState<string | null>(null)
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null)
  const [players, setPlayers] = useState<RoomPlayer[]>([])
  const [isHost, setIsHost] = useState(false)
  const [loading, setLoading] = useState(false)
  const toast = useToast()

  const myProfile = profileApi.get()

  // ─── Realtime subscription ────────────────────────────────────────────────
  const refreshPlayersRef = useRef<(() => Promise<void>) | null>(null)

  useEffect(() => {
    if (!activeRoomId) return

    const refresh = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: room } = await supabase
        .from('rooms')
        .select('host_id, state')
        .eq('id', activeRoomId)
        .single()

      if (!room) {
        setActiveRoom(null)
        setActiveRoomId(null)
        setPlayers([])
        toast.info('Oda kapatıldı')
        return
      }

      const { data: roomPlayers } = await supabase
        .from('room_players')
        .select('user_id, is_ready')
        .eq('room_id', activeRoomId)

      if (!roomPlayers) return

      const userIds = roomPlayers.map((rp) => rp.user_id)
      if (userIds.length === 0) {
        setPlayers([])
        return
      }

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, avatar')
        .in('id', userIds)

      const { data: inventories } = await supabase
        .from('inventory')
        .select('user_id, equipped_avatar')
        .in('user_id', userIds)

      const equippedMap = new Map<string, string>()
      for (const inv of inventories ?? []) {
        equippedMap.set(inv.user_id, inv.equipped_avatar)
      }

      const playerList: RoomPlayer[] = (profiles ?? []).map((p) => ({
        user_id: p.id,
        username: p.username,
        avatar: equippedMap.get(p.id) ?? p.avatar,
        is_ready: roomPlayers.find((rp) => rp.user_id === p.id)?.is_ready ?? false,
        is_host: room.host_id === p.id,
      }))

      setPlayers(playerList)
      setIsHost(room.host_id === user.id)
    }

    refreshPlayersRef.current = refresh

    const channel = supabase
      .channel(`room:${activeRoomId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'room_players', filter: `room_id=eq.${activeRoomId}` },
        () => { void refreshPlayersRef.current?.() },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${activeRoomId}` },
        () => { void refreshPlayersRef.current?.() },
      )
      .subscribe()

    void refresh()

    return () => {
      refreshPlayersRef.current = null
      void supabase.removeChannel(channel)
    }
  }, [activeRoomId, toast])

  const refreshPlayers = async (roomId: string) => {
    refreshPlayersRef.current?.()
    // Fallback: eğer ref boşsa (ilk mount), manuel çek
    if (!refreshPlayersRef.current) {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: room } = await supabase.from('rooms').select('host_id, state').eq('id', roomId).single()
      if (!room) return
      const { data: roomPlayers } = await supabase.from('room_players').select('user_id, is_ready').eq('room_id', roomId)
      if (!roomPlayers) return
      const userIds = roomPlayers.map((rp) => rp.user_id)
      if (userIds.length === 0) { setPlayers([]); return }
      const { data: profiles } = await supabase.from('profiles').select('id, username, avatar').in('id', userIds)
      const { data: inventories } = await supabase.from('inventory').select('user_id, equipped_avatar').in('user_id', userIds)
      const equippedMap = new Map<string, string>()
      for (const inv of inventories ?? []) equippedMap.set(inv.user_id, inv.equipped_avatar)
      setPlayers((profiles ?? []).map((p) => ({
        user_id: p.id,
        username: p.username,
        avatar: equippedMap.get(p.id) ?? p.avatar,
        is_ready: roomPlayers.find((rp) => rp.user_id === p.id)?.is_ready ?? false,
        is_host: room.host_id === p.id,
      })))
      setIsHost(room.host_id === user.id)
    }
  }

  // ─── Oda oluştur ─────────────────────────────────────────────────────────
  const createRoom = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('Giriş yapmanız gerekli')
        return
      }

      const code = generateRoomCode()

      const { data: room, error } = await supabase
        .from('rooms')
        .insert({
          code,
          host_id: user.id,
          state: 'LOBBY',
          settings: {},
        })
        .select('id, code')
        .single()

      if (error || !room) {
        toast.error('Oda oluşturulamadı')
        return
      }

      await supabase
        .from('room_players')
        .insert({
          room_id: room.id,
          user_id: user.id,
          is_ready: true,
        })

      setActiveRoom(room.code)
      setActiveRoomId(room.id)
      await refreshPlayers(room.id)
      toast.success(`Oda ${room.code} oluşturuldu`)
      onEnterRoom({ roomId: room.id, roomCode: room.code })
    } catch {
      toast.error('Bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  // ─── Odaya katıl ─────────────────────────────────────────────────────────
  const joinRoom = async () => {
    if (roomCode.length < 4) return
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('Giriş yapmanız gerekli')
        return
      }

      const { data: room, error } = await supabase
        .from('rooms')
        .select('id, code, state')
        .eq('code', roomCode.toUpperCase())
        .single()

      if (error || !room) {
        toast.error('Oda bulunamadı')
        return
      }

      if (room.state !== 'LOBBY') {
        toast.error('Bu oda zaten dolu veya oyun başlamış')
        return
      }

      await supabase
        .from('room_players')
        .upsert({
          room_id: room.id,
          user_id: user.id,
          is_ready: false,
        })

      setActiveRoom(room.code)
      setActiveRoomId(room.id)
      await refreshPlayers(room.id)
      toast.success(`Odaya ${room.code} katıldın`)
      onEnterRoom({ roomId: room.id, roomCode: room.code })
    } catch {
      toast.error('Bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  // ─── Odadan ayrıl ────────────────────────────────────────────────────────
  const leaveRoom = async () => {
    if (!activeRoomId) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase
      .from('room_players')
      .delete()
      .eq('room_id', activeRoomId)
      .eq('user_id', user.id)

    // Host ayrılıyorsa odayı kapat
    if (isHost) {
      await supabase
        .from('rooms')
        .delete()
        .eq('id', activeRoomId)
    }

    setActiveRoom(null)
    setActiveRoomId(null)
    setPlayers([])
    setIsHost(false)
    toast.info('Odadan ayrıldın')
  }

  // ─── Hazır durumunu değiştir ─────────────────────────────────────────────
  const toggleReady = async () => {
    if (!activeRoomId) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const me = players.find((p) => p.user_id === user.id)
    const newReady = !(me?.is_ready ?? false)

    await supabase
      .from('room_players')
      .update({ is_ready: newReady })
      .eq('room_id', activeRoomId)
      .eq('user_id', user.id)
  }

  const copyInvite = async () => {
    if (!activeRoom) return
    await navigator.clipboard?.writeText(activeRoom)
    toast.success('Oda kodu kopyalandı')
  }

  // ─── Oda içi görünüm ─────────────────────────────────────────────────────
  if (activeRoom) {
    const allReady = players.length >= 3 && players.every((p) => p.is_ready)
    return (
      <div className="min-h-svh w-full bg-slate-950 px-4 py-6 text-slate-100">
        <div className="mx-auto w-full max-w-md">
          <button type="button" onClick={onExit} className="mb-6 flex min-h-11 items-center gap-2 text-slate-400 hover:text-white">
            <ArrowLeft className="h-5 w-5" /> Ana Menü
          </button>

          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Oda kodu</p>
            <div className="mt-2 flex items-center justify-between rounded-xl bg-slate-900 px-4 py-3 ring-1 ring-slate-700">
              <span className="font-mono text-2xl tracking-[0.3em] text-cyan-300">{activeRoom}</span>
              <button type="button" onClick={copyInvite} aria-label="Oda kodunu kopyala" className="rounded-lg p-2 text-slate-300 hover:bg-slate-800">
                <Copy className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-500">Bu kodu arkadaşlarınla paylaş — kodu girip odaya katılabilirler.</p>
          </div>

          <div className="mb-4 flex items-center gap-2 text-sm text-slate-400">
            <Users className="h-4 w-4" />
            <span>{players.length} oyuncu</span>
            <span className="text-slate-600">·</span>
            <span className={cn(allReady ? 'text-emerald-400' : 'text-amber-400')}>
              {allReady ? 'Herkes hazır' : `${players.filter((p) => p.is_ready).length}/${players.length} hazır`}
            </span>
          </div>

          <div className="space-y-2">
            {players.map((p) => (
              <div
                key={p.user_id}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-4 py-3 ring-1',
                  p.is_ready ? 'bg-emerald-500/10 ring-emerald-500/30' : 'bg-slate-900/80 ring-slate-800',
                )}
              >
                <Avatar avatarId={p.avatar} size="sm" hideFrame />
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium text-slate-100">
                    {p.username}
                    {p.user_id === myProfile.playerId && ' (sen)'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {p.is_host ? 'Host' : 'Oyuncu'}
                  </p>
                </div>
                {p.is_host && <Crown className="h-4 w-4 text-amber-400" />}
                {p.is_ready && <Check className="h-4 w-4 text-emerald-400" />}
              </div>
            ))}
          </div>

          <div className="mt-6 flex gap-3">
            <Button variant="secondary" onClick={leaveRoom}>
              <LogOut className="h-4 w-4" />
              Ayrıl
            </Button>
            {!isHost && (
              <Button fullWidth onClick={toggleReady}>
                {players.find((p) => p.user_id === myProfile.playerId)?.is_ready ? 'Hazır değil' : 'Hazırım'}
              </Button>
            )}
            {isHost && (
              <Button variant="success" fullWidth disabled={!allReady}>
                <Plus className="h-4 w-4" />
                Oyunu Başlat
              </Button>
            )}
          </div>
          {isHost && !allReady && (
            <p className="mt-3 text-center text-xs text-slate-500">
              Oyunu başlatmak için en az 3 oyuncu ve herkesin hazır olması gerekir.
            </p>
          )}
        </div>
      </div>
    )
  }

  // ─── Oda oluşturma/katılma görünümü ──────────────────────────────────────
  return (
    <div className="min-h-svh w-full bg-slate-950 px-4 py-6 text-slate-100">
      <div className="mx-auto w-full max-w-md">
        <button type="button" onClick={onExit} className="mb-8 flex min-h-11 items-center gap-2 text-slate-400 hover:text-white">
          <ArrowLeft className="h-5 w-5" /> Ana Menü
        </button>

        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Online oyun</p>
          <h1 className="mt-2 text-3xl font-bold">Ekibini topla</h1>
          <p className="mt-2 text-sm text-slate-400">Arkadaşlarını davet et, odayı kur ve gizli rol oyununa başla.</p>
        </div>

        <div className="space-y-3">
          <section className="rounded-2xl border border-indigo-400/30 bg-indigo-500/10 p-4">
            <div className="flex items-center gap-3">
              <Plus className="h-5 w-5 text-indigo-300" />
              <div>
                <h2 className="font-semibold">Yeni oda kur</h2>
                <p className="text-xs text-slate-400">Bir davet kodu oluştur.</p>
              </div>
            </div>
            <Button fullWidth className="mt-4" onClick={createRoom} disabled={loading}>
              <Plus className="h-4 w-4" />
              {loading ? 'Oluşturuluyor...' : 'Oda Oluştur'}
            </Button>
          </section>

          <section className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
            <div className="flex items-center gap-3">
              <Link className="h-5 w-5 text-cyan-300" />
              <div>
                <h2 className="font-semibold">Odaya katıl</h2>
                <p className="text-xs text-slate-400">Arkadaşının kodunu gir.</p>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <input
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                maxLength={6}
                placeholder="ABC123"
                aria-label="Oda kodu"
                className="min-w-0 flex-1 rounded-xl bg-slate-950 px-4 font-mono tracking-widest text-slate-100 ring-1 ring-slate-700 focus:outline-none focus:ring-cyan-400"
              />
              <Button disabled={roomCode.length < 4 || loading} onClick={joinRoom}>
                Katıl
              </Button>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-emerald-300" />
              <div>
                <h2 className="font-semibold">Nasıl oynanır?</h2>
                <p className="text-xs text-slate-400">Online oyun akışı.</p>
              </div>
            </div>
            <ol className="mt-4 space-y-2 text-xs text-slate-400">
              <li className="flex gap-2"><span className="font-bold text-indigo-300">1.</span> Oda oluştur veya arkadaşının koduyla katıl.</li>
              <li className="flex gap-2"><span className="font-bold text-indigo-300">2.</span> Herkes hazır olduğunda host oyunu başlatır.</li>
              <li className="flex gap-2"><span className="font-bold text-indigo-300">3.</span> Her oyuncu kendi cihazında rolünü görür.</li>
              <li className="flex gap-2"><span className="font-bold text-indigo-300">4.</span> İpuçları verin, oylayın ve sahtekarı yakalayın!</li>
            </ol>
          </section>
        </div>
      </div>
    </div>
  )
}
