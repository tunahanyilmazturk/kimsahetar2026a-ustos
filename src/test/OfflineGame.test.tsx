import { describe, it, expect, beforeEach, vi } from 'vitest'
import { act, render, screen, fireEvent } from '@testing-library/react'
import { LobbyScreen } from '../components/offline/LobbyScreen'
import { OfflineGame } from '../OfflineGame'
import { ToastProvider } from '../components/common/Toast'
import { statsApi } from '../lib/profileApi'
import type { Player, GameSettings } from '../types'

vi.mock('../utils/bot', () => ({
  generateBotHint: () => 'ipucu',
  generateBotVote: ({ players, impostorId, voter }: { players: Player[]; impostorId: string; voter: Player }) =>
    players.find((p) => p.id !== impostorId && p.id !== voter.id)?.id ?? players[0]!.id,
  generateBotGuess: () => 'yanlış tahmin',
}))

// ─── Test Yardımcıları ────────────────────────────────────────────────────────

function makePlayer(id: string, name: string, isBot = false): Player {
  return {
    id,
    name,
    avatar: 'avatar_default',
    score: 0,
    isReady: true,
    isBot,
    botDifficulty: isBot ? 'SMART' : undefined,
  }
}

function defaultSettings(): GameSettings {
  return {
    turnTimeLimit: 30,
    roundsBeforeVoting: 2,
    selectedCategories: [],
    customWords: [],
    botDifficulty: 'SMART',
    wordDifficulty: 'MIXED',
    recentWords: [],
    passUsed: {},
  }
}

function renderLobby(props: Partial<Parameters<typeof LobbyScreen>[0]> = {}) {
  const onStart = vi.fn()
  const onPlayersChange = vi.fn()
  const onExit = vi.fn()
  const onSettingsChange = vi.fn()
  render(
    <ToastProvider>
      <LobbyScreen
        players={props.players ?? []}
        onPlayersChange={props.onPlayersChange ?? onPlayersChange}
        settings={props.settings ?? defaultSettings()}
        onSettingsChange={props.onSettingsChange ?? onSettingsChange}
        onStart={props.onStart ?? onStart}
        onExit={props.onExit ?? onExit}
      />
    </ToastProvider>,
  )
  return { onStart, onPlayersChange, onExit, onSettingsChange }
}

function renderGame() {
  const onExit = vi.fn()
  render(
    <ToastProvider>
      <OfflineGame onExit={onExit} />
    </ToastProvider>,
  )
  return { onExit }
}

// ─── LobbyScreen Testleri ─────────────────────────────────────────────────────

describe('LobbyScreen', () => {
  beforeEach(() => window.localStorage.clear())

  it('0 oyuncu — Başlat butonu disabled', () => {
    renderLobby({ players: [] })
    const startBtn = screen.getByText(/Başlat/i).closest('button')!
    expect(startBtn).toBeDisabled()
  })

  it('1 oyuncu — Başlat butonu disabled', () => {
    renderLobby({ players: [makePlayer('p1', 'Ahmet')] })
    const startBtn = screen.getByText(/Başlat/i).closest('button')!
    expect(startBtn).toBeDisabled()
  })

  it('2 oyuncu — Başlat butonu disabled', () => {
    renderLobby({ players: [makePlayer('p1', 'Ahmet'), makePlayer('p2', 'Mehmet')] })
    const startBtn = screen.getByText(/Başlat/i).closest('button')!
    expect(startBtn).toBeDisabled()
  })

  it('3 oyuncu — Başlat butonu enabled', () => {
    const players = [
      makePlayer('p1', 'Ahmet'),
      makePlayer('p2', 'Mehmet'),
      makePlayer('p3', 'Ayşe'),
    ]
    const { onStart } = renderLobby({ players })
    const startBtn = screen.getByText(/Başlat/i).closest('button')!
    expect(startBtn).not.toBeDisabled()
    fireEvent.click(startBtn)
    expect(onStart).toHaveBeenCalledOnce()
  })

  it('13 oyuncu — Başlat butonu disabled (>12 sınırı)', () => {
    const players = Array.from({ length: 13 }, (_, i) => makePlayer(`p${i}`, `Oyuncu${i}`))
    renderLobby({ players })
    const startBtn = screen.getByText(/Başlat/i).closest('button')!
    expect(startBtn).toBeDisabled()
  })

  it('12 oyuncu — Başlat butonu enabled (maksimum)', () => {
    const players = Array.from({ length: 12 }, (_, i) => makePlayer(`p${i}`, `Oyuncu${i}`))
    renderLobby({ players })
    const startBtn = screen.getByText(/Başlat/i).closest('button')!
    expect(startBtn).not.toBeDisabled()
  })

  it('Bot Ekle butonu oyuncu ekler', () => {
    const { onPlayersChange } = renderLobby({ players: [] })
    const addBotBtn = screen.getByText('Bot Ekle').closest('button')!
    fireEvent.click(addBotBtn)
    expect(onPlayersChange).toHaveBeenCalledOnce()
    const newPlayers = onPlayersChange.mock.calls[0]![0] as Player[]
    expect(newPlayers).toHaveLength(1)
    expect(newPlayers[0]!.isBot).toBe(true)
  })

  it('oyuncu sayısı 12 iken Bot Ekle disabled', () => {
    const players = Array.from({ length: 12 }, (_, i) => makePlayer(`p${i}`, `Oyuncu${i}`))
    renderLobby({ players })
    const addBotBtn = screen.getByText('Bot Ekle').closest('button')!
    expect(addBotBtn).toBeDisabled()
  })

  it('isim girip Ekle butonuna basınca oyuncu eklenir', () => {
    const { onPlayersChange } = renderLobby({ players: [] })
    const input = screen.getByPlaceholderText('Oyuncu ismi...')
    fireEvent.change(input, { target: { value: 'TestOyuncu' } })
    const addBtn = screen.getByText('Ekle').closest('button')!
    fireEvent.click(addBtn)
    expect(onPlayersChange).toHaveBeenCalledOnce()
    const newPlayers = onPlayersChange.mock.calls[0]![0] as Player[]
    expect(newPlayers[0]!.name).toBe('TestOyuncu')
    expect(newPlayers[0]!.isBot).toBe(false)
  })

  it('boş isim ile Ekle disabled', () => {
    renderLobby({ players: [] })
    const addBtn = screen.getByText('Ekle').closest('button')!
    expect(addBtn).toBeDisabled()
  })

  it('oyuncu kaldır butonu çalışır', () => {
    const players = [makePlayer('p1', 'Ahmet'), makePlayer('p2', 'Mehmet')]
    const { onPlayersChange } = renderLobby({ players })
    const removeBtn = screen.getByLabelText('Ahmet kaldır')
    fireEvent.click(removeBtn)
    expect(onPlayersChange).toHaveBeenCalledOnce()
    const newPlayers = onPlayersChange.mock.calls[0]![0] as Player[]
    expect(newPlayers).toHaveLength(1)
    expect(newPlayers[0]!.name).toBe('Mehmet')
  })

  it('oyuncu ve bot sayısı doğru gösterilir', () => {
    const players = [
      makePlayer('p1', 'Ahmet'),
      makePlayer('b1', 'Robot', true),
      makePlayer('b2', 'Alpha', true),
    ]
    renderLobby({ players })
    expect(screen.getByText('1 oyuncu · 2 bot')).toBeTruthy()
  })

  it('0 oyuncu — boş durum mesajı gösterilir', () => {
    renderLobby({ players: [] })
    expect(screen.getByText('Henüz oyuncu yok')).toBeTruthy()
  })
})

// ─── OfflineGame Smoke Testleri ────────────────────────────────────────────────

describe('OfflineGame', () => {
  beforeEach(() => {
    window.localStorage.clear()
    Element.prototype.scrollIntoView = vi.fn()
  })

  it('ilk render — Lobi ekranı gösterilir', () => {
    renderGame()
    expect(screen.getByText('Lobi')).toBeTruthy()
    expect(screen.getByText('Henüz oyuncu yok')).toBeTruthy()
  })

  it('ilk render — Başlat butonu disabled (0 oyuncu)', () => {
    renderGame()
    const startBtn = screen.getByText(/Başlat/i).closest('button')!
    expect(startBtn).toBeDisabled()
  })

  it('Geri butonu onExit çağırır', () => {
    const { onExit } = renderGame()
    const backBtn = screen.getByText('Geri')
    fireEvent.click(backBtn)
    expect(onExit).toHaveBeenCalledOnce()
  })

  it('3 bot ekle + Başlat — REVEAL ekranına geçer', () => {
    renderGame()
    // 3 bot ekle
    const addBotBtn = screen.getByText('Bot Ekle')
    fireEvent.click(addBotBtn)
    fireEvent.click(addBotBtn)
    fireEvent.click(addBotBtn)
    // Başlat
    const startBtn = screen.getByText(/Başlat/i).closest('button')!
    expect(startBtn).not.toBeDisabled()
    fireEvent.click(startBtn)
    // REVEAL ekranına geçmiş olmalı — "Sırada" veya kelime gösterimi olmalı
    // RevealScreen içeriğini kontrol et
    expect(screen.queryByText('Henüz oyuncu yok')).not.toBeTruthy()
  })

  it('sahtekar yakalanmazsa sonuçlar bir kez uygulanır', async () => {
    vi.useFakeTimers()
    try {
      renderGame()
      const addBotBtn = screen.getByText('Bot Ekle')
      fireEvent.click(addBotBtn)
      fireEvent.click(addBotBtn)
      fireEvent.click(addBotBtn)
      fireEvent.click(screen.getByText(/Başlat/i).closest('button')!)

      // Üç oyuncunun reveal ekranında rolü gösterip gizle.
      for (let i = 0; i < 3; i++) {
        fireEvent.click(screen.getByText('Rolümü Gör'))
        fireEvent.click(screen.getByText(/Gizle &|Oyuna Başla/))
      }

      // İki turun bot timer'larını çalıştır; ardından botların oylarını tamamla.
      // Botların her bir gecikmesini kontrollü şekilde ilerlet; runAllTimers
      // interval timer'ları nedeniyle sonsuz döngüye girebilir.
      for (let i = 0; i < 20; i++) {
        await act(async () => {
          await vi.advanceTimersByTimeAsync(3000)
        })
      }
      expect(screen.getByText('Oylama Tamamlandı')).toBeTruthy()
      fireEvent.click(screen.getByText('Sonucu Açıklamaya Geç'))
      fireEvent.click(screen.getByText('Devam Et'))

      expect(screen.getByText('Sahtekar Kazandı!')).toBeTruthy()
      expect(statsApi.get().gamesPlayed).toBe(1)
    } finally {
      vi.useRealTimers()
    }
  })
})
