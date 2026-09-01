import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  ArrowLeft, Send, Clock, Eye, EyeOff, Crown, Check,
  Loader2, AlertTriangle, Trophy, Skull, Sparkles,
  MessageSquare, Settings as SettingsIcon,
} from 'lucide-react'
import { Button } from './components/common/Button'
import { Avatar } from './components/common/Avatar'
import { useToast } from './components/common/toast-context'
import { supabase } from './lib/supabase'
import { profileApi, statsApi } from './lib/profileApi'
import { applyGameResult } from './lib/scoreSystem'
import { questsApi } from './lib/questsApi'
import { achievementsApi } from './lib/achievementsApi'
import { pickWord, pickImpostor } from './utils/wordPool'
import { countVotes, isGuessCorrect, isValidHint } from './utils/gameUtils'
import { cn } from './utils/cn'

// ─── Types ─────────────────────────────────────────────────────────────────

interface RoomPlayer {
  user_id: string
  username: string
  avatar: string
  is_ready: boolean
  seat: number
  passed: boolean
  is_bot: boolean
  bot_name: string | null
  bot_difficulty: string | null
}

interface ChatMsg {
  id: string
  user_id: string
  player_name: string
  text: string
  message_type: 'hint' | 'system' | 'chat'
  created_at: string
}

interface RoomData {
  id: string
  code: string
  host_id: string
  state: 'LOBBY' | 'REVEAL' | 'PLAYING' | 'VOTING' | 'FINISHED'
  settings: {
    turnTimeLimit?: number
    roundsBeforeVoting?: number
    wordDifficulty?: string
  }
  current_word: string | null
  current_category: string | null
  impostor_id: string | null
  turn_index: number
  round: number
  winner: 'PLAYERS' | 'IMPOSTOR' | null
  voted_impostor_id: string | null
  impostor_guess: string | null
}

// ─── Component ─────────────────────────────────────────────────────────────

export function OnlineGame({
  roomId,
  roomCode,
  onExit,
}: {
  roomId: string
  roomCode: string
  onExit: () => void
}) {
  const toast = useToast()
  const [room, setRoom] = useState<RoomData | null>(null)
  const [players, setPlayers] = useState<RoomPlayer[]>([])
  const [chat, setChat] = useState<ChatMsg[]>([])
  const [votes, setVotes] = useState<Record<string, string>>({})
  const [myUserId, setMyUserId] = useState<string | null>(null)
  const [hintText, setHintText] = useState('')
  const [guessText, setGuessText] = useState('')
  const [timeLeft, setTimeLeft] = useState(0)
  const [loading, setLoading] = useState(true)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ─── Auth user ──────────────────────────────────────────────────────────
  useEffect(() => {
    void supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setMyUserId(user.id)
    })
  }, [])

  // ─── Load initial data ──────────────────────────────────────────────────
  useEffect(() => {
    if (!roomId) return
    let cancelled = false

    const loadAll = async () => {
      const [{ data: roomData }, { data: rpData }, { data: chatData }, { data: voteData }] = await Promise.all([
        supabase.from('rooms').select('*').eq('id', roomId).single(),
        supabase.from('room_players').select('*').eq('room_id', roomId),
        supabase.from('room_chat').select('*').eq('room_id', roomId).order('created_at', { ascending: true }),
        supabase.from('room_votes').select('voter_id, target_id').eq('room_id', roomId),
      ])

      if (cancelled) return

      if (roomData) setRoom(roomData as RoomData)
      if (rpData) {
        const userIds = rpData.filter((rp) => rp.user_id).map((rp) => rp.user_id)
        const { data: profiles } = await supabase.from('profiles').select('id, username, avatar').in('id', userIds)
        const { data: inv } = await supabase.from('inventory').select('user_id, equipped_avatar').in('user_id', userIds)
        const equippedMap = new Map<string, string>()
        for (const i of inv ?? []) equippedMap.set(i.user_id, i.equipped_avatar)

        const sorted = [...rpData].sort((a, b) => (a.seat ?? 0) - (b.seat ?? 0))
        setPlayers(sorted.map((rp) => {
          const p = profiles?.find((pr) => pr.id === rp.user_id)
          return {
            user_id: rp.user_id ?? `bot-${rp.bot_name}`,
            username: rp.is_bot ? (rp.bot_name ?? 'Bot') : (p?.username ?? 'Oyuncu'),
            avatar: rp.is_bot ? (rp.bot_avatar ?? 'avatar_default') : (equippedMap.get(rp.user_id) ?? p?.avatar ?? 'avatar_default'),
            is_ready: rp.is_ready,
            seat: rp.seat ?? 0,
            passed: rp.passed ?? false,
            is_bot: rp.is_bot ?? false,
            bot_name: rp.bot_name ?? null,
            bot_difficulty: rp.bot_difficulty ?? null,
          }
        }))
      }
      if (chatData) setChat(chatData as ChatMsg[])
      if (voteData) {
        const vMap: Record<string, string> = {}
        for (const v of voteData) vMap[v.voter_id] = v.target_id
        setVotes(vMap)
      }
      setLoading(false)
    }

    void loadAll()
    return () => { cancelled = true }
  }, [roomId])

  // ─── Realtime subscriptions ─────────────────────────────────────────────
  useEffect(() => {
    if (!roomId) return

    const channel = supabase
      .channel(`game:${roomId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            setRoom(payload.new as RoomData)
            // Oda kapatıldıysa çık
            if (!(payload.new as RoomData)) {
              toast.info('Oda kapatıldı')
              onExit()
            }
          }
        },
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_players', filter: `room_id=eq.${roomId}` },
        async () => {
          const { data: rpData } = await supabase.from('room_players').select('*').eq('room_id', roomId)
          if (!rpData) return
          const userIds = rpData.filter((rp) => rp.user_id).map((rp) => rp.user_id)
          const { data: profiles } = await supabase.from('profiles').select('id, username, avatar').in('id', userIds)
          const { data: inv } = await supabase.from('inventory').select('user_id, equipped_avatar').in('user_id', userIds)
          const equippedMap = new Map<string, string>()
          for (const i of inv ?? []) equippedMap.set(i.user_id, i.equipped_avatar)
          const sorted = [...rpData].sort((a, b) => (a.seat ?? 0) - (b.seat ?? 0))
          setPlayers(sorted.map((rp) => {
            const p = profiles?.find((pr) => pr.id === rp.user_id)
            return {
              user_id: rp.user_id ?? `bot-${rp.bot_name}`,
              username: rp.is_bot ? (rp.bot_name ?? 'Bot') : (p?.username ?? 'Oyuncu'),
              avatar: rp.is_bot ? (rp.bot_avatar ?? 'avatar_default') : (equippedMap.get(rp.user_id) ?? p?.avatar ?? 'avatar_default'),
              is_ready: rp.is_ready,
              seat: rp.seat ?? 0,
              passed: rp.passed ?? false,
              is_bot: rp.is_bot ?? false,
              bot_name: rp.bot_name ?? null,
              bot_difficulty: rp.bot_difficulty ?? null,
            }
          }))
        },
      )
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'room_chat', filter: `room_id=eq.${roomId}` },
        (payload) => {
          const newMessage = payload.new as ChatMsg
          setChat((prev) => prev.some((message) => message.id === newMessage.id) ? prev : [...prev, newMessage])
        },
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_votes', filter: `room_id=eq.${roomId}` },
        async () => {
          const { data: voteData } = await supabase.from('room_votes').select('voter_id, target_id').eq('room_id', roomId)
          const vMap: Record<string, string> = {}
          for (const v of voteData ?? []) vMap[v.voter_id] = v.target_id
          setVotes(vMap)
        },
      )
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [roomId, toast, onExit])

  // ─── Timer ──────────────────────────────────────────────────────────────
  const turnTimeLimit = room?.settings.turnTimeLimit ?? 30
  const timerKey = `${room?.turn_index}-${room?.round}`
  useEffect(() => {
    if (room?.state !== 'PLAYING') return
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          if (timerRef.current) clearInterval(timerRef.current)
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerKey, room?.state])

  // Timer'ı sıra değişince sıfırla — derived value, effect'te set et
  const desiredTime = room?.state === 'PLAYING' ? turnTimeLimit : 0
  useEffect(() => {
    let cancelled = false
    const id = setTimeout(() => { if (!cancelled) setTimeLeft(desiredTime) }, 0)
    return () => { cancelled = true; clearTimeout(id) }
  }, [desiredTime, timerKey])

  // ─── Derived values ─────────────────────────────────────────────────────
  const isHost = room?.host_id === myUserId
  const isImpostor = room?.impostor_id === myUserId
  const currentTurnPlayer = players[room?.turn_index ?? 0]
  const isMyTurn = currentTurnPlayer?.user_id === myUserId
  const myVote = myUserId ? votes[myUserId] : undefined
  const allVoted = players.length > 0 && players.every((p) => votes[p.user_id])
  const hintsThisRound = chat.filter((c) => c.message_type === 'hint')

  // ─── Host: Start game ───────────────────────────────────────────────────
  const startGame = useCallback(async () => {
    if (!room || players.length < 3) return
    const playerIds = players.map((p) => p.user_id)
    const word = pickWord({
      categories: [],
      difficulty: 'MIXED',
      recentWords: [],
      customWords: [],
    })
    const impostorId = pickImpostor(playerIds)

    // Seat numaralarını ata
    for (let i = 0; i < players.length; i++) {
      await supabase.from('room_players').update({ seat: i, passed: false }).eq('room_id', roomId).eq('user_id', players[i].user_id)
    }

    await supabase.from('rooms').update({
      state: 'PLAYING',
      current_word: word.word,
      current_category: word.category,
      impostor_id: impostorId,
      turn_index: 0,
      round: 1,
      winner: null,
      voted_impostor_id: null,
      impostor_guess: null,
      settings: room.settings,
    }).eq('id', roomId)

    // Eski chat ve oyları temizle
    await supabase.from('room_chat').delete().eq('room_id', roomId)
    await supabase.from('room_votes').delete().eq('room_id', roomId)

    // Sistem mesajı
    await supabase.from('room_chat').insert({
      room_id: roomId,
      user_id: myUserId,
      player_name: 'Sistem',
      text: 'Oyun başladı! İlk ipucu sırası: ' + players[0]?.username,
      message_type: 'system',
    })
  }, [room, players, roomId, myUserId])

  // ─── Send hint ──────────────────────────────────────────────────────────
  const sendHint = async () => {
    const text = hintText.trim()
    if (!text || !room || !isMyTurn) return
    if (!isValidHint(text, room.current_word ?? '', hintsThisRound.map((h) => h.text))) {
      toast.warning('Geçersiz ipucu — kelimeyi içeremez veya çok kısa')
      return
    }

    const { error: hintError } = await supabase.from('room_chat').insert({
      room_id: roomId,
      user_id: myUserId,
      player_name: players.find((p) => p.user_id === myUserId)?.username ?? 'Oyuncu',
      text,
      message_type: 'hint',
    })

    if (hintError) {
      toast.error('İpucu gönderilemedi. Tekrar dene.')
      return
    }
    setHintText('')
    // Host turn'ü ilerletir
    if (isHost) {
      await advanceTurn()
    }
  }

  // ─── Pass ───────────────────────────────────────────────────────────────
  const passTurn = async () => {
    if (!isMyTurn) return
    const { error: passError } = await supabase.from('room_players').update({ passed: true }).eq('room_id', roomId).eq('user_id', myUserId)
    if (passError) {
      toast.error('Pas işlemi başarısız oldu')
      return
    }
    await supabase.from('room_chat').insert({
      room_id: roomId,
      user_id: myUserId,
      player_name: players.find((p) => p.user_id === myUserId)?.username ?? 'Oyuncu',
      text: 'Pas geçti',
      message_type: 'system',
    })
    if (isHost) {
      await advanceTurn()
    }
  }

  // ─── Host: Advance turn ─────────────────────────────────────────────────
  const advanceTurn = async () => {
    if (!room || players.length === 0) return
    const nextIndex = (room.turn_index + 1) % players.length
    const nextRound = nextIndex === 0 ? room.round + 1 : room.round
    const roundsBeforeVoting = room.settings.roundsBeforeVoting ?? 2

    // Pas flag'lerini sıra başına sıfırla
    if (nextIndex === 0) {
      for (const p of players) {
        await supabase.from('room_players').update({ passed: false }).eq('room_id', roomId).eq('user_id', p.user_id)
      }
    }

    if (nextRound > roundsBeforeVoting) {
      // Oylamaya geç
      await supabase.from('rooms').update({
        state: 'VOTING',
        turn_index: 0,
      }).eq('id', roomId)
      await supabase.from('room_chat').insert({
        room_id: roomId,
        user_id: myUserId,
        player_name: 'Sistem',
        text: 'Oylama başladı! Sahtekarı seçin.',
        message_type: 'system',
      })
    } else {
      await supabase.from('rooms').update({
        turn_index: nextIndex,
        round: nextRound,
      }).eq('id', roomId)
    }
  }

  // ─── Vote ───────────────────────────────────────────────────────────────
  const vote = async (targetId: string) => {
    if (!myUserId || myVote) return
    const { error } = await supabase.from('room_votes').upsert({
      room_id: roomId,
      voter_id: myUserId,
      target_id: targetId,
    })
    if (error) toast.error('Oyunuz kaydedilemedi. Tekrar dene.')
  }

  // ─── Host: Finish voting ────────────────────────────────────────────────
  const finishVoting = async () => {
    if (!room || !isHost) return
    const { topVotedId } = countVotes(votes)
    const caught = topVotedId === room.impostor_id
    const winner = caught ? 'PLAYERS' : 'IMPOSTOR'

    await supabase.from('rooms').update({
      state: 'FINISHED',
      voted_impostor_id: topVotedId,
      winner,
    }).eq('id', roomId)

    await supabase.from('room_chat').insert({
      room_id: roomId,
      user_id: myUserId,
      player_name: 'Sistem',
      text: caught ? 'Sahtekar yakalandı!' : 'Sahtekar kaçtı!',
      message_type: 'system',
    })
  }

  // ─── Impostor: Guess word ───────────────────────────────────────────────
  const submitGuess = async () => {
    if (!room || !isImpostor || !room.voted_impostor_id) return
    const guess = guessText.trim()
    if (!guess) return

    const correct = isGuessCorrect(guess, room.current_word ?? '')
    const winner = correct ? 'IMPOSTOR' : 'PLAYERS'

    await supabase.from('rooms').update({
      impostor_guess: guess,
      winner,
    }).eq('id', roomId)

    setGuessText('')
  }

  // ─── Sync stats to Supabase ─────────────────────────────────────────────
  useEffect(() => {
    if (room?.state !== 'FINISHED' || !room.winner || !myUserId) return
    // Her oyuncu kendi istatistiğini sync eder (bir kez)
    const caught = room.voted_impostor_id === room.impostor_id
    const isMeImpostor = room.impostor_id === myUserId

    void (async () => {
      try {
        // Local stats güncelle
        applyGameResult({
          player: {
            id: myUserId,
            name: players.find((p) => p.user_id === myUserId)?.username ?? 'Oyuncu',
            avatar: 'avatar_default',
            score: 0,
            isReady: true,
            isBot: false,
          },
          winner: room.winner ?? 'PLAYERS',
          impostorId: room.impostor_id,
          isLocal: false,
        })

        // Quests
        questsApi.addProgress('gamesPlayed')
        if (!isMeImpostor && caught) questsApi.addProgress('wins')
        if (isMeImpostor && room.winner === 'IMPOSTOR') questsApi.addProgress('winsAsImpostor')
        if (!isMeImpostor && room.winner === 'PLAYERS') questsApi.addProgress('winsAsPlayer')
        questsApi.addWeeklyProgress('gamesPlayed')

        // Achievements
        const stats = statsApi.get()
        achievementsApi.check(stats)

        // Supabase'e sync
        await profileApi.syncToSupabase(profileApi.get())
        await statsApi.syncToSupabase(statsApi.get())
      } catch (err) {
        console.warn('[online] stats sync failed:', err)
      }
    })()
  }, [room?.state, room?.winner, myUserId, players, room])

  // ─── Play again (host) ──────────────────────────────────────────────────
  const playAgain = async () => {
    if (!room || !isHost) return
    await supabase.from('rooms').update({
      state: 'LOBBY',
      current_word: null,
      current_category: null,
      impostor_id: null,
      turn_index: 0,
      round: 1,
      winner: null,
      voted_impostor_id: null,
      impostor_guess: null,
    }).eq('id', roomId)
    await supabase.from('room_chat').delete().eq('room_id', roomId)
    await supabase.from('room_votes').delete().eq('room_id', roomId)
    for (const p of players) {
      await supabase.from('room_players').update({ passed: false, is_ready: true }).eq('room_id', roomId).eq('user_id', p.user_id)
    }
  }

  // ─── Leave room ─────────────────────────────────────────────────────────
  const leaveRoom = async () => {
    if (!myUserId) return
    await supabase.from('room_players').delete().eq('room_id', roomId).eq('user_id', myUserId)
    if (isHost) {
      await supabase.from('rooms').delete().eq('id', roomId)
    }
    onExit()
  }

  // ─── Loading ────────────────────────────────────────────────────────────
  if (loading || !room || !myUserId) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════════════
  // LOBBY STATE — Host starts game
  // ═══════════════════════════════════════════════════════════════════════
  if (room.state === 'LOBBY') {
    const allReady = players.length >= 3 && players.every((p) => p.is_ready)
    return (
      <div className="min-h-svh w-full bg-slate-950 px-4 py-6 text-slate-100">
        <div className="mx-auto w-full max-w-md">
          <button type="button" onClick={leaveRoom} className="mb-6 flex min-h-11 items-center gap-2 text-slate-400 hover:text-white">
            <ArrowLeft className="h-5 w-5" /> Ana Menü
          </button>
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Oda kodu</p>
            <div className="mt-2 flex items-center justify-between rounded-xl bg-slate-900 px-4 py-3 ring-1 ring-slate-700">
              <span className="font-mono text-2xl tracking-[0.3em] text-cyan-300">{roomCode}</span>
            </div>
          </div>
          <div className="mb-4 flex items-center gap-2 text-sm text-slate-400">
            <span>{players.length} oyuncu</span>
            <span className="text-slate-600">·</span>
            <span className={allReady ? 'text-emerald-400' : 'text-amber-400'}>
              {allReady ? 'Herkes hazır' : `${players.filter((p) => p.is_ready).length}/${players.length} hazır`}
            </span>
          </div>
          <div className="space-y-2 mb-6">
            {players.map((p) => (
              <div key={p.user_id} className={cn('flex items-center gap-3 rounded-xl px-4 py-3 ring-1', p.is_ready ? 'bg-emerald-500/10 ring-emerald-500/30' : 'bg-slate-900/80 ring-slate-800')}>
                <Avatar avatarId={p.avatar} size="sm" hideFrame />
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium">{p.username}{p.user_id === myUserId && ' (sen)'}</p>
                </div>
                {p.user_id === room.host_id && <Crown className="h-4 w-4 text-amber-400" />}
                {p.is_ready && <Check className="h-4 w-4 text-emerald-400" />}
              </div>
            ))}
          </div>
          {isHost ? (
            <Button variant="success" fullWidth disabled={!allReady} onClick={startGame}>
              <Sparkles className="h-4 w-4" /> Oyunu Başlat
            </Button>
          ) : (
            <p className="text-center text-sm text-slate-500">Host oyunu başlatmayı bekliyor...</p>
          )}
          {!allReady && <p className="mt-3 text-center text-xs text-slate-500">Başlatmak için en az 3 oyuncu ve herkesin hazır olması gerekir.</p>}
        </div>
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════════════
  // REVEAL STATE — Her oyuncu rolünü görür
  // ═══════════════════════════════════════════════════════════════════════
  if (room.state === 'REVEAL') {
    return <RevealPhase
      room={room}
      players={players}
      myUserId={myUserId}
      isImpostor={isImpostor}
      isHost={isHost}
      roomId={roomId}
      onLeave={leaveRoom}
    />
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PLAYING STATE — Alt bar + sekmeli yapı
  // ═══════════════════════════════════════════════════════════════════════
  if (room.state === 'PLAYING') {
    return (
      <PlayingPhase
        room={room}
        players={players}
        chat={chat}
        votes={votes}
        myUserId={myUserId}
        isImpostor={isImpostor}
        isHost={isHost}
        currentTurnPlayer={currentTurnPlayer}
        isMyTurn={isMyTurn}
        hintText={hintText}
        setHintText={setHintText}
        sendHint={sendHint}
        passTurn={passTurn}
        timeLeft={timeLeft}
        roomId={roomId}
        onLeave={leaveRoom}
      />
    )
  }

  // ═══════════════════════════════════════════════════════════════════════
  // VOTING STATE
  // ═══════════════════════════════════════════════════════════════════════
  if (room.state === 'VOTING') {
    return (
      <div className="min-h-svh w-full bg-slate-950 px-4 py-6 text-slate-100">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-rose-300">Oylama</h1>
            <p className="mt-1 text-sm text-slate-400">Sahtekarı seç!</p>
          </div>

          {/* Players list for voting */}
          <div className="space-y-2">
            {players.map((p) => (
              <button
                key={p.user_id}
                type="button"
                onClick={() => vote(p.user_id)}
                disabled={!!myVote || p.user_id === myUserId}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl px-4 py-3 ring-1 transition-all min-h-11',
                  myVote === p.user_id ? 'bg-rose-500/20 ring-rose-500/50' : 'bg-slate-900 ring-slate-800 hover:bg-slate-800',
                  (myVote || p.user_id === myUserId) && 'opacity-60',
                )}
              >
                <Avatar avatarId={p.avatar} size="sm" hideFrame />
                <span className="flex-1 text-left text-sm font-medium">{p.username}{p.user_id === myUserId && ' (sen)'}</span>
                {myVote === p.user_id && <Check className="h-4 w-4 text-rose-400" />}
                {p.user_id === myUserId && <span className="text-xs text-slate-500">oy veremezsin</span>}
              </button>
            ))}
          </div>

          {/* Vote status */}
          <div className="mt-4 text-center text-sm text-slate-400">
            {myVote ? `Oy verdin: ${players.find((p) => p.user_id === myVote)?.username}` : 'Oy vermen bekleniyor...'}
          </div>

          {/* Host: finish voting */}
          {isHost && (
            <Button variant="danger" fullWidth className="mt-4" disabled={!allVoted} onClick={finishVoting}>
              <Check className="h-4 w-4" /> Oylamayı Bitir ({Object.keys(votes).length}/{players.length})
            </Button>
          )}
          {!isHost && allVoted && <p className="mt-4 text-center text-xs text-slate-500">Host oylamayı bitiriyor...</p>}
        </div>
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════════════
  // FINISHED STATE
  // ═══════════════════════════════════════════════════════════════════════
  const caught = room.voted_impostor_id === room.impostor_id
  const impostorPlayer = players.find((p) => p.user_id === room.impostor_id)
  const votedPlayer = players.find((p) => p.user_id === room.voted_impostor_id)
  const needsGuess = isImpostor && caught && !room.impostor_guess

  return (
    <div className="min-h-svh w-full bg-slate-950 px-4 py-6 text-slate-100">
      <div className="mx-auto w-full max-w-md">
        {/* Winner banner */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className={cn(
            'mb-6 rounded-2xl p-6 text-center',
            room.winner === 'IMPOSTOR' ? 'bg-rose-500/15 ring-1 ring-rose-500/40' : 'bg-emerald-500/15 ring-1 ring-emerald-500/40',
          )}
        >
          {room.winner === 'IMPOSTOR' ? (
            <>
              <Skull className="mx-auto h-12 w-12 text-rose-400" />
              <h1 className="mt-3 text-2xl font-bold text-rose-300">Sahtekar Kazandı!</h1>
            </>
          ) : (
            <>
              <Trophy className="mx-auto h-12 w-12 text-emerald-400" />
              <h1 className="mt-3 text-2xl font-bold text-emerald-300">Oyuncular Kazandı!</h1>
            </>
          )}
        </motion.div>

        {/* Reveal */}
        <div className="mb-4 space-y-2">
          <div className="rounded-xl bg-slate-900 px-4 py-3 ring-1 ring-slate-800">
            <p className="text-xs text-slate-400">Kelime:</p>
            <p className="text-lg font-bold text-cyan-300">{room.current_word}</p>
            <p className="text-xs text-slate-500">{room.current_category}</p>
          </div>
          <div className="rounded-xl bg-slate-900 px-4 py-3 ring-1 ring-slate-800">
            <p className="text-xs text-slate-400">Sahtekar:</p>
            <div className="mt-1 flex items-center gap-2">
              <Avatar avatarId={impostorPlayer?.avatar ?? 'avatar_default'} size="sm" hideFrame />
              <span className="font-semibold text-rose-300">{impostorPlayer?.username}</span>
              {caught && <span className="text-xs text-emerald-400">yakalandı!</span>}
              {!caught && <span className="text-xs text-amber-400">kaçtı!</span>}
            </div>
          </div>
          {votedPlayer && caught && (
            <div className="rounded-xl bg-slate-900 px-4 py-3 ring-1 ring-slate-800">
              <p className="text-xs text-slate-400">Oylanan:</p>
              <div className="mt-1 flex items-center gap-2">
                <Avatar avatarId={votedPlayer.avatar} size="sm" hideFrame />
                <span className="font-semibold">{votedPlayer.username}</span>
              </div>
            </div>
          )}
          {room.impostor_guess && (
            <div className="rounded-xl bg-slate-900 px-4 py-3 ring-1 ring-slate-800">
              <p className="text-xs text-slate-400">Sahtekarın tahmini:</p>
              <p className="text-sm font-medium">{room.impostor_guess}</p>
              <p className={cn('text-xs', isGuessCorrect(room.impostor_guess, room.current_word ?? '') ? 'text-emerald-400' : 'text-rose-400')}>
                {isGuessCorrect(room.impostor_guess, room.current_word ?? '') ? 'Doğru!' : 'Yanlış!'}
              </p>
            </div>
          )}
        </div>

        {/* Impostor guess input */}
        {needsGuess && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-4">
            <div className="rounded-2xl bg-rose-500/10 p-4 ring-1 ring-rose-500/30">
              <p className="text-sm font-semibold text-rose-300">Son şansın! Kelimeyi tahmin et:</p>
              <div className="mt-3 flex gap-2">
                <input
                  value={guessText}
                  onChange={(e) => setGuessText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && submitGuess()}
                  placeholder="Kelime..."
                  maxLength={30}
                  aria-label="Kelime tahmini"
                  className="min-w-0 flex-1 rounded-xl bg-slate-800 px-4 py-3 text-sm ring-1 ring-slate-700 focus:outline-none focus:ring-rose-400"
                />
                <Button variant="danger" onClick={submitGuess} disabled={!guessText.trim()}>
                  Tahmin Et
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Waiting for impostor guess */}
        {caught && !room.impostor_guess && !isImpostor && (
          <p className="mb-4 text-center text-sm text-slate-400">Sahtekar kelimeyi tahmin ediyor...</p>
        )}

        {/* Actions */}
        {!needsGuess && (
          <div className="flex gap-3">
            <Button variant="secondary" onClick={leaveRoom}>
              <ArrowLeft className="h-4 w-4" /> Çık
            </Button>
            {isHost ? (
              <Button variant="success" fullWidth onClick={playAgain}>
                <Sparkles className="h-4 w-4" /> Tekrar Oyna
              </Button>
            ) : (
              <p className="flex-1 text-center text-sm text-slate-500">Host tekrar başlatmayı bekliyor...</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Role Card ─────────────────────────────────────────────────────────────

function RoleCard({ isImpostor, word, category }: { isImpostor: boolean; word: string; category: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'rounded-2xl p-5 ring-1',
        isImpostor ? 'bg-rose-500/10 ring-rose-500/30' : 'bg-emerald-500/10 ring-emerald-500/30',
      )}
    >
      <div className="flex items-center gap-3">
        {isImpostor ? (
          <EyeOff className="h-6 w-6 text-rose-400" />
        ) : (
          <Eye className="h-6 w-6 text-emerald-400" />
        )}
        <div>
          <p className={cn('text-sm font-bold', isImpostor ? 'text-rose-300' : 'text-emerald-300')}>
            {isImpostor ? 'Sen sahtekarsın!' : 'Sen vatandaşsın!'}
          </p>
          {isImpostor ? (
            <p className="mt-1 text-xs text-slate-400">Kelimeyi bilmiyorsun — ipuçlarından tahmin et, yakalanma!</p>
          ) : (
            <>
              <p className="mt-1 text-lg font-bold text-cyan-300">{word}</p>
              <p className="text-xs text-slate-500">{category}</p>
            </>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// ─── Reveal Phase (Online) ─────────────────────────────────────────────────

function RevealPhase({
  room,
  players,
  myUserId,
  isImpostor,
  isHost,
  roomId,
  onLeave,
}: {
  room: RoomData
  players: RoomPlayer[]
  myUserId: string
  isImpostor: boolean
  isHost: boolean
  roomId: string
  onLeave: () => void
}) {
  const [revealed, setRevealed] = useState(false)
  const [iAmReady, setIAmReady] = useState(false)

  // Tüm oyuncular hazır mı?
  // - Benim için: local iAmReady (DB is_ready lobiden kalan true olabilir, güvenme)
  // - Diğer gerçek oyuncular için: DB is_ready
  // - Botlar: otomatik hazır
  const realPlayers = players.filter((p) => !p.is_bot)
  const allRevealed = realPlayers.length > 0 && realPlayers.every((p) =>
    (p.user_id === myUserId && iAmReady) || (p.user_id !== myUserId && p.is_ready)
  )

  // Host tüm oyuncular hazır olunca PLAYING'e geç
  useEffect(() => {
    if (!isHost || !allRevealed) return
    void supabase.from('rooms').update({ state: 'PLAYING' }).eq('id', roomId)
  }, [isHost, allRevealed, roomId])

  // "Hazırım" butonu
  const markReady = async () => {
    setIAmReady(true)
    // Gerçek oyuncu ise DB'ye yaz
    if (!myUserId.startsWith('bot-')) {
      await supabase.from('room_players')
        .update({ is_ready: true })
        .eq('room_id', roomId)
        .eq('user_id', myUserId)
    }
  }

  const myPlayer = players.find((p) => p.user_id === myUserId)
  const readyCount = realPlayers.filter((p) =>
    (p.user_id === myUserId && iAmReady) || (p.user_id !== myUserId && p.is_ready)
  ).length + players.filter((p) => p.is_bot).length

  return (
    <div className="relative min-h-svh w-full overflow-hidden bg-slate-950 text-slate-100 flex flex-col items-center justify-center px-6 py-8">
      {/* Background */}
      {revealed && (
        <>
          <div
            className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-30"
            style={{
              backgroundImage: "url('/role-duel.png')",
              backgroundPosition: isImpostor ? 'left center' : 'right center',
              backgroundSize: '200% auto',
            }}
            aria-hidden="true"
          />
          <div className="pointer-events-none absolute inset-0 bg-slate-950/65" aria-hidden="true" />
        </>
      )}

      {/* İlerleme göstergesi */}
      <div className="mb-6 flex items-center gap-2">
        <span className="text-xs text-slate-400">Roller dağıtılıyor</span>
        <span className="text-xs font-semibold text-indigo-300">{readyCount}/{players.length} hazır</span>
      </div>

      {/* Oyuncu kartı */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 280, damping: 25 }}
        className="relative z-10 w-full max-w-md flex flex-col items-center gap-6"
      >
        <div className="flex flex-col items-center gap-3">
          <Avatar avatarId={myPlayer?.avatar ?? 'avatar_default'} size="xl" hideFrame />
          <h2 className="text-2xl font-bold text-slate-100">{myPlayer?.username}</h2>
        </div>

        {/* Reveal butonu */}
        {!revealed && (
          <div className="flex flex-col items-center gap-4 py-8">
            <p className="text-center text-slate-300 max-w-xs">
              Rolünü görmek için aşağıya dokun. <strong className="text-indigo-300">Sadece sen gör!</strong>
            </p>
            <Button size="lg" onClick={() => setRevealed(true)}>
              <Eye className="h-5 w-5" />
              Rolümü Gör
            </Button>
          </div>
        )}

        {/* Reveal içeriği */}
        <AnimatePresence>
          {revealed && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="w-full"
            >
              {isImpostor ? (
                /* Sahtekar Kartı */
                <div className="rounded-2xl bg-linear-to-br from-rose-950/60 to-red-950/40 ring-2 ring-rose-500/50 p-6 text-center shadow-2xl shadow-rose-500/20">
                  <div className="mb-3 flex justify-center">
                    <motion.div animate={{ rotate: [0, -5, 5, 0] }} transition={{ duration: 2, repeat: Infinity }}>
                      <AlertTriangle className="h-12 w-12 text-rose-400" />
                    </motion.div>
                  </div>
                  <h3 className="text-xl font-bold text-rose-300 mb-2">Sen Sahtekarsın!</h3>
                  <p className="text-sm text-rose-200/80 mb-4">
                    Kelimeyi bilmiyorsun. Diğer vatandaşların ipuçlarından kelimeyi tahmin etmeye çalış.
                    Yakalanma!
                  </p>
                  <div className="rounded-xl bg-slate-950/50 px-4 py-3 ring-1 ring-rose-500/30">
                    <p className="text-xs text-rose-300/70 mb-1">Kategori</p>
                    <p className="text-lg font-semibold text-rose-200">{room.current_category ?? '?'}</p>
                  </div>
                </div>
              ) : (
                /* Oyuncu Kartı */
                <div className="rounded-2xl bg-linear-to-br from-indigo-950/60 to-purple-950/40 ring-2 ring-indigo-500/50 p-6 text-center shadow-2xl shadow-indigo-500/20">
                  <div className="mb-3 flex justify-center">
                    <Sparkles className="h-12 w-12 text-indigo-400" />
                  </div>
                  <h3 className="text-xl font-bold text-indigo-300 mb-2">Sen Vatandaşsın</h3>
                  <div className="rounded-xl bg-slate-950/50 px-4 py-4 ring-1 ring-indigo-500/30 mb-3">
                    <p className="text-xs text-slate-400 mb-1">Kelime</p>
                    <p className="text-2xl font-bold text-slate-100 mb-2">{room.current_word ?? '?'}</p>
                    <p className="text-xs text-slate-500">{room.current_category ?? ''}</p>
                  </div>
                  <div className="rounded-lg bg-slate-950/30 px-3 py-2 inline-block">
                    <p className="text-xs text-indigo-300/70">
                      İpuçları vererek sahtekarı bulmaya yardım et!
                    </p>
                  </div>
                </div>
              )}

              {/* Hazırım butonu */}
              <div className="mt-6 flex flex-col gap-3">
                {!iAmReady ? (
                  <Button
                    size="lg"
                    fullWidth
                    variant={isImpostor ? 'danger' : 'primary'}
                    onClick={markReady}
                  >
                    <Check className="h-5 w-5" />
                    Hazırım — Oyunu Başlat
                  </Button>
                ) : (
                  <div className="rounded-xl bg-emerald-500/10 px-4 py-3 text-center ring-1 ring-emerald-500/30">
                    <Check className="mx-auto h-6 w-6 text-emerald-400" />
                    <p className="mt-1 text-sm font-semibold text-emerald-300">Hazırım!</p>
                    <p className="text-xs text-slate-400">
                      {allRevealed ? 'Oyun başlıyor...' : `Diğer oyuncular bekleniyor (${readyCount}/${players.length})`}
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Çıkış */}
        <button type="button" onClick={onLeave} className="mt-4 text-xs text-slate-500 hover:text-slate-300">
          Odadan Çık
        </button>
      </motion.div>
    </div>
  )
}

// ─── Playing Phase (Online) — Alt bar + sekmeli yapı ───────────────────────

type PlayTab = 'hints' | 'chat' | 'role' | 'vote' | 'settings'

function PlayingPhase({
  room,
  players,
  chat,
  votes,
  myUserId,
  isImpostor,
  isHost,
  currentTurnPlayer,
  isMyTurn,
  hintText,
  setHintText,
  sendHint,
  passTurn,
  timeLeft,
  roomId,
  onLeave,
}: {
  room: RoomData
  players: RoomPlayer[]
  chat: ChatMsg[]
  votes: Record<string, string>
  myUserId: string
  isImpostor: boolean
  isHost: boolean
  currentTurnPlayer: RoomPlayer | undefined
  isMyTurn: boolean
  hintText: string
  setHintText: (v: string) => void
  sendHint: () => void
  passTurn: () => void
  timeLeft: number
  roomId: string
  onLeave: () => void
}) {
  const [tab, setTab] = useState<PlayTab>('hints')
  const [chatText, setChatText] = useState('')
  const hintsScrollRef = useRef<HTMLDivElement>(null)
  const chatScrollRef = useRef<HTMLDivElement>(null)

  const hintsList = chat.filter((m) => m.message_type === 'hint' || m.message_type === 'system')
  const chatList = chat.filter((m) => m.message_type === 'chat' || m.message_type === 'system')
  const myPlayer = players.find((p) => p.user_id === myUserId)
  const hasPassed = myPlayer?.passed ?? false

  // Auto-scroll
  useEffect(() => {
    hintsScrollRef.current?.scrollTo({ top: hintsScrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [hintsList.length])
  useEffect(() => {
    chatScrollRef.current?.scrollTo({ top: chatScrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [chatList.length])

  // Tartışma mesajı gönder
  const sendChatMessage = async () => {
    const text = chatText.trim()
    if (!text) return
    await supabase.from('room_chat').insert({
      room_id: roomId,
      user_id: myUserId,
      player_name: myPlayer?.username ?? 'Oyuncu',
      text,
      message_type: 'chat',
    })
    setChatText('')
  }

  const tabs: { id: PlayTab; label: string; icon: typeof Send }[] = [
    { id: 'hints', label: 'İpuçları', icon: Sparkles },
    { id: 'chat', label: 'Tartışma', icon: MessageSquare },
    { id: 'role', label: 'Rolüm', icon: Eye },
    { id: 'vote', label: 'Oylama', icon: AlertTriangle },
    { id: 'settings', label: 'Ayarlar', icon: SettingsIcon },
  ]

  return (
    <div className="flex h-svh w-full flex-col bg-slate-950 text-slate-100">
      {/* ─── Header (sabit) — Tur + Sıra + Timer ─────────────────────── */}
      <div className="shrink-0 border-b border-slate-800 bg-slate-900/50 px-4 py-2.5">
        <div className="mx-auto w-full max-w-md">
          {/* Üst satır: Tur + Oyuncu sayısı + Timer */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-indigo-500/20 px-2 py-0.5 text-xs font-bold text-indigo-300">Tur {room.round}</span>
              <span className="text-xs text-slate-500">{players.length} oyuncu</span>
            </div>
            {timeLeft > 0 && (
              <span className={cn('flex items-center gap-1 rounded-lg px-2.5 py-1 text-sm font-bold tabular-nums', timeLeft <= 5 ? 'bg-rose-500/20 text-rose-300 animate-pulse' : 'bg-slate-800 text-indigo-300')}>
                <Clock className="h-4 w-4" /> {timeLeft}s
              </span>
            )}
          </div>
          {/* Alt satır: Sıra kimde — belirgin banner */}
          <div className={cn(
            'mt-2 flex items-center gap-2 rounded-xl px-3 py-2 ring-1',
            isMyTurn ? 'bg-indigo-500/15 ring-indigo-500/40' : 'bg-slate-800/50 ring-slate-700',
          )}>
            <Avatar avatarId={currentTurnPlayer?.avatar ?? 'avatar_default'} size="sm" hideFrame />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-slate-500">Sıra</p>
              <p className={cn('text-sm font-bold truncate', isMyTurn ? 'text-indigo-300' : 'text-slate-200')}>
                {currentTurnPlayer?.username ?? '...'}
                {isMyTurn && ' — Senin sıran! 🎯'}
              </p>
            </div>
            {isMyTurn && !hasPassed && (
              <span className="rounded-lg bg-indigo-500/30 px-2 py-1 text-[10px] font-bold text-indigo-200">İPUCU VER</span>
            )}
          </div>
        </div>
      </div>

      {/* ─── İçerik (scroll) ────────────────────────────────────────── */}
      <div className="min-h-0 flex-1 overflow-hidden">
        <div className="mx-auto h-full w-full max-w-md">
          {/* ─── İpuçları sekmesi ─────────────────────────────────────── */}
          {tab === 'hints' && (
            <div className="flex h-full flex-col px-4 py-3">
              <div ref={hintsScrollRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto">
                {hintsList.length === 0 ? (
                  <p className="py-8 text-center text-xs text-slate-500">İpuçları burada görünecek...</p>
                ) : (
                  hintsList.map((msg) => (
                    <div key={msg.id} className={cn('rounded-lg px-3 py-2 text-sm', msg.message_type === 'system' ? 'bg-slate-800/50 text-center text-xs text-slate-500' : 'bg-slate-800')}>
                      {msg.message_type === 'hint' && <span className="font-semibold text-indigo-300">{msg.player_name}: </span>}
                      {msg.text}
                    </div>
                  ))
                )}
              </div>
              {/* İpucu input */}
              <div className="shrink-0 pt-2">
                {isMyTurn && !hasPassed ? (
                  <div className="flex gap-2">
                    <input
                      value={hintText}
                      onChange={(e) => setHintText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && sendHint()}
                      placeholder="İpucun..."
                      maxLength={100}
                      aria-label="İpucu"
                      className="min-w-0 flex-1 rounded-xl bg-slate-800 px-4 py-3 text-sm ring-1 ring-slate-700 focus:outline-none focus:ring-indigo-400"
                    />
                    <Button onClick={sendHint} disabled={!hintText.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                    <Button variant="secondary" onClick={passTurn}>
                      Pas
                    </Button>
                  </div>
                ) : (
                  <p className="py-2 text-center text-xs text-slate-500">
                    {isMyTurn ? 'Pas geçtin, sıra bekleniyor...' : `${currentTurnPlayer?.username} ipucu veriyor...`}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ─── Tartışma sekmesi ───────────────────────────────────── */}
          {tab === 'chat' && (
            <div className="flex h-full flex-col px-4 py-3">
              <div ref={chatScrollRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto">
                {chatList.length === 0 ? (
                  <p className="py-8 text-center text-xs text-slate-500">Tartışma burada... Serbestçe konuşabilirsin!</p>
                ) : (
                  chatList.map((msg) => (
                    <div key={msg.id} className={cn('rounded-lg px-3 py-2 text-sm', msg.message_type === 'system' ? 'bg-slate-800/50 text-center text-xs text-slate-500' : 'bg-slate-800')}>
                      {msg.message_type === 'chat' && <span className="font-semibold text-cyan-300">{msg.player_name}: </span>}
                      {msg.text}
                    </div>
                  ))
                )}
              </div>
              <div className="shrink-0 pt-2">
                <div className="flex gap-2">
                  <input
                    value={chatText}
                    onChange={(e) => setChatText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendChatMessage()}
                    placeholder="Mesaj..."
                    maxLength={200}
                    aria-label="Tartışma mesajı"
                    className="min-w-0 flex-1 rounded-xl bg-slate-800 px-4 py-3 text-sm ring-1 ring-slate-700 focus:outline-none focus:ring-cyan-400"
                  />
                  <Button onClick={sendChatMessage} disabled={!chatText.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ─── Rolüm sekmesi ──────────────────────────────────────── */}
          {tab === 'role' && (
            <div className="flex h-full flex-col items-center justify-center px-6 py-8">
              <RoleCard isImpostor={isImpostor} word={room.current_word ?? ''} category={room.current_category ?? ''} />
              <div className="mt-4 w-full max-w-sm space-y-2">
                <div className="rounded-xl bg-slate-900 px-4 py-3 ring-1 ring-slate-800">
                  <p className="text-xs text-slate-400">Oyuncular:</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {players.map((p) => (
                      <span key={p.user_id} className="rounded-lg bg-slate-800 px-2 py-1 text-xs text-slate-300">
                        {p.username}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ─── Oylama sekmesi ──────────────────────────────────────── */}
          {tab === 'vote' && (
            <div className="flex h-full flex-col px-4 py-3 overflow-y-auto">
              <p className="mb-3 text-center text-sm text-slate-400">
                {isHost ? 'Oylamayı başlatabilirsin' : 'Host oylamayı başlatabilir'}
              </p>
              {isHost && (
                <Button
                  variant="danger"
                  fullWidth
                  onClick={() => {
                    void supabase.from('rooms').update({ state: 'VOTING' }).eq('id', roomId)
                  }}
                >
                  <AlertTriangle className="h-4 w-4" /> Oylamaya Geç
                </Button>
              )}
              <div className="mt-4 space-y-2">
                <p className="text-xs text-slate-500">Şu anaki oylar:</p>
                {Object.keys(votes).length === 0 ? (
                  <p className="text-xs text-slate-600">Henüz oy yok</p>
                ) : (
                  Object.entries(votes).map(([voter, target]) => (
                    <div key={voter} className="rounded-lg bg-slate-800 px-3 py-2 text-xs">
                      <span className="text-slate-300">{players.find((p) => p.user_id === voter)?.username ?? '?'}</span>
                      <span className="text-slate-500"> → </span>
                      <span className="text-rose-300">{players.find((p) => p.user_id === target)?.username ?? '?'}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ─── Ayarlar sekmesi ────────────────────────────────────── */}
          {tab === 'settings' && (
            <div className="flex h-full flex-col px-4 py-3 overflow-y-auto">
              <div className="space-y-3">
                <div className="rounded-xl bg-slate-900 px-4 py-3 ring-1 ring-slate-800">
                  <p className="text-xs text-slate-400">Oda kodu</p>
                  <p className="mt-1 font-mono text-lg text-cyan-300">{room.code}</p>
                </div>
                <div className="rounded-xl bg-slate-900 px-4 py-3 ring-1 ring-slate-800">
                  <p className="text-xs text-slate-400">Oyun ayarları</p>
                  <div className="mt-2 space-y-1 text-xs text-slate-300">
                    <p>Tur süresi: {room.settings.turnTimeLimit ?? 30}sn</p>
                    <p>Oylama öncesi tur: {room.settings.roundsBeforeVoting ?? 2}</p>
                    <p>Zorluk: {room.settings.wordDifficulty ?? 'MIXED'}</p>
                  </div>
                </div>
                <div className="rounded-xl bg-slate-900 px-4 py-3 ring-1 ring-slate-800">
                  <p className="text-xs text-slate-400">Oyuncular ({players.length})</p>
                  <div className="mt-2 space-y-1.5">
                    {players.map((p) => (
                      <div key={p.user_id} className="flex items-center gap-2">
                        <Avatar avatarId={p.avatar} size="sm" hideFrame />
                        <span className="text-xs text-slate-300">{p.username}</span>
                        {p.user_id === room.host_id && <Crown className="h-3 w-3 text-amber-400" />}
                      </div>
                    ))}
                  </div>
                </div>
                <Button variant="secondary" fullWidth onClick={onLeave}>
                  <ArrowLeft className="h-4 w-4" /> Odadan Çık
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── Alt bar (sabit) ─────────────────────────────────────────── */}
      <div className="shrink-0 border-t border-slate-800 bg-slate-900/95 px-2 py-1.5">
        <div className="mx-auto flex w-full max-w-md items-center justify-around">
          {tabs.map((t) => {
            const Icon = t.icon
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  'flex flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 text-[10px] font-medium transition-colors',
                  tab === t.id ? 'text-indigo-300' : 'text-slate-500 hover:text-slate-300',
                )}
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
