import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import {
  ArrowLeft, Send, Clock, Eye, EyeOff, Crown, Check,
  Loader2, AlertTriangle, Trophy, Skull, Sparkles,
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
}

interface ChatMsg {
  id: string
  user_id: string
  player_name: string
  text: string
  message_type: 'hint' | 'system'
  created_at: string
}

interface RoomData {
  id: string
  code: string
  host_id: string
  state: 'LOBBY' | 'PLAYING' | 'VOTING' | 'FINISHED'
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
        const userIds = rpData.map((rp) => rp.user_id)
        const { data: profiles } = await supabase.from('profiles').select('id, username, avatar').in('id', userIds)
        const { data: inv } = await supabase.from('inventory').select('user_id, equipped_avatar').in('user_id', userIds)
        const equippedMap = new Map<string, string>()
        for (const i of inv ?? []) equippedMap.set(i.user_id, i.equipped_avatar)

        const sorted = [...rpData].sort((a, b) => (a.seat ?? 0) - (b.seat ?? 0))
        setPlayers(sorted.map((rp) => {
          const p = profiles?.find((pr) => pr.id === rp.user_id)
          return {
            user_id: rp.user_id,
            username: p?.username ?? 'Oyuncu',
            avatar: equippedMap.get(rp.user_id) ?? p?.avatar ?? 'avatar_default',
            is_ready: rp.is_ready,
            seat: rp.seat ?? 0,
            passed: rp.passed ?? false,
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
          const userIds = rpData.map((rp) => rp.user_id)
          const { data: profiles } = await supabase.from('profiles').select('id, username, avatar').in('id', userIds)
          const { data: inv } = await supabase.from('inventory').select('user_id, equipped_avatar').in('user_id', userIds)
          const equippedMap = new Map<string, string>()
          for (const i of inv ?? []) equippedMap.set(i.user_id, i.equipped_avatar)
          const sorted = [...rpData].sort((a, b) => (a.seat ?? 0) - (b.seat ?? 0))
          setPlayers(sorted.map((rp) => {
            const p = profiles?.find((pr) => pr.id === rp.user_id)
            return {
              user_id: rp.user_id,
              username: p?.username ?? 'Oyuncu',
              avatar: equippedMap.get(rp.user_id) ?? p?.avatar ?? 'avatar_default',
              is_ready: rp.is_ready,
              seat: rp.seat ?? 0,
              passed: rp.passed ?? false,
            }
          }))
        },
      )
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'room_chat', filter: `room_id=eq.${roomId}` },
        (payload) => {
          setChat((prev) => [...prev, payload.new as ChatMsg])
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
      settings: { ...room.settings, turnTimeLimit: 30, roundsBeforeVoting: 2 },
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

    await supabase.from('room_chat').insert({
      room_id: roomId,
      user_id: myUserId,
      player_name: players.find((p) => p.user_id === myUserId)?.username ?? 'Oyuncu',
      text,
      message_type: 'hint',
    })

    setHintText('')
    // Host turn'ü ilerletir
    if (isHost) {
      await advanceTurn()
    }
  }

  // ─── Pass ───────────────────────────────────────────────────────────────
  const passTurn = async () => {
    if (!isMyTurn) return
    await supabase.from('room_players').update({ passed: true }).eq('room_id', roomId).eq('user_id', myUserId)
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
    await supabase.from('room_votes').upsert({
      room_id: roomId,
      voter_id: myUserId,
      target_id: targetId,
    })
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
  // PLAYING STATE — Hints
  // ═══════════════════════════════════════════════════════════════════════
  if (room.state === 'PLAYING') {
    return (
      <div className="min-h-svh w-full bg-slate-950 px-4 py-6 text-slate-100">
        <div className="mx-auto w-full max-w-md">
          {/* Header */}
          <div className="mb-4 flex items-center justify-between">
            <button type="button" onClick={leaveRoom} className="flex min-h-11 items-center gap-2 text-slate-400 hover:text-white">
              <ArrowLeft className="h-5 w-5" /> Çık
            </button>
            <div className="flex items-center gap-2 text-sm">
              <span className="rounded-lg bg-slate-800 px-2 py-1 text-xs text-slate-400">Tur {room.round}</span>
              {timeLeft > 0 && (
                <span className={cn('flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold', timeLeft <= 5 ? 'bg-rose-500/20 text-rose-300' : 'bg-indigo-500/20 text-indigo-300')}>
                  <Clock className="h-3 w-3" /> {timeLeft}s
                </span>
              )}
            </div>
          </div>

          {/* Role card */}
          <RoleCard isImpostor={isImpostor} word={room.current_word ?? ''} category={room.current_category ?? ''} />

          {/* Turn indicator */}
          <div className="mt-4 rounded-xl bg-slate-900 px-4 py-3 ring-1 ring-slate-800">
            <p className="text-xs text-slate-400">Sıra:</p>
            <div className="mt-1 flex items-center gap-2">
              <Avatar avatarId={currentTurnPlayer?.avatar ?? 'avatar_default'} size="sm" hideFrame />
              <span className="font-semibold text-slate-100">{currentTurnPlayer?.username}</span>
              {isMyTurn && <span className="text-xs text-indigo-300">(sen)</span>}
            </div>
          </div>

          {/* Chat / Hints */}
          <div className="mt-4 max-h-[40vh] space-y-2 overflow-y-auto rounded-xl bg-slate-900/50 p-3 ring-1 ring-slate-800">
            {chat.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-500">İpuçları burada görünecek...</p>
            ) : (
              chat.map((msg) => (
                <div key={msg.id} className={cn('rounded-lg px-3 py-2 text-sm', msg.message_type === 'system' ? 'bg-slate-800/50 text-center text-xs text-slate-500' : 'bg-slate-800')}>
                  {msg.message_type === 'hint' && <span className="font-semibold text-indigo-300">{msg.player_name}: </span>}
                  {msg.text}
                </div>
              ))
            )}
          </div>

          {/* Input */}
          {isMyTurn && !players.find((p) => p.user_id === myUserId)?.passed ? (
            <div className="mt-4 flex gap-2">
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
            <p className="mt-4 text-center text-xs text-slate-500">
              {isMyTurn ? 'Pas geçtin, sıra bekleniyor...' : `${currentTurnPlayer?.username} ipucu veriyor...`}
            </p>
          )}

          {/* Host: force voting */}
          {isHost && (
            <Button variant="secondary" fullWidth className="mt-4" onClick={() => {
              void supabase.from('rooms').update({ state: 'VOTING' }).eq('id', roomId)
            }}>
              <AlertTriangle className="h-4 w-4" /> Oylamaya Geç
            </Button>
          )}
        </div>
      </div>
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
            {isImpostor ? 'Sen sahtekarsın!' : 'Sen normal oyuncusun'}
          </p>
          {isImpostor ? (
            <p className="mt-1 text-xs text-slate-400">Kelimeyi bilmiyorsun — ipuçlarından tahmin etmeye çalış, yakalanma!</p>
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
