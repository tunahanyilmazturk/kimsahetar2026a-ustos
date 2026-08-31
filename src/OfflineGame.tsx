import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { LobbyScreen } from './components/offline/LobbyScreen'
import { RevealScreen } from './components/offline/RevealScreen'
import { PlayingScreen } from './components/offline/PlayingScreen'
import { VotingScreen } from './components/offline/VotingScreen'
import { FinishedScreen } from './components/offline/FinishedScreen'
import { useSettings } from './hooks/useSettings'
import { useToast } from './components/common/Toast'
import { pickWord, pickImpostor, updateRecentWords, randomId } from './utils/wordPool'
import { generateBotHint, generateBotVote, generateBotGuess } from './utils/bot'
import { CATEGORIES } from './constants'
import { applyGameResult } from './lib/scoreSystem'
import { questsApi } from './lib/questsApi'
import { achievementsApi } from './lib/achievementsApi'
import { statsApi } from './lib/profileApi'
import type { Player, GameSettings, OfflineState, WordEntry, ChatMessage, Winner, Award } from './types'

export interface OfflineGameProps {
  onExit: () => void
}

function defaultSettings(appSettings: ReturnType<typeof useSettings>['settings']): GameSettings {
  return {
    turnTimeLimit: appSettings.defaultTurnTimeLimit,
    roundsBeforeVoting: appSettings.defaultRoundsBeforeVoting,
    selectedCategories: [...CATEGORIES],
    customWords: [],
    botDifficulty: appSettings.defaultBotDifficulty,
    wordDifficulty: appSettings.defaultWordDifficulty,
    recentWords: [],
    passUsed: {},
  }
}

export function OfflineGame({ onExit }: OfflineGameProps) {
  const { settings: appSettings } = useSettings()
  const toast = useToast()
  const [state, setState] = useState<OfflineState>('LOBBY')
  const [players, setPlayers] = useState<Player[]>([])
  const [settings, setSettings] = useState<GameSettings>(() => defaultSettings(appSettings))

  // Reveal & oyun durumu
  const [revealIndex, setRevealIndex] = useState(0)
  const [impostorId, setImpostorId] = useState<string | null>(null)
  const [currentWord, setCurrentWord] = useState<WordEntry | null>(null)

  // Playing durumu
  const [turnIndex, setTurnIndex] = useState(0)
  const [round, setRound] = useState(1)
  const [chat, setChat] = useState<ChatMessage[]>([])
  const [hintedThisRound, setHintedThisRound] = useState<Set<string>>(new Set())
  const [passedThisRound, setPassedThisRound] = useState<Set<string>>(new Set())

  // Voting & Finished durumu
  const [votes, setVotes] = useState<Record<string, string>>({})
  const [votedImpostorId, setVotedImpostorId] = useState<string | null>(null)
  const [impostorGuess, setImpostorGuess] = useState<string | null>(null)
  const [winner, setWinner] = useState<Winner | null>(null)
  const [awards, setAwards] = useState<Record<string, Award>>({})

  const updateSettings = useCallback((patch: Partial<GameSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }))
  }, [])

  // ─── Oyun Başlatma ──────────────────────────────────────────────────────────
  const startGame = useCallback(() => {
    if (players.length < 3) return

    const word = pickWord({
      categories: settings.selectedCategories,
      difficulty: settings.wordDifficulty,
      recentWords: settings.recentWords,
      customWords: settings.customWords,
    })

    const impostor = pickImpostor(players.map((p) => p.id))
    const updatedRecent = updateRecentWords(settings.recentWords, word.word)

    setSettings((prev) => ({ ...prev, recentWords: updatedRecent, passUsed: {} }))
    setImpostorId(impostor)
    setCurrentWord(word)
    setRevealIndex(0)
    setTurnIndex(0)
    setRound(1)
    setChat([])
    setHintedThisRound(new Set())
    setPassedThisRound(new Set())
    setVotes({})
    setVotedImpostorId(null)
    setImpostorGuess(null)
    setWinner(null)
    setAwards({})
    setState('REVEAL')
  }, [players, settings])

  // ─── Reveal → Sonraki Oyuncu ────────────────────────────────────────────────
  const nextReveal = useCallback(() => {
    if (revealIndex >= players.length - 1) {
      setState('PLAYING')
    } else {
      setRevealIndex((i) => i + 1)
    }
  }, [revealIndex, players.length])

  // ─── Playing: Tur ilerletme ─────────────────────────────────────────────────
  const advanceTurn = useCallback(() => {
    setTurnIndex((curTurn) => {
      const nextTurn = curTurn + 1
      if (nextTurn >= players.length) {
        setRound((r) => {
          const nextRound = r + 1
          if (nextRound > settings.roundsBeforeVoting) {
            setState('VOTING')
          }
          return nextRound
        })
        setHintedThisRound(new Set())
        setPassedThisRound(new Set())
        return 0
      }
      return nextTurn
    })
  }, [players.length, settings.roundsBeforeVoting])

  // ─── Playing: İpucu gönder ──────────────────────────────────────────────────
  const handleSendHint = useCallback(
    (text: string) => {
      const player = players[turnIndex]
      if (!player || !currentWord) return

      const msg: ChatMessage = {
        id: randomId('m_'),
        playerId: player.id,
        playerName: player.name,
        text,
        timestamp: Date.now(),
      }
      setChat((prev) => [...prev, msg])
      setHintedThisRound((prev) => new Set(prev).add(player.id))
      advanceTurn()
    },
    [players, turnIndex, currentWord, advanceTurn],
  )

  // ─── Playing: Pas geç ───────────────────────────────────────────────────────
  const handlePass = useCallback(() => {
    const player = players[turnIndex]
    if (!player) return

    setSettings((prev) => ({
      ...prev,
      passUsed: { ...prev.passUsed, [player.id]: true },
    }))
    setPassedThisRound((prev) => new Set(prev).add(player.id))
    advanceTurn()
  }, [players, turnIndex, advanceTurn])

  // ─── Playing: Oylama başlat ─────────────────────────────────────────────────
  const handleStartVoting = useCallback(() => {
    setState('VOTING')
  }, [])

  // ─── Bot otomasyonu: Playing ────────────────────────────────────────────────
  // Bot sırası geldiğinde otomatik ipucu üret ve gönder.
  // PlayingScreen 'pass' phase'ini atlayarak direkt 'write' phase'e geçer.
  const botAutoHintRef = useRef(false)
  useEffect(() => {
    if (state !== 'PLAYING' || !currentWord) return
    const player = players[turnIndex]
    if (!player || !player.isBot) {
      botAutoHintRef.current = false
      return
    }
    // Bot zaten bu tur ipucu/pas verdiyse atla
    if (hintedThisRound.has(player.id) || passedThisRound.has(player.id)) return

    // Çift tetiklemeyi önle
    if (botAutoHintRef.current) return
    botAutoHintRef.current = true

    const isImpostor = player.id === impostorId
    const difficulty = player.botDifficulty ?? settings.botDifficulty

    // 1.5-3sn gecikme ile bot ipucu verir (doğal his)
    const delay = 1500 + Math.random() * 1500
    const timer = setTimeout(() => {
      const hint = generateBotHint({
        player,
        isImpostor,
        word: currentWord,
        previousHints: chat,
        difficulty,
      })
      handleSendHint(hint)
      botAutoHintRef.current = false
    }, delay)

    return () => {
      clearTimeout(timer)
      botAutoHintRef.current = false
    }
  }, [state, turnIndex, players, currentWord, impostorId, settings.botDifficulty, chat, hintedThisRound, passedThisRound, handleSendHint])

  // ─── Voting: Oy ver ─────────────────────────────────────────────────────────
  const handleVote = useCallback((voterId: string, targetId: string) => {
    setVotes((prev) => ({ ...prev, [voterId]: targetId }))
  }, [])

  // ─── Bot otomasyonu: Voting ─────────────────────────────────────────────────
  // VotingScreen 'pass' phase'inde bot oyunculara sıra gelince otomatik oy verir.
  // VotingScreen gerçek oyuncu için 'pass' → 'vote' akışını yönetir; botlar için
  // ise bu useEffect direkt oy verir (pass phase'i botlar için atlanır).
  useEffect(() => {
    if (state !== 'VOTING' || !impostorId) return
    // Henüz oy vermemiş botları bul
    const botsToVote = players.filter((p) => p.isBot && !votes[p.id])
    if (botsToVote.length === 0) return

    // İlk botu seç (sırayla)
    const bot = botsToVote[0]!
    const difficulty = bot.botDifficulty ?? settings.botDifficulty
    const isImpostor = bot.id === impostorId

    const delay = 1000 + Math.random() * 1500
    const timer = setTimeout(() => {
      const targetId = generateBotVote({
        voter: bot,
        players,
        isImpostor,
        impostorId,
        chat,
        difficulty,
      })
      handleVote(bot.id, targetId)
    }, delay)

    return () => clearTimeout(timer)
  }, [state, players, votes, impostorId, chat, settings.botDifficulty, handleVote])

  // ─── Voting: Sonuç hesapla ──────────────────────────────────────────────────
  const handleVotingFinish = useCallback(() => {
    if (!impostorId) return

    // En çok oy alan oyuncuyu bul
    const voteCount: Record<string, number> = {}
    for (const targetId of Object.values(votes)) {
      voteCount[targetId] = (voteCount[targetId] ?? 0) + 1
    }
    const sorted = Object.entries(voteCount).sort((a, b) => b[1] - a[1])
    const topVotedId = sorted[0]?.[0] ?? null

    setVotedImpostorId(topVotedId)

    // Eğer sahtekar yakalandıysa, sahtekara kelime tahmini şansı verilir (FinishedScreen'de)
    // Eğer yakalanmadıysa, sahtekar kazanır
    if (topVotedId === impostorId) {
      // Sahtekar yakalandı — kelime tahmini FinishedScreen'de yapılacak
      setWinner('PLAYERS') // geçici, tahmine göre güncellenecek
    } else {
      // Sahtekar yakalanmadı
      setWinner('IMPOSTOR')
    }
    setState('FINISHED')
  }, [votes, impostorId])

  // ─── Finished: Sahtekar kelime tahmini ──────────────────────────────────────
  const handleImpostorGuess = useCallback(
    (guess: string) => {
      setImpostorGuess(guess)
      if (!currentWord || !impostorId) return

      const guessCorrect = guess.trim().toLowerCase() === currentWord.word.toLowerCase()
      // Sahtekar yakalandı (votedImpostorId === impostorId)
      // Eğer kelimeyi de bilirse → IMPOSTOR kazanır
      // Bilmezse → PLAYERS kazanır
      if (guessCorrect) {
        setWinner('IMPOSTOR')
      } else {
        setWinner('PLAYERS')
      }

      // Skor hesapla ve ödülleri oluştur
      computeResults(guessCorrect)
    },
    [currentWord, impostorId, votedImpostorId],
  )

  // ─── Skor & ödül hesaplama ──────────────────────────────────────────────────
  const computeResults = useCallback(
    (guessCorrect: boolean) => {
      if (!impostorId || !winner) return

      // Winner'ı geçici olarak ayarla (guessCorrect'e göre)
      const finalWinner: Winner = guessCorrect ? 'IMPOSTOR' : 'PLAYERS'

      const newAwards: Record<string, Award> = {}
      const localPlayer = players[0] // İlk oyuncu yerel profil (offline modda)

      // Her oyuncu için skor uygula
      for (const player of players) {
        const isLocal = player.id === localPlayer?.id
        const result = applyGameResult({
          player,
          winner: finalWinner,
          impostorId,
          isLocal,
        })

        // Ödül rozeti oluştur
        const isImpostor = player.id === impostorId
        const playerWon = (isImpostor && finalWinner === 'IMPOSTOR') || (!isImpostor && finalWinner === 'PLAYERS')

        if (playerWon) {
          if (isImpostor) {
            newAwards[player.id] = {
              title: 'Sahtekar Zaferi',
              emoji: '🎭',
              desc: `Sahtekar olarak kazandı! +${result.coins} coin, +${result.xp} XP`,
            }
          } else {
            newAwards[player.id] = {
              title: 'Dedektif Zaferi',
              emoji: '🔍',
              desc: `Sahtekarı yakaladı! +${result.coins} coin, +${result.xp} XP`,
            }
          }
        } else {
          newAwards[player.id] = {
            title: 'Katılım',
            emoji: '🎮',
            desc: `+${result.coins} coin, +${result.xp} XP`,
          }
        }

        if (result.leveledUp) {
          newAwards[player.id] = {
            ...newAwards[player.id]!,
            title: `${newAwards[player.id]!.title} · Seviye Atladı!`,
            emoji: '⭐',
          }
        }
      }

      // Yerel oyuncu için görev & başarım ilerlemesi
      const stats = statsApi.get()
      questsApi.addProgress('gamesPlayed', 1)
      if (finalWinner === 'PLAYERS') {
        questsApi.addProgress('wins', 1)
        questsApi.addProgress('winsAsPlayer', 1)
      } else {
        questsApi.addProgress('winsAsImpostor', 1)
      }

      // Başarım kontrolü
      const newAchievements = achievementsApi.check(stats)
      if (newAchievements.length > 0) {
        for (const id of newAchievements) {
          const ach = achievementsApi.getAchievement(id)
          if (ach) {
            toast.success(`Başarım: ${ach.emoji} ${ach.title}!`)
          }
        }
      }

      setAwards(newAwards)
    },
    [players, impostorId, winner, toast],
  )

  // ─── Bot otomasyonu: Finished (sahtekar bot kelime tahmini) ─────────────────
  // Eğer sahtekar yakalandıysa ve sahtekar bot ise, otomatik kelime tahmini yap.
  useEffect(() => {
    if (state !== 'FINISHED' || !impostorId || !currentWord) return
    // Sadece sahtekar yakalandıysa (votedImpostorId === impostorId) ve winner henüz
    // kesinleşmediyse (PLAYERS geçici) ve impostorGuess henüz yapılmadıysa
    if (votedImpostorId !== impostorId) return
    if (impostorGuess !== null) return

    const impostor = players.find((p) => p.id === impostorId)
    if (!impostor?.isBot) return // sadece bot sahtekar için otomatik

    const difficulty = impostor.botDifficulty ?? settings.botDifficulty
    const delay = 2000 + Math.random() * 2000 // 2-4sn bekle (reveal phase'i göster)
    const timer = setTimeout(() => {
      const guess = generateBotGuess({
        impostor,
        word: currentWord,
        chat,
        difficulty,
      })
      handleImpostorGuess(guess)
    }, delay)

    return () => clearTimeout(timer)
  }, [state, impostorId, currentWord, votedImpostorId, impostorGuess, players, settings.botDifficulty, chat, handleImpostorGuess])

  // ─── Tekrar Oyna ────────────────────────────────────────────────────────────
  const handlePlayAgain = useCallback(() => {
    // Aynı oyuncularla yeni oyun başlat
    if (players.length < 3) {
      setState('LOBBY')
      return
    }
    startGame()
  }, [players, startGame])

  // ─── Render ─────────────────────────────────────────────────────────────────
  const currentWordEntry = useMemo(() => currentWord, [currentWord])
  const currentPlayer = players[turnIndex]
  const isCurrentImpostor = currentPlayer?.id === impostorId

  if (state === 'LOBBY') {
    return (
      <LobbyScreen
        players={players}
        onPlayersChange={setPlayers}
        settings={settings}
        onSettingsChange={updateSettings}
        onStart={startGame}
        onExit={onExit}
      />
    )
  }

  if (state === 'REVEAL' && currentWordEntry) {
    return (
      <RevealScreen
        players={players}
        currentIndex={revealIndex}
        isImpostor={players[revealIndex]?.id === impostorId}
        word={currentWordEntry.word}
        category={currentWordEntry.category}
        hint={currentWordEntry.hint}
        onNext={nextReveal}
      />
    )
  }

  if (state === 'PLAYING' && currentWordEntry && currentPlayer) {
    return (
      <PlayingScreen
        players={players}
        turnIndex={turnIndex}
        round={round}
        chat={chat}
        settings={settings}
        isCurrentImpostor={isCurrentImpostor ?? false}
        currentWord={currentWordEntry.word}
        currentHint={currentWordEntry.hint}
        currentCategory={currentWordEntry.category}
        hintedThisRound={hintedThisRound}
        passedThisRound={passedThisRound}
        passUsed={settings.passUsed}
        canStartVoting={round >= 1}
        onSendHint={handleSendHint}
        onPass={handlePass}
        onStartVoting={handleStartVoting}
        onExit={onExit}
      />
    )
  }

  if (state === 'VOTING') {
    return (
      <VotingScreen
        players={players}
        votes={votes}
        onVote={handleVote}
        onFinish={handleVotingFinish}
        onExit={onExit}
      />
    )
  }

  if (state === 'FINISHED' && currentWordEntry && impostorId && winner) {
    return (
      <FinishedScreen
        players={players}
        impostorId={impostorId}
        word={currentWordEntry.word}
        category={currentWordEntry.category}
        winner={winner}
        votedImpostorId={votedImpostorId}
        impostorGuess={impostorGuess}
        awards={awards}
        onImpostorGuess={handleImpostorGuess}
        onPlayAgain={handlePlayAgain}
        onExit={onExit}
      />
    )
  }

  // Fallback
  return (
    <div className="min-h-svh w-full bg-slate-950 text-slate-100 flex items-center justify-center">
      <button onClick={onExit} className="text-slate-400 hover:text-slate-100">
        Ana Menüye Dön
      </button>
    </div>
  )
}
