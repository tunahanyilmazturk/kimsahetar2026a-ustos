import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  ArrowLeft, Send, Clock, Eye, EyeOff, Crown, Check,
  Loader2, AlertTriangle, Trophy, Skull, Sparkles,
  MessageSquare, Settings as SettingsIcon, UserPlus,
} from 'lucide-react'
import { Button } from './components/common/Button'
import { Avatar } from './components/common/Avatar'
import { useToast } from './components/common/toast-context'
import { supabase } from './lib/supabase'
import { profileApi, statsApi } from './lib/profileApi'
import { applyGameResult } from './lib/scoreSystem'
import { questsApi } from './lib/questsApi'
import { achievementsApi } from './lib/achievementsApi'
import { WORD_POOL } from './constants'
import { pickWord, pickImpostor } from './utils/wordPool'
import { countVotes, hintSimilarity, isGuessCorrect, isTooSimilarHint, isValidHint } from './utils/gameUtils'
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
  vote_requested?: boolean
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
  const botTurnRef = useRef<string | null>(null)
  const [guessText, setGuessText] = useState('')
  const [timeLeft, setTimeLeft] = useState(0)
  const [loading, setLoading] = useState(true)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const activeTimerKeyRef = useRef<string | null>(null)
  const expiredTimerKeyRef = useRef<string | null>(null)
  const startVoteLockRef = useRef(false)

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

  // Realtime bildirimi kaçıran istemciler için oda state'ini kısa aralıklarla doğrula.
  // Bu özellikle tüm oyuncular hazır olduktan sonraki REVEAL → PLAYING geçişinde önemlidir.
  useEffect(() => {
    if (!roomId || room?.state !== 'REVEAL') return
    let cancelled = false
    const syncRoomState = async () => {
      const { data } = await supabase.from('rooms').select('state').eq('id', roomId).maybeSingle()
      if (!cancelled && data?.state && data.state !== 'REVEAL') {
        setRoom((current) => current ? { ...current, state: data.state as RoomData['state'] } : current)
      }
    }
    const interval = window.setInterval(() => { void syncRoomState() }, 1000)
    void syncRoomState()
    return () => { cancelled = true; window.clearInterval(interval) }
  }, [roomId, room?.state])

  // ─── Timer ──────────────────────────────────────────────────────────────
  const turnTimeLimit = room?.settings.turnTimeLimit ?? 30
  const timerKey = `${room?.turn_index}-${room?.round}`
  useEffect(() => {
    if (room?.state !== 'PLAYING') return
    if (timerRef.current) clearInterval(timerRef.current)
    activeTimerKeyRef.current = timerKey
    expiredTimerKeyRef.current = null
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
      vote_requested: false,
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
    if (isTooSimilarHint(text, hintsThisRound.map((hint) => hint.text))) {
      toast.warning('Bu ipucu önceki bir ipucuna çok benziyor. Farklı bir açıdan anlatmayı dene.')
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
    // Pas flag'lerini sıra başına sıfırla
    if (nextIndex === 0) {
      for (const p of players) {
        await supabase.from('room_players').update({ passed: false }).eq('room_id', roomId).eq('user_id', p.user_id)
      }
    }

    // Tur sayısı dolsa bile oylamayı kendiliğinden açma. Host, Oylama
    // sekmesinden teklif gönderir; oyuncular kabul ederse VOTING'e geçilir.
    await supabase.from('rooms').update({
      turn_index: nextIndex,
      round: nextRound,
    }).eq('id', roomId)
  }

  // Süre dolunca host turu otomatik olarak ilerletir.
  useEffect(() => {
    if (!isHost || room?.state !== 'PLAYING' || timeLeft !== 0 || !activeTimerKeyRef.current || activeTimerKeyRef.current !== timerKey || expiredTimerKeyRef.current === timerKey) return
    expiredTimerKeyRef.current = timerKey
    void advanceTurn()
  }, [isHost, room?.state, timeLeft, timerKey, advanceTurn])

  // Online lobide eklenen botlar host tarafından otomatik oynatılır.
  useEffect(() => {
    if (!isHost || !myUserId || room?.state !== 'PLAYING' || !currentTurnPlayer?.is_bot) return
    const botKey = `${room.id}:${room.round}:${room.turn_index}`
    if (botTurnRef.current === botKey) return
    botTurnRef.current = botKey
    const bot = currentTurnPlayer
    const word = room.current_word ?? ''
    const category = room.current_category ?? 'bu kategori'
    const entry = WORD_POOL.find((item) => item.word.toLocaleLowerCase('tr-TR') === word.toLocaleLowerCase('tr-TR'))
    const botIsImpostor = bot.user_id === room.impostor_id
    const usedHints = new Set(chat.filter((message) => message.message_type === 'hint').map((message) => message.text.toLocaleLowerCase('tr-TR')))
    const clue = entry?.hint ?? `${category} ile ilgili belirgin bir şey`
    const clueText = clue.charAt(0).toLocaleLowerCase('tr-TR') + clue.slice(1)
    const length = word.replace(/[^a-zA-ZçğıöşüÇĞİÖŞÜ]/g, '').length || 5
    const previousHints = chat.filter((message) => message.message_type === 'hint')
    const lastHint = previousHints.at(-1)
    const broadHints = [
      `${category} içinde karşına çıkabilir`,
      `Günlük hayatta sıkça görülür`,
      `${length} harfli bir kelime`,
      'Bununla ilgili bir deneyimin olabilir',
      `Bir ${category.toLocaleLowerCase('tr-TR')} örneği gibi düşün`,
      'Yakından bakınca tanıdık gelecektir',
    ]
    const preciseHints = [
      clue,
      `Bunu ${clueText} olarak düşünebilirsin`,
      `${category} içinde ${clueText}`,
      `Benim çağrışımım: ${clueText}`,
      `İşlevi açısından ${clueText}`,
      `${length} karakterli ve ${clueText}`,
      `Bu kelime ${clueText} bir şeyi anlatıyor`,
      lastHint ? `${lastHint.player_name}'in fikrine yakın ama ben ${clueText} diyorum` : `İlk aklıma gelen ${clueText}`,
    ]
    // Sahtekar bot kelimeyi bilmez; kelimeye özel ipucunu kullanması haksız olur.
    const impostorHints = [
      `${category} hakkında genel bir şey`,
      'Bunu günlük hayatta görebilirsin',
      'Çok uzak olmayan bir konu',
      'Aklına gelen ilk şeylerden biri',
    ]
    const hints = botIsImpostor
      ? impostorHints
      : bot.bot_difficulty === 'EXPERT' ? preciseHints : bot.bot_difficulty === 'EASY' ? broadHints : [...preciseHints.slice(0, 2), ...broadHints.slice(0, 2)]
    const previousHintTexts = previousHints.map((message) => message.text)
    // Önce aynı cümleyi engelle; havuz tükense bile güvenli bir varyasyon seç.
    const availableHints = hints.filter((candidate) => !usedHints.has(candidate.toLocaleLowerCase('tr-TR')))
    const distinctHints = availableHints.filter((candidate) => !isTooSimilarHint(candidate, previousHintTexts))
    const pool = distinctHints.length > 0 ? distinctHints : availableHints.length > 0 ? availableHints : hints
    const botSeed = Array.from(bot.username).reduce((sum, character) => sum + character.charCodeAt(0), 0)
    const hint = pool[(room.round * 7 + room.turn_index * 11 + botSeed) % pool.length]!
    const timer = window.setTimeout(() => {
      void (async () => {
        const { error } = await supabase.from('room_chat').insert({ room_id: roomId, user_id: myUserId, player_name: bot.username, text: hint, message_type: 'hint' })
        if (error) {
          toast.error(`Bot ipucu gönderemedi: ${error.message}`)
          // Veritabanı yazımı başarısız olsa bile bot turu kilitlemesin.
          await advanceTurn()
          return
        }
        await advanceTurn()
      })()
    }, 900)
    return () => window.clearTimeout(timer)
    // advanceTurn/toast her render'da yeni referans ürettiği için timer'ı
    // gereksiz yere iptal etmemeli; botKey aynı turu zaten koruyor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, myUserId, room?.state, room?.id, room?.round, room?.turn_index, room?.current_category, room?.current_word, currentTurnPlayer?.user_id, currentTurnPlayer?.is_bot, currentTurnPlayer?.bot_difficulty, roomId, chat])

  // ─── Vote ───────────────────────────────────────────────────────────────
  const vote = async (targetId: string) => {
    if (!myUserId || myVote) return
    const { error } = await supabase.from('room_votes').insert({
      room_id: roomId,
      voter_id: myUserId,
      target_id: targetId,
    })
    if (error) toast.error(error.code === '23505' ? 'Zaten oy verdin.' : `Oyunuz kaydedilemedi: ${error.message}`)
  }

  // Oylamaya geçiş kararı: herkes bir kez Evet/Hayır verir.
  const castStartVote = async (choice: 'yes' | 'no') => {
    if (!myUserId || !room?.vote_requested || votes[myUserId]) return
    const { error } = await supabase.from('room_votes').insert({
      room_id: roomId,
      voter_id: myUserId,
      target_id: choice === 'yes' ? '__START_YES__' : '__START_NO__',
    })
    if (error) toast.error(error.code === '23505' ? 'Kararını zaten verdin.' : `Kararın kaydedilemedi: ${error.message}`)
  }

  const requestVoteStart = async () => {
    if (!isHost || !room || room.vote_requested) return
    const { error } = await supabase.from('rooms').update({ vote_requested: true }).eq('id', roomId).eq('state', 'PLAYING')
    if (error) toast.error('Oylama teklifi gönderilemedi. Tekrar dene.')
    else toast.success('Oylama teklifi gönderildi.')
  }

  // Host, tüm oyuncular karar verdikten sonra çoğunluğa göre PLAYING → VOTING geçişini yapar.
  useEffect(() => {
    if (!isHost || room?.state !== 'PLAYING' || !room.vote_requested || players.length === 0) return
    const decided = players.every((p) => votes[p.user_id] === '__START_YES__' || votes[p.user_id] === '__START_NO__')
    if (!decided || startVoteLockRef.current) return
    startVoteLockRef.current = true
    const yes = players.filter((p) => votes[p.user_id] === '__START_YES__').length
    const nextState = yes > players.length / 2 ? 'VOTING' : 'PLAYING'
    void (async () => {
      const { error } = await supabase.from('room_votes').delete().eq('room_id', roomId)
      if (error) {
        toast.error('Başlangıç oylaması temizlenemedi.')
        startVoteLockRef.current = false
        return
      }
      const { error: roomError } = await supabase.from('rooms').update({ state: nextState, turn_index: 0, vote_requested: false }).eq('id', roomId).eq('state', 'PLAYING')
      if (roomError) toast.error('Oylama başlatılamadı. Tekrar dene.')
      if (nextState === 'PLAYING') startVoteLockRef.current = false
    })()
  }, [isHost, room?.state, players, votes, roomId, toast])

  // ─── Host: Finish voting ────────────────────────────────────────────────
  const finishVoting = async () => {
    if (!room || !isHost) return
    const { topVotedId } = countVotes(votes)
    const caught = topVotedId === room.impostor_id
    const impostor = players.find((player) => player.user_id === room.impostor_id)
    const citizenHints = chat
      .filter((message) => message.message_type === 'hint' && message.player_name !== impostor?.username)
      .map((message) => message.text)
    const botGuess = caught && impostor?.is_bot
      ? inferBotWord(room.current_category, citizenHints, impostor.bot_difficulty)
      : null
    const botGuessedCorrectly = !!botGuess && isGuessCorrect(botGuess, room.current_word ?? '')
    const winner = botGuessedCorrectly ? 'IMPOSTOR' : caught ? 'PLAYERS' : 'IMPOSTOR'

    await supabase.from('rooms').update({
      state: 'FINISHED',
      voted_impostor_id: topVotedId,
      winner,
      impostor_guess: botGuess,
    }).eq('id', roomId)

    await supabase.from('room_chat').insert({
      room_id: roomId,
      user_id: myUserId,
      player_name: 'Sistem',
      text: botGuessedCorrectly ? `Sahtekar kelimeyi tahmin etti: ${botGuess}` : caught ? 'Sahtekar yakalandı!' : 'Sahtekar kaçtı!',
      message_type: 'system',
    })
  }

  // Botlar oylamada ipuçlarını karşılaştırıp en şüpheli oyuncuya oy verir.
  useEffect(() => {
    if (!isHost || room?.state !== 'VOTING' || players.length === 0) return
    const pending = players.filter((p) => p.is_bot && !votes[p.user_id])
    if (pending.length === 0) return
    const timer = window.setTimeout(() => {
      void (async () => {
        for (const bot of pending) {
          const candidates = players.filter((p) => p.user_id !== bot.user_id)
          const scores = candidates.map((candidate) => {
            const candidateHints = chat.filter((message) => message.message_type === 'hint' && message.player_name === candidate.username).map((message) => message.text)
            const hint = candidateHints.join(' ')
            const repeated = candidateHints.length > 1 && new Set(candidateHints.map((value) => value.toLocaleLowerCase('tr-TR'))).size < candidateHints.length
            const generic = ['bir şey', 'genel', 'günlük hayatta', 'aklına gelen'].some((term) => hint.toLocaleLowerCase('tr-TR').includes(term))
            const similarities = candidateHints.flatMap((value, index) => candidateHints.slice(index + 1).map((other) => hintSimilarity(value, other)))
            const suspicion = (hint.length <= 12 ? 3 : 0) + (generic ? 2 : 0) + (repeated ? 2 : 0) + (similarities.some((score) => score > 0.72) ? 1 : 0)
            return { id: candidate.user_id, suspicion }
          }).sort((a, b) => b.suspicion - a.suspicion)
          const target = scores[0]?.id
          if (target) {
            const { error } = await supabase.from('room_votes').insert({ room_id: roomId, voter_id: bot.user_id, target_id: target })
            if (error) toast.error(`Bot oyu kaydedilemedi: ${error.message}`)
          }
        }
      })()
    }, 700)
    return () => window.clearTimeout(timer)
  }, [isHost, room?.state, roomId, players, votes, chat])

  useEffect(() => {
    if (isHost && room?.state === 'VOTING' && allVoted) void finishVoting()
  }, [isHost, room?.state, allVoted, finishVoting])

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

  // Sahtekar, kendi sırası geldiğinde Rolüm sekmesinden kelimeyi deneyebilir.
  const submitRoleGuess = async () => {
    if (!room || !isImpostor || !isMyTurn) return
    const guess = guessText.trim()
    if (!guess) return
    if (!isGuessCorrect(guess, room.current_word ?? '')) {
      toast.error('Tahmin yanlış. Sıran devam ediyor, yeni bir ipucu verebilirsin.')
      setGuessText('')
      return
    }
    const { error } = await supabase.from('rooms').update({
      state: 'FINISHED',
      winner: 'IMPOSTOR',
      impostor_guess: guess,
      voted_impostor_id: room.impostor_id,
    }).eq('id', roomId).eq('state', 'PLAYING')
    if (error) toast.error('Tahmin kaydedilemedi. Tekrar dene.')
    else toast.success('Doğru tahmin! Sahtekar kazandı!')
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
        currentTurnPlayer={currentTurnPlayer}
        isMyTurn={isMyTurn}
        hintText={hintText}
        setHintText={setHintText}
        sendHint={sendHint}
        passTurn={passTurn}
        timeLeft={timeLeft}
        startVotes={votes}
        castStartVote={castStartVote}
        requestVoteStart={requestVoteStart}
        guessText={guessText}
        setGuessText={setGuessText}
        submitRoleGuess={submitRoleGuess}
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
        'relative flex h-full min-h-[30rem] w-full max-w-sm flex-col justify-start overflow-hidden rounded-2xl p-6 pt-8 ring-1 shadow-xl',
        isImpostor ? 'bg-rose-500/10 ring-rose-500/30' : 'bg-emerald-500/10 ring-emerald-500/30',
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-35" style={{ backgroundImage: "url('/role-duel.png')", backgroundPosition: isImpostor ? 'left top' : 'right top', backgroundSize: '200% auto' }} aria-hidden="true" />
      <div className="pointer-events-none absolute inset-0 bg-linear-to-br from-slate-950/80 via-slate-950/55 to-slate-950/75" aria-hidden="true" />
      <div className="relative z-10">
      <div className="mb-4 flex items-center justify-between"><span className={cn('rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider', isImpostor ? 'bg-rose-500/25 text-rose-200' : 'bg-emerald-500/25 text-emerald-200')}>{isImpostor ? 'Gizli rol' : 'Takım rolü'}</span><span className="text-xs text-slate-300">Rolüm</span></div>
      <div className="flex items-start gap-3">
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
            <><p className="mt-1 text-xs leading-5 text-slate-400">Kelimeyi bilmiyorsun. İpuçlarını takip et, doğal görün ve yakalanma.</p><div className="mt-3 rounded-xl bg-slate-950/40 px-3 py-2 text-xs text-rose-200">Kazanma hedefi: Oylamadan kaç veya kelimeyi doğru tahmin et.</div></>
          ) : (
            <>
              <p className="mt-1 text-lg font-bold text-cyan-300">{word}</p>
              <p className="text-xs text-slate-500">Kategori: {category}</p><div className="mt-3 rounded-xl bg-slate-950/40 px-3 py-2 text-xs text-emerald-200">Kazanma hedefi: Sahtekârı bul ve oyla.</div>
            </>
          )}
        </div>
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
  const toast = useToast()
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
    let cancelled = false
    const promoteRoom = async () => {
      const { data, error } = await supabase
        .from('rooms')
        .update({ state: 'PLAYING', vote_requested: false })
        .eq('id', roomId)
        .eq('state', 'REVEAL')
        .select('state')
        .maybeSingle()
      if (!cancelled && error) toast.error('Oyun başlatılamadı. Lütfen tekrar dene.')
      return data
    }

    void promoteRoom()
    // Realtime mesajı kaçırılırsa geçişi garanti etmek için kısa polling.
    const retry = window.setInterval(() => {
      void supabase.from('rooms').select('state').eq('id', roomId).maybeSingle().then(({ data, error }) => {
        if (cancelled || error || data?.state !== 'REVEAL') return
        void promoteRoom()
      })
    }, 1000)

    return () => {
      cancelled = true
      window.clearInterval(retry)
    }
  }, [isHost, allRevealed, roomId, toast])

  // "Hazırım" butonu
  const markReady = async () => {
    setIAmReady(true)
    // Gerçek oyuncu ise DB'ye yaz
    if (!myUserId.startsWith('bot-')) {
      const { error } = await supabase.from('room_players')
        .update({ is_ready: true })
        .eq('room_id', roomId)
        .eq('user_id', myUserId)
      if (error) {
        toast.error('Hazır durumun kaydedilemedi. Tekrar dene.')
        setIAmReady(false)
        return
      }
    }

    // Realtime bildirimi gecikirse bile host doğrudan son durumu kontrol eder.
    if (isHost) {
      const { data: readyPlayers } = await supabase
        .from('room_players')
        .select('user_id, is_ready, is_bot')
        .eq('room_id', roomId)
      const everyoneReady = (readyPlayers ?? []).length > 0 && (readyPlayers ?? []).every((player) => player.is_bot || player.is_ready)
      if (everyoneReady) {
        const { error } = await supabase.from('rooms').update({ state: 'PLAYING', vote_requested: false }).eq('id', roomId)
        if (error) toast.error('Oyun başlatılamadı. Host tekrar denesin.')
      }
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

const PLAYER_MESSAGE_COLORS = [
  'text-cyan-300 ring-cyan-400/30 bg-cyan-500/10',
  'text-violet-300 ring-violet-400/30 bg-violet-500/10',
  'text-amber-300 ring-amber-400/30 bg-amber-500/10',
  'text-emerald-300 ring-emerald-400/30 bg-emerald-500/10',
  'text-pink-300 ring-pink-400/30 bg-pink-500/10',
  'text-sky-300 ring-sky-400/30 bg-sky-500/10',
]

function playerMessageColor(playerId: string) {
  let hash = 0
  for (let i = 0; i < playerId.length; i++) hash = (hash * 31 + playerId.charCodeAt(i)) | 0
  return PLAYER_MESSAGE_COLORS[Math.abs(hash) % PLAYER_MESSAGE_COLORS.length]!
}

function inferBotWord(category: string | null, hints: string[], difficulty: string | null) {
  const candidates = WORD_POOL.filter((entry) => !category || entry.category === category)
  const scored = candidates.map((entry) => {
    const scores = hints.map((hint) => hintSimilarity(entry.hint, hint))
    const best = Math.max(...scores, 0)
    const supporting = scores.filter((score) => score >= 0.45).length
    return { word: entry.word, score: best + supporting * 0.18 }
  }).sort((a, b) => b.score - a.score)
  // Uzman bot birden fazla vatandaş ipucuyla desteklenen adayı tercih eder.
  // Daha düşük zorluklarda daima en güçlü adayı kullanmak yerine küçük bir
  // belirsizlik bırakılır; böylece her oyun aynı sonucu üretmez.
  const top = scored[0]
  if (!top) return null
  if (difficulty === 'EASY' && scored[1] && scored[1].score >= top.score - 0.08) return scored[1].word
  return top.word
}

function PlayingPhase({
  room,
  players,
  chat,
  votes,
  myUserId,
  isImpostor,
  currentTurnPlayer,
  isMyTurn,
  hintText,
  setHintText,
  sendHint,
  passTurn,
  timeLeft,
  startVotes,
  castStartVote,
  requestVoteStart,
  guessText,
  setGuessText,
  submitRoleGuess,
  roomId,
  onLeave,
}: {
  room: RoomData
  players: RoomPlayer[]
  chat: ChatMsg[]
  votes: Record<string, string>
  myUserId: string
  isImpostor: boolean
  currentTurnPlayer: RoomPlayer | undefined
  isMyTurn: boolean
  hintText: string
  setHintText: (v: string) => void
  sendHint: () => void
  passTurn: () => void
  timeLeft: number
  startVotes: Record<string, string>
  castStartVote: (choice: 'yes' | 'no') => void
  requestVoteStart: () => void
  guessText: string
  setGuessText: (value: string) => void
  submitRoleGuess: () => void
  roomId: string
  onLeave: () => void
}) {
  const toast = useToast()
  const [tab, setTab] = useState<PlayTab>('hints')
  const [chatText, setChatText] = useState('')
  const [friendRequests, setFriendRequests] = useState<Set<string>>(new Set())
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

  const addFriend = async (player: RoomPlayer) => {
    if (player.is_bot || player.user_id === myUserId || friendRequests.has(player.user_id)) return
    const { error } = await supabase.from('friends').insert({ user_id: myUserId, friend_id: player.user_id, status: 'pending' })
    if (error) toast.error(error.code === '23505' ? 'Arkadaşlık isteği zaten gönderildi' : 'Arkadaşlık isteği gönderilemedi')
    else { setFriendRequests((current) => new Set(current).add(player.user_id)); toast.success(`${player.username} arkadaşlık isteği gönderildi`) }
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
                    msg.message_type === 'system' ? (
                      <div key={msg.id} className="rounded-lg bg-slate-800/50 px-3 py-2 text-center text-xs text-slate-500">{msg.text}</div>
                    ) : (() => {
                      const messagePlayer = players.find((player) => player.username === msg.player_name) ?? players.find((player) => player.user_id === msg.user_id)
                      const isMine = messagePlayer?.user_id === myUserId && !messagePlayer.is_bot
                      const color = playerMessageColor(messagePlayer?.user_id ?? msg.player_name)
                      return (
                        <div key={msg.id} className={cn('flex items-end gap-2', isMine && 'flex-row-reverse')}>
                          <Avatar avatarId={messagePlayer?.avatar ?? 'avatar_default'} size="sm" hideFrame />
                          <div className={cn('max-w-[78%] rounded-2xl px-3 py-2 text-sm ring-1', color, isMine ? 'rounded-br-sm' : 'rounded-bl-sm')}>
                            <p className="mb-0.5 text-[10px] font-bold opacity-80">{isMine ? 'Sen' : msg.player_name}</p>
                            <p className="break-words text-slate-100">{msg.text}</p>
                          </div>
                        </div>
                      )
                    })()
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
            <div className="flex h-full flex-col items-center justify-start px-3 py-3">
              <RoleCard isImpostor={isImpostor} word={room.current_word ?? ''} category={room.current_category ?? ''} />
              {isImpostor && (
                <div className="mt-3 w-full max-w-sm rounded-2xl bg-rose-500/10 p-4 ring-1 ring-rose-500/30">
                  <p className="text-sm font-semibold text-rose-200">Kelimeyi tahmin et</p>
                  <p className="mt-1 text-xs text-slate-400">
                    Sadece kendi sıranda deneyebilirsin. Doğru tahmin edersen anında kazanırsın.
                  </p>
                  {isMyTurn ? (
                    <div className="mt-3 flex gap-2">
                      <input
                        value={guessText}
                        onChange={(event) => setGuessText(event.target.value)}
                        onKeyDown={(event) => event.key === 'Enter' && submitRoleGuess()}
                        placeholder="Tahminin..."
                        maxLength={40}
                        aria-label="Rolüm kelime tahmini"
                        className="min-w-0 flex-1 rounded-xl bg-slate-900 px-3 py-2.5 text-sm ring-1 ring-rose-500/30 focus:outline-none focus:ring-rose-400"
                      />
                      <Button variant="danger" onClick={submitRoleGuess} disabled={!guessText.trim()}>
                        Tahmin Et
                      </Button>
                    </div>
                  ) : (
                    <p className="mt-3 rounded-lg bg-slate-900/60 px-3 py-2 text-center text-xs text-slate-500">
                      Sıran geldiğinde tahmin alanı açılacak.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ─── Oylama sekmesi ──────────────────────────────────────── */}
          {tab === 'vote' && (
            <div className="flex h-full flex-col px-4 py-3 overflow-y-auto">
              <div className="rounded-2xl bg-slate-900 p-4 ring-1 ring-indigo-500/30">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-300" />
                  <p className="font-semibold text-slate-100">Oylamaya geçilsin mi?</p>
                </div>
                {!room.vote_requested ? (
                  <>
                    <p className="mt-1 text-xs text-slate-400">Oylama kendiliğinden başlamaz. Host teklif gönderdiğinde herkes karar verir.</p>
                    {room.host_id === myUserId ? (
                      <Button variant="danger" fullWidth className="mt-3" onClick={requestVoteStart}>
                        <AlertTriangle className="h-4 w-4" /> Oylama Teklifi Gönder
                      </Button>
                    ) : (
                      <p className="mt-3 text-center text-xs text-slate-500">Host oylama teklifini göndermeyi bekliyor...</p>
                    )}
                  </>
                ) : (
                  <>
                    <p className="mt-1 text-xs text-slate-400">Tüm oyuncular karar verdikten sonra çoğunluk sonucu uygulanır.</p>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <Button variant="success" disabled={!!startVotes[myUserId]} onClick={() => castStartVote('yes')}>
                        <Check className="h-4 w-4" /> Evet
                      </Button>
                      <Button variant="secondary" disabled={!!startVotes[myUserId]} onClick={() => castStartVote('no')}>
                        Hayır
                      </Button>
                    </div>
                    <p className="mt-3 text-center text-xs text-slate-500">
                      {players.filter((p) => startVotes[p.user_id]).length}/{players.length} karar verdi
                      {startVotes[myUserId] && ` · ${startVotes[myUserId] === '__START_YES__' ? 'Evet dedin' : 'Hayır dedin'}`}
                    </p>
                  </>
                )}
              </div>
              <div className="mt-4 space-y-2">
                <p className="text-xs text-slate-500">Mevcut ipuçları:</p>
                {Object.keys(votes).length === 0 ? (
                  <p className="text-xs text-slate-600">Henüz ipucu oyu yok</p>
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
                        {!p.is_bot && p.user_id !== myUserId && <button type="button" onClick={() => void addFriend(p)} className="ml-auto inline-flex min-h-8 items-center gap-1 rounded-lg bg-cyan-500/10 px-2 text-[10px] text-cyan-300 hover:bg-cyan-500/20" disabled={friendRequests.has(p.user_id)}><UserPlus className="h-3 w-3" />{friendRequests.has(p.user_id) ? 'Gönderildi' : 'Ekle'}</button>}
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
      <div className="shrink-0 border-t border-indigo-400/15 bg-slate-900 px-2 py-2 shadow-[0_-8px_24px_rgba(2,6,23,0.35)]">
        <div className="mx-auto flex w-full max-w-md items-center justify-around">
          {tabs.map((t) => {
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  'group relative flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] font-medium transition-colors',
                  tab === t.id ? 'bg-indigo-500/15 text-indigo-200' : 'text-slate-500 hover:bg-slate-800 hover:text-slate-300',
                )}
              >
                {tab === t.id && <span className="absolute -top-2 h-1 w-8 rounded-full bg-linear-to-r from-cyan-400 to-indigo-400" />}
                <span className={cn('relative flex h-8 w-8 items-center justify-center rounded-xl transition-transform', tab === t.id ? 'scale-110 bg-slate-950/30 shadow-[0_0_16px_rgba(99,102,241,0.35)]' : 'opacity-70 group-hover:opacity-100')}>
                  <img src={`/nav-icons/${t.id}.png`} alt="" aria-hidden="true" className="h-8 w-8 object-contain" />
                </span>
                {t.label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
