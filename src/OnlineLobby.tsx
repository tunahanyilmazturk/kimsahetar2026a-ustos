import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ArrowLeft, Copy, Link, Plus, Users, LogOut, Crown, Check,
  Settings as SettingsIcon, Share2, Send, MessageSquare, Search, RefreshCw, X,
  Bot, Trash2,
} from 'lucide-react'
import { Button } from './components/common/Button'
import { Avatar } from './components/common/Avatar'
import { useToast } from './components/common/toast-context'
import { supabase } from './lib/supabase'
import { CATEGORIES } from './constants'
import { cn } from './utils/cn'

// ─── Types ─────────────────────────────────────────────────────────────────

interface RoomPlayer {
  user_id: string
  username: string
  avatar: string
  is_ready: boolean
  is_host: boolean
  is_bot: boolean
  bot_difficulty?: string
}

interface FriendForInvite {
  user_id: string
  username: string
  avatar: string
}

interface ActiveRoom {
  id: string
  code: string
  host_id: string
  state: string
  player_count: number
  host_name: string
}

interface ChatMsg {
  id: string
  user_id: string
  player_name: string
  text: string
  message_type: string
  created_at: string
}

interface RoomSettings {
  turnTimeLimit: number
  roundsBeforeVoting: number
  wordDifficulty: 'EASY' | 'MEDIUM' | 'HARD' | 'MIXED'
  selectedCategories: string[]
  isPublic: boolean
}

const DEFAULT_SETTINGS: RoomSettings = {
  turnTimeLimit: 30,
  roundsBeforeVoting: 2,
  wordDifficulty: 'MIXED',
  selectedCategories: [],
  isPublic: false,
}

function generateRoomCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('')
}

// ─── Component ─────────────────────────────────────────────────────────────

export function OnlineLobby({
  onExit,
  onEnterRoom,
  initialJoinCode,
  onJoined,
}: {
  onExit: () => void
  onEnterRoom: (info: { roomId: string; roomCode: string }) => void
  initialJoinCode?: string | null
  onJoined?: () => void
}) {
  const [roomCode, setRoomCode] = useState('')
  const [activeRoom, setActiveRoom] = useState<string | null>(null)
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null)
  const [roomState, setRoomState] = useState<string>('LOBBY')
  const [players, setPlayers] = useState<RoomPlayer[]>([])
  const [isHost, setIsHost] = useState(false)
  const [loading, setLoading] = useState(false)
  const [settings, setSettings] = useState<RoomSettings>(DEFAULT_SETTINGS)
  const [showSettings, setShowSettings] = useState(false)
  const [showInvite, setShowInvite] = useState(false)
  const [chat, setChat] = useState<ChatMsg[]>([])
  const [chatText, setChatText] = useState('')
  const [activeRooms, setActiveRooms] = useState<ActiveRoom[]>([])
  const [showActiveRooms, setShowActiveRooms] = useState(false)
  const [myUserId, setMyUserId] = useState<string | null>(null)
  const [friends, setFriends] = useState<FriendForInvite[]>([])
  const toast = useToast()

  const chatScrollRef = useRef<HTMLDivElement>(null)

  // ─── Auth user ──────────────────────────────────────────────────────────
  useEffect(() => {
    void supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setMyUserId(user.id)
    })
  }, [])

  // ─── İlk açılışta oda kodu verilmişse otomatik katıl ──────────────────────
  const joinedRef = useRef(false)
  useEffect(() => {
    if (!initialJoinCode || !myUserId || joinedRef.current || activeRoomId) return
    joinedRef.current = true
    void joinRoom(initialJoinCode).then(() => onJoined?.())
  }, [initialJoinCode, myUserId, activeRoomId, onJoined])

  // ─── Realtime subscription ────────────────────────────────────────────────
  const refreshPlayersRef = useRef<(() => Promise<void>) | null>(null)

  useEffect(() => {
    if (!activeRoomId) return

    const refresh = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: room } = await supabase
        .from('rooms')
        .select('host_id, state, settings')
        .eq('id', activeRoomId)
        .single()

      if (!room) {
        setActiveRoom(null)
        setActiveRoomId(null)
        setPlayers([])
        toast.info('Oda kapatıldı')
        return
      }

      setRoomState(room.state)

      // Settings'i yükle
      if (room.settings) {
        setSettings({ ...DEFAULT_SETTINGS, ...room.settings })
      }

      const { data: roomPlayers } = await supabase
        .from('room_players')
        .select('user_id, is_ready, is_bot, bot_name, bot_avatar, bot_difficulty')
        .eq('room_id', activeRoomId)

      if (!roomPlayers) return

      if (roomPlayers.length === 0) {
        setPlayers([])
        return
      }

      // Gerçek oyuncuların user_id'lerini topla (botlar hariç)
      const realUserIds = roomPlayers.filter((rp) => !rp.is_bot && rp.user_id).map((rp) => rp.user_id!)

      const playerList: RoomPlayer[] = []

      // Gerçek oyuncuları profile'dan çek
      if (realUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, avatar')
          .in('id', realUserIds)

        const { data: inventories } = await supabase
          .from('inventory')
          .select('user_id, equipped_avatar')
          .in('user_id', realUserIds)

        const equippedMap = new Map<string, string>()
        for (const inv of inventories ?? []) {
          equippedMap.set(inv.user_id, inv.equipped_avatar)
        }

        for (const p of profiles ?? []) {
          const rp = roomPlayers.find((r) => r.user_id === p.id)
          playerList.push({
            user_id: p.id,
            username: p.username,
            avatar: equippedMap.get(p.id) ?? p.avatar,
            is_ready: rp?.is_ready ?? false,
            is_host: room.host_id === p.id,
            is_bot: false,
          })
        }
      }

      // Botları ekle
      for (const rp of roomPlayers) {
        if (!rp.is_bot) continue
        playerList.push({
          user_id: rp.bot_name ?? 'bot',
          username: rp.bot_name ?? 'Bot',
          avatar: rp.bot_avatar ?? 'avatar_default',
          is_ready: true, // botlar her zaman hazır
          is_host: false,
          is_bot: true,
          bot_difficulty: rp.bot_difficulty,
        })
      }

      setPlayers(playerList)
      setIsHost(room.host_id === user.id)
    }

    refreshPlayersRef.current = refresh

    // Chat'i yükle
    const loadChat = async () => {
      const { data: chatData, error: chatError } = await supabase
        .from('room_chat')
        .select('*')
        .eq('room_id', activeRoomId)
        .order('created_at', { ascending: true })
      if (chatError) {
        console.warn('[chat] Yükleme hatası:', chatError.message)
        return
      }
      setChat((chatData ?? []) as ChatMsg[])
    }
    void loadChat()

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
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'room_chat', filter: `room_id=eq.${activeRoomId}` },
        (payload) => {
          const newMsg = payload.new as ChatMsg
          // Aynı mesajı tekrar ekleme (realtime + local insert çakışması)
          setChat((prev) => prev.some((m) => m.id === newMsg.id) ? prev : [...prev, newMsg])
        },
      )
      .subscribe()

    void refresh()

    return () => {
      refreshPlayersRef.current = null
      void supabase.removeChannel(channel)
    }
  }, [activeRoomId, toast])

  // ─── Oyun başlayınca otomatik geçiş ──────────────────────────────────────
  useEffect(() => {
    if (roomState === 'PLAYING' && activeRoomId && activeRoom) {
      onEnterRoom({ roomId: activeRoomId, roomCode: activeRoom })
    }
  }, [roomState, activeRoomId, activeRoom, onEnterRoom])

  // ─── Chat scroll ─────────────────────────────────────────────────────────
  useEffect(() => {
    chatScrollRef.current?.scrollTo({ top: chatScrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [chat])

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
          settings: { ...DEFAULT_SETTINGS, isPublic: false },
        })
        .select('id, code')
        .single()

      if (error || !room) {
        toast.error('Oda oluşturulamadı')
        return
      }

      const { error: joinError } = await supabase
        .from('room_players')
        .insert({
          room_id: room.id,
          user_id: user.id,
          is_ready: true,
        })

      if (joinError) {
        toast.error('Odaya katılım kaydedilemedi: ' + joinError.message)
        return
      }

      setActiveRoom(room.code)
      setActiveRoomId(room.id)
      toast.success(`Oda ${room.code} oluşturuldu`)
    } catch {
      toast.error('Bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  // ─── Odaya katıl ─────────────────────────────────────────────────────────
  const joinRoom = async (code?: string) => {
    const joinCode = (code ?? roomCode).toUpperCase()
    if (joinCode.length < 4) return
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
        .eq('code', joinCode)
        .single()

      if (error || !room) {
        toast.error('Oda bulunamadı')
        return
      }

      if (room.state !== 'LOBBY') {
        toast.error('Bu oda zaten dolu veya oyun başlamış')
        return
      }

      const { error: joinError } = await supabase
        .from('room_players')
        .upsert({
          room_id: room.id,
          user_id: user.id,
          is_ready: false,
        })

      if (joinError) {
        toast.error('Odaya katılınamadı: ' + joinError.message)
        return
      }

      setActiveRoom(room.code)
      setActiveRoomId(room.id)
      setRoomCode('')
      toast.success(`Odaya ${room.code} katıldın`)
    } catch {
      toast.error('Bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  // ─── Aktif odaları yükle ─────────────────────────────────────────────────
  const loadActiveRooms = useCallback(async () => {
    const { data: rooms } = await supabase
      .from('rooms')
      .select('id, code, host_id, state')
      .eq('state', 'LOBBY')
      .order('created_at', { ascending: false })
      .limit(20)

    if (!rooms || rooms.length === 0) {
      setActiveRooms([])
      return
    }

    // Her oda için oyuncu sayısı ve host adı
    const roomList: ActiveRoom[] = []
    for (const r of rooms) {
      const { count } = await supabase
        .from('room_players')
        .select('*', { count: 'exact', head: true })
        .eq('room_id', r.id)

      const { data: hostProfile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', r.host_id)
        .single()

      roomList.push({
        id: r.id,
        code: r.code,
        host_id: r.host_id,
        state: r.state,
        player_count: count ?? 0,
        host_name: hostProfile?.username ?? 'Oyuncu',
      })
    }
    setActiveRooms(roomList)
  }, [])

  // ─── Arkadaşları yükle (davet için) ──────────────────────────────────────
  const loadFriends = useCallback(async () => {
    if (!myUserId) return
    const { data: sent } = await supabase
      .from('friends')
      .select('friend_id, status')
      .eq('user_id', myUserId)
      .eq('status', 'accepted')
    if (!sent || sent.length === 0) {
      setFriends([])
      return
    }
    const friendIds = sent.map((f) => f.friend_id)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, avatar')
      .in('id', friendIds)
    const { data: inv } = await supabase
      .from('inventory')
      .select('user_id, equipped_avatar')
      .in('user_id', friendIds)
    const equippedMap = new Map<string, string>()
    for (const i of inv ?? []) equippedMap.set(i.user_id, i.equipped_avatar)
    setFriends((profiles ?? []).map((p) => ({
      user_id: p.id,
      username: p.username,
      avatar: equippedMap.get(p.id) ?? p.avatar,
    })))
  }, [myUserId])

  // ─── Odadan ayrıl ────────────────────────────────────────────────────────
  // Sadece room_players satırını sil — trigger gerisini halleder:
  //   - Son oyuncu ayrılırsa oda otomatik silinir
  //   - Host ayrılırsa host transferi yapılır
  //   - Oyun sırasında <3 oyuncu kalırsa oyun FINISHED olur
  const leaveRoom = async () => {
    if (!activeRoomId || !myUserId) return

    await supabase
      .from('room_players')
      .delete()
      .eq('room_id', activeRoomId)
      .eq('user_id', myUserId)

    setActiveRoom(null)
    setActiveRoomId(null)
    setPlayers([])
    setIsHost(false)
    setChat([])
    toast.info('Odadan ayrıldın')
  }

  // ─── Hazır durumunu değiştir ─────────────────────────────────────────────
  const toggleReady = async () => {
    if (!activeRoomId || !myUserId) return
    const me = players.find((p) => p.user_id === myUserId)
    const newReady = !(me?.is_ready ?? false)
    const { error } = await supabase
      .from('room_players')
      .update({ is_ready: newReady })
      .eq('room_id', activeRoomId)
      .eq('user_id', myUserId)
    if (error) toast.error('Hazır durumu güncellenemedi')
  }

  // ─── Bot ekle ────────────────────────────────────────────────────────────
  const BOT_NAMES = ['Ali', 'Ayşe', 'Mehmet', 'Zeynep', 'Can', 'Elif', 'Burak', 'Selin', 'Emre', 'Deniz']
  const BOT_AVATARS = ['avatar_01', 'avatar_02', 'avatar_03', 'avatar_04', 'avatar_05', 'avatar_06', 'avatar_07', 'avatar_08']

  const addBot = async (difficulty: 'EASY' | 'SMART' | 'EXPERT') => {
    if (!activeRoomId || !isHost) return
    // Kullanılmayan bot ismi bul
    const usedNames = players.filter((p) => p.is_bot).map((p) => p.username)
    const availableNames = BOT_NAMES.filter((n) => !usedNames.includes(n))
    if (availableNames.length === 0) {
      toast.warning('Daha fazla bot ekleyemezsin')
      return
    }
    const botName = availableNames[Math.floor(Math.random() * availableNames.length)]
    const botAvatar = BOT_AVATARS[Math.floor(Math.random() * BOT_AVATARS.length)]

    const { error } = await supabase.from('room_players').insert({
      room_id: activeRoomId,
      user_id: null,
      is_bot: true,
      bot_name: botName,
      bot_avatar: botAvatar,
      bot_difficulty: difficulty,
      is_ready: true,
    })

    if (error) {
      toast.error('Bot eklenemedi: ' + error.message)
      return
    }
    toast.success(`${botName} (Bot - ${difficulty}) odaya eklendi`)
  }

  // ─── Bot kaldır ───────────────────────────────────────────────────────────
  const removeBot = async (botName: string) => {
    if (!activeRoomId) return
    const { error } = await supabase
      .from('room_players')
      .delete()
      .eq('room_id', activeRoomId)
      .eq('is_bot', true)
      .eq('bot_name', botName)

    if (error) {
      toast.error('Bot kaldırılamadı')
      return
    }
    toast.info(`${botName} odadan çıkarıldı`)
  }

  // ─── Ayarları kaydet ─────────────────────────────────────────────────────
  const saveSettings = async () => {
    if (!activeRoomId || !isHost) return
    await supabase
      .from('rooms')
      .update({ settings })
      .eq('id', activeRoomId)
    setShowSettings(false)
    toast.success('Oda ayarları güncellendi')
  }

  // ─── Davet linki kopyala ─────────────────────────────────────────────────
  const copyInvite = async () => {
    if (!activeRoom) return
    const inviteText = `Sahtekar Kim? oynamaya davetlisin! Oda kodu: ${activeRoom}`
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Sahtekar Kim?', text: inviteText })
      } else {
        await navigator.clipboard?.writeText(inviteText)
        toast.success('Davet metni kopyalandı')
      }
    } catch {
      // kullanıcı iptal etti
    }
  }

  const copyCode = async () => {
    if (!activeRoom) return
    await navigator.clipboard?.writeText(activeRoom)
    toast.success('Oda kodu kopyalandı')
  }

  // ─── Chat gönder ─────────────────────────────────────────────────────────
  const sendChat = async () => {
    const text = chatText.trim()
    if (!text || !activeRoomId || !myUserId) return
    const { error } = await supabase.from('room_chat').insert({
      room_id: activeRoomId,
      user_id: myUserId,
      player_name: players.find((p) => p.user_id === myUserId)?.username ?? 'Oyuncu',
      text,
      message_type: 'hint',
    })
    if (error) {
      toast.error('Mesaj gönderilemedi: ' + error.message)
      return
    }
    setChatText('')
  }

  // ─── Arkadaşı odaya davet et ─────────────────────────────────────────────
  const inviteFriend = async (friend: FriendForInvite) => {
    if (!activeRoom || !activeRoomId || !myUserId) return
    try {
      // room_invites tablosuna kayıt ekle
      const { error } = await supabase.from('room_invites').insert({
        room_id: activeRoomId,
        room_code: activeRoom,
        inviter_id: myUserId,
        invitee_id: friend.user_id,
        status: 'pending',
      })
      if (error) {
        // Zaten davet edilmiş olabilir
        if (error.code === '23505') {
          toast.info(`${friend.username} zaten davet edilmiş`)
        } else {
          toast.error('Davet gönderilemedi: ' + error.message)
        }
        return
      }
      toast.success(`${friend.username} odaya davet edildi`)
    } catch {
      toast.error('Davet gönderilemedi')
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // ODA İÇİ GÖRÜNÜM
  // ═══════════════════════════════════════════════════════════════════════
  if (activeRoom) {
    const allReady = players.length >= 3 && players.every((p) => p.is_ready)
    return (
      <div className="min-h-svh w-full bg-slate-950 px-4 py-6 text-slate-100">
        <div className="mx-auto w-full max-w-md">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <button type="button" onClick={leaveRoom} className="flex min-h-11 items-center gap-2 text-slate-400 hover:text-white">
              <ArrowLeft className="h-5 w-5" /> Çık
            </button>
            <div className="flex gap-2">
              <button type="button" onClick={() => { setShowInvite(true); void loadFriends() }} aria-label="Arkadaş davet et" className="rounded-lg bg-slate-800 p-2.5 text-cyan-300 hover:bg-slate-700">
                <Users className="h-4 w-4" />
              </button>
              <button type="button" onClick={copyInvite} aria-label="Davet linki paylaş" className="rounded-lg bg-slate-800 p-2.5 text-indigo-300 hover:bg-slate-700">
                <Share2 className="h-4 w-4" />
              </button>
              {isHost && (
                <button type="button" onClick={() => setShowSettings(true)} aria-label="Oda ayarları" className="rounded-lg bg-slate-800 p-2.5 text-slate-300 hover:bg-slate-700">
                  <SettingsIcon className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Oda kodu */}
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Oda kodu</p>
            <div className="mt-2 flex items-center justify-between rounded-xl bg-slate-900 px-4 py-3 ring-1 ring-slate-700">
              <span className="font-mono text-2xl tracking-[0.3em] text-cyan-300">{activeRoom}</span>
              <button type="button" onClick={copyCode} aria-label="Oda kodunu kopyala" className="rounded-lg p-2 text-slate-300 hover:bg-slate-800">
                <Copy className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-500">Bu kodu arkadaşlarınla paylaş — kodu girip odaya katılabilirler.</p>
          </div>

          {/* Oyun ayarları özeti */}
          <div className="mb-4 flex flex-wrap gap-2 text-xs">
            <span className="rounded-lg bg-slate-800 px-2 py-1 text-slate-400">{settings.turnTimeLimit}sn/tur</span>
            <span className="rounded-lg bg-slate-800 px-2 py-1 text-slate-400">{settings.roundsBeforeVoting} tur</span>
            <span className="rounded-lg bg-slate-800 px-2 py-1 text-slate-400">
              {settings.wordDifficulty === 'MIXED' ? 'Karışık' : settings.wordDifficulty === 'EASY' ? 'Kolay' : settings.wordDifficulty === 'MEDIUM' ? 'Orta' : 'Zor'}
            </span>
            {settings.selectedCategories.length > 0 && (
              <span className="rounded-lg bg-slate-800 px-2 py-1 text-slate-400">{settings.selectedCategories.length} kategori</span>
            )}
          </div>

          {/* Oyuncular */}
          <div className="mb-2 flex items-center gap-2 text-sm text-slate-400">
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
                  p.is_bot && 'bg-indigo-500/5 ring-indigo-500/20',
                )}
              >
                <Avatar avatarId={p.avatar} size="sm" hideFrame />
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium text-slate-100">
                    {p.username}
                    {p.user_id === myUserId && ' (sen)'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {p.is_bot ? `Bot · ${p.bot_difficulty}` : p.is_host ? 'Host' : 'Oyuncu'}
                  </p>
                </div>
                {p.is_bot && <Bot className="h-4 w-4 text-indigo-400" />}
                {p.is_host && <Crown className="h-4 w-4 text-amber-400" />}
                {p.is_ready && <Check className="h-4 w-4 text-emerald-400" />}
                {isHost && p.is_bot && (
                  <button
                    type="button"
                    onClick={() => removeBot(p.username)}
                    aria-label={`${p.username} kaldır`}
                    className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-500/10 hover:text-rose-300"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Bot ekleme (sadece host) */}
          {isHost && players.length < 8 && (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => addBot('EASY')}
                className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700"
              >
                <Bot className="h-3.5 w-3.5 text-emerald-400" />
                Kolay Bot
              </button>
              <button
                type="button"
                onClick={() => addBot('SMART')}
                className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700"
              >
                <Bot className="h-3.5 w-3.5 text-amber-400" />
                Akıllı Bot
              </button>
              <button
                type="button"
                onClick={() => addBot('EXPERT')}
                className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700"
              >
                <Bot className="h-3.5 w-3.5 text-rose-400" />
                Uzman Bot
              </button>
            </div>
          )}

          {/* Lobi chat */}
          <div className="mt-4">
            <div className="mb-2 flex items-center gap-2 text-xs text-slate-400">
              <MessageSquare className="h-3.5 w-3.5" />
              Lobi sohbeti
            </div>
            <div ref={chatScrollRef} className="max-h-32 space-y-1.5 overflow-y-auto rounded-xl bg-slate-900/50 p-3 ring-1 ring-slate-800">
              {chat.length === 0 ? (
                <p className="py-3 text-center text-xs text-slate-600">Henüz mesaj yok...</p>
              ) : (
                chat.map((msg) => (
                  <div key={msg.id} className={cn('text-xs', msg.message_type === 'system' ? 'text-center text-slate-500' : '')}>
                    {msg.message_type !== 'system' && <span className="font-semibold text-indigo-300">{msg.player_name}: </span>}
                    {msg.text}
                  </div>
                ))
              )}
            </div>
            <div className="mt-2 flex gap-2">
              <input
                value={chatText}
                onChange={(e) => setChatText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendChat()}
                placeholder="Mesaj..."
                maxLength={100}
                aria-label="Lobi mesajı"
                className="min-w-0 flex-1 rounded-xl bg-slate-800 px-3 py-2 text-sm ring-1 ring-slate-700 focus:outline-none focus:ring-cyan-400"
              />
              <Button size="sm" onClick={sendChat} disabled={!chatText.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Aksiyonlar */}
          <div className="mt-6 flex gap-3">
            <Button variant="secondary" onClick={leaveRoom}>
              <LogOut className="h-4 w-4" />
              Ayrıl
            </Button>
            {!isHost && (
              <Button fullWidth onClick={toggleReady}>
                {players.find((p) => p.user_id === myUserId)?.is_ready ? 'Hazır değil' : 'Hazırım'}
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

        {/* ─── Ayarlar Modal ─────────────────────────────────────────────── */}
        {showSettings && (
          <RoomSettingsModal
            settings={settings}
            onChange={setSettings}
            onSave={saveSettings}
            onClose={() => setShowSettings(false)}
          />
        )}

        {/* ─── Arkadaş Davet Modal ──────────────────────────────────────── */}
        {showInvite && (
          <InviteFriendsModal
            friends={friends}
            onInvite={inviteFriend}
            onCopyCode={copyCode}
            onClose={() => setShowInvite(false)}
          />
        )}
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════════════
  // ODA OLUŞTURMA / KATILMA GÖRÜNÜMÜ
  // ═══════════════════════════════════════════════════════════════════════
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
          {/* Oda oluştur */}
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

          {/* Odaya katıl */}
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
                onKeyDown={(e) => e.key === 'Enter' && joinRoom()}
                maxLength={6}
                placeholder="ABC123"
                aria-label="Oda kodu"
                className="min-w-0 flex-1 rounded-xl bg-slate-950 px-4 font-mono tracking-widest text-slate-100 ring-1 ring-slate-700 focus:outline-none focus:ring-cyan-400"
              />
              <Button disabled={roomCode.length < 4 || loading} onClick={() => joinRoom()}>
                Katıl
              </Button>
            </div>
          </section>

          {/* Aktif odalar */}
          <section className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
            <div className="flex items-center gap-3">
              <Search className="h-5 w-5 text-emerald-300" />
              <div className="flex-1">
                <h2 className="font-semibold">Aktif odalar</h2>
                <p className="text-xs text-slate-400">Açık odalara göz at.</p>
              </div>
              <button
                type="button"
                onClick={() => { setShowActiveRooms(true); void loadActiveRooms() }}
                className="rounded-lg bg-slate-800 px-3 py-2 text-xs text-slate-300 hover:bg-slate-700"
              >
                Görüntüle
              </button>
            </div>
          </section>

          {/* Nasıl oynanır */}
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

      {/* ─── Aktif Odalar Modal ──────────────────────────────────────────── */}
      {showActiveRooms && (
        <ActiveRoomsModal
          rooms={activeRooms}
          loading={loading}
          onRefresh={loadActiveRooms}
          onJoin={(code) => { setShowActiveRooms(false); void joinRoom(code) }}
          onClose={() => setShowActiveRooms(false)}
        />
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// ROOM SETTINGS MODAL
// ═══════════════════════════════════════════════════════════════════════════

function RoomSettingsModal({
  settings,
  onChange,
  onSave,
  onClose,
}: {
  settings: RoomSettings
  onChange: (s: RoomSettings) => void
  onSave: () => void
  onClose: () => void
}) {
  const difficulties: { value: RoomSettings['wordDifficulty']; label: string }[] = [
    { value: 'MIXED', label: 'Karışık' },
    { value: 'EASY', label: 'Kolay' },
    { value: 'MEDIUM', label: 'Orta' },
    { value: 'HARD', label: 'Zor' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">Oda Ayarları</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-800">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Tur süresi */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-sm text-slate-300">Tur Süresi</label>
              <span className="text-sm font-semibold text-indigo-300">{settings.turnTimeLimit}sn</span>
            </div>
            <input
              type="range" min={10} max={120} step={5}
              value={settings.turnTimeLimit}
              onChange={(e) => onChange({ ...settings, turnTimeLimit: Number(e.target.value) })}
              className="w-full accent-indigo-500"
            />
          </div>

          {/* Tur sayısı */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-sm text-slate-300">Oylama Öncesi Tur</label>
              <span className="text-sm font-semibold text-indigo-300">{settings.roundsBeforeVoting}</span>
            </div>
            <input
              type="range" min={1} max={5} step={1}
              value={settings.roundsBeforeVoting}
              onChange={(e) => onChange({ ...settings, roundsBeforeVoting: Number(e.target.value) })}
              className="w-full accent-indigo-500"
            />
          </div>

          {/* Kelime zorluğu */}
          <div>
            <label className="mb-1.5 block text-sm text-slate-300">Kelime Zorluğu</label>
            <div className="grid grid-cols-4 gap-2">
              {difficulties.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => onChange({ ...settings, wordDifficulty: d.value })}
                  className={cn(
                    'rounded-lg px-2 py-2 text-xs font-medium transition-colors min-h-11',
                    settings.wordDifficulty === d.value ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700',
                  )}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Kategoriler */}
          <div>
            <label className="mb-1.5 block text-sm text-slate-300">Kategoriler (boş = tümü)</label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((cat) => {
                const selected = settings.selectedCategories.includes(cat)
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      const next = selected
                        ? settings.selectedCategories.filter((c) => c !== cat)
                        : [...settings.selectedCategories, cat]
                      onChange({ ...settings, selectedCategories: next })
                    }}
                    className={cn(
                      'rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors',
                      selected ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700',
                    )}
                  >
                    {cat}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Herkese açık */}
          <button
            type="button"
            onClick={() => onChange({ ...settings, isPublic: !settings.isPublic })}
            className={cn(
              'flex w-full items-center gap-3 rounded-xl px-4 py-3 ring-1 transition-colors text-left min-h-11',
              settings.isPublic ? 'bg-indigo-500/10 ring-indigo-500/40' : 'bg-slate-800/40 ring-slate-700',
            )}
          >
            <Search className={cn('h-5 w-5', settings.isPublic ? 'text-indigo-300' : 'text-slate-500')} />
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-100">Herkese açık oda</p>
              <p className="text-xs text-slate-400">Aktif odalar listesinde görünsün</p>
            </div>
            <span className={cn('relative h-6 w-11 rounded-full transition-colors', settings.isPublic ? 'bg-indigo-500' : 'bg-slate-700')}>
              <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all', settings.isPublic ? 'left-[1.375rem]' : 'left-0.5')} />
            </span>
          </button>
        </div>

        <Button fullWidth className="mt-5" onClick={onSave}>
          <Check className="h-4 w-4" /> Kaydet
        </Button>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// INVITE FRIENDS MODAL
// ═══════════════════════════════════════════════════════════════════════════

function InviteFriendsModal({
  friends,
  onInvite,
  onCopyCode,
  onClose,
}: {
  friends: FriendForInvite[]
  onInvite: (f: FriendForInvite) => void
  onCopyCode: () => void
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">Arkadaş Davet Et</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-800">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Kod kopyala */}
        <button
          type="button"
          onClick={onCopyCode}
          className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-800 px-4 py-3 text-sm font-medium text-cyan-300 hover:bg-slate-700"
        >
          <Copy className="h-4 w-4" />
          Oda kodunu kopyala
        </button>

        {/* Arkadaş listesi */}
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Arkadaşların</p>
        {friends.length === 0 ? (
          <div className="rounded-xl bg-slate-800/50 px-4 py-8 text-center text-sm text-slate-500">
            Henüz arkadaşın yok. Sosyal bölümünden arkadaş ekleyebilirsin.
          </div>
        ) : (
          <div className="max-h-64 space-y-2 overflow-y-auto">
            {friends.map((f) => (
              <div key={f.user_id} className="flex items-center gap-3 rounded-xl bg-slate-800/60 px-3 py-2.5">
                <Avatar avatarId={f.avatar} size="sm" hideFrame />
                <span className="flex-1 truncate text-sm text-slate-200">{f.username}</span>
                <button
                  type="button"
                  onClick={() => onInvite(f)}
                  className="rounded-lg bg-indigo-500/20 px-3 py-1.5 text-xs font-medium text-indigo-300 hover:bg-indigo-500/30"
                >
                  <Share2 className="mr-1 inline h-3 w-3" />
                  Davet
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// ACTIVE ROOMS MODAL
// ═══════════════════════════════════════════════════════════════════════════

function ActiveRoomsModal({
  rooms,
  onRefresh,
  onJoin,
  onClose,
}: {
  rooms: ActiveRoom[]
  loading: boolean
  onRefresh: () => void
  onJoin: (code: string) => void
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">Aktif Odalar</h2>
          <div className="flex gap-2">
            <button type="button" onClick={onRefresh} className="rounded-lg p-2 text-slate-400 hover:bg-slate-800" aria-label="Yenile">
              <RefreshCw className="h-4 w-4" />
            </button>
            <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-800">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {rooms.length === 0 ? (
          <div className="rounded-xl bg-slate-800/50 px-4 py-8 text-center text-sm text-slate-500">
            Şu anda aktif oda yok. Yeni bir oda oluştur!
          </div>
        ) : (
          <div className="max-h-96 space-y-2 overflow-y-auto">
            {rooms.map((r) => (
              <div key={r.id} className="flex items-center gap-3 rounded-xl bg-slate-800/60 px-3 py-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/15">
                  <Users className="h-5 w-5 text-indigo-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-sm font-semibold text-cyan-300">{r.code}</p>
                  <p className="text-xs text-slate-500">{r.host_name} · {r.player_count} oyuncu</p>
                </div>
                <button
                  type="button"
                  onClick={() => onJoin(r.code)}
                  className="rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-400"
                >
                  Katıl
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
