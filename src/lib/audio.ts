import { settingsApi } from './profileApi'

type SoundName = 'click' | 'success' | 'error' | 'timer' | 'reveal' | 'vote' | 'win'

let audioContext: AudioContext | null = null
let musicGain: GainNode | null = null
let musicTimer: number | null = null

function getContext(): AudioContext | null {
  if (typeof window === 'undefined' || !('AudioContext' in window)) return null
  audioContext ??= new AudioContext()
  if (audioContext.state === 'suspended') void audioContext.resume()
  return audioContext
}

function tone(frequency: number, duration: number, type: OscillatorType, volume: number, delay = 0) {
  const ctx = getContext()
  if (!ctx) return
  const now = ctx.currentTime + delay
  const oscillator = ctx.createOscillator()
  const gain = ctx.createGain()
  oscillator.type = type
  oscillator.frequency.setValueAtTime(frequency, now)
  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.exponentialRampToValueAtTime(volume, now + 0.012)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)
  oscillator.connect(gain).connect(ctx.destination)
  oscillator.start(now)
  oscillator.stop(now + duration + 0.02)
}

export const audioApi = {
  play(name: SoundName = 'click') {
    if (!settingsApi.get().sound) return
    const sounds: Record<SoundName, () => void> = {
      click: () => tone(520, 0.055, 'sine', 0.035),
      success: () => { tone(523, 0.1, 'sine', 0.045); tone(784, 0.16, 'sine', 0.04, 0.08) },
      error: () => { tone(180, 0.12, 'sawtooth', 0.025); tone(140, 0.16, 'sawtooth', 0.02, 0.1) },
      timer: () => tone(740, 0.08, 'square', 0.025),
      reveal: () => { tone(330, 0.14, 'triangle', 0.035); tone(494, 0.24, 'triangle', 0.04, 0.12) },
      vote: () => tone(260, 0.12, 'triangle', 0.035),
      win: () => { tone(523, 0.12, 'sine', 0.045); tone(659, 0.12, 'sine', 0.045, 0.1); tone(784, 0.25, 'sine', 0.05, 0.2) },
    }
    sounds[name]()
  },
  haptic(pattern: number | number[] = 10) {
    if (settingsApi.get().haptics && typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(pattern)
  },
  sync(settings = settingsApi.get()) {
    if (settings.music) this.startMusic()
    else this.stopMusic()
  },
  startMusic() {
    if (musicTimer || !settingsApi.get().music) return
    const ctx = getContext()
    if (!ctx) return
    musicGain = ctx.createGain()
    musicGain.gain.value = 0.012
    musicGain.connect(ctx.destination)
    const playNote = () => {
      if (!musicGain || !settingsApi.get().music) return
      const notes = [196, 247, 294, 247]
      notes.forEach((note, index) => {
        const oscillator = ctx.createOscillator()
        oscillator.type = 'sine'
        oscillator.frequency.value = note
        const gain = ctx.createGain()
        gain.gain.setValueAtTime(0.0001, ctx.currentTime + index * 0.7)
        gain.gain.exponentialRampToValueAtTime(0.22, ctx.currentTime + index * 0.7 + 0.08)
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + index * 0.7 + 0.62)
        oscillator.connect(gain).connect(musicGain!)
        oscillator.start(ctx.currentTime + index * 0.7)
        oscillator.stop(ctx.currentTime + index * 0.7 + 0.68)
      })
    }
    playNote()
    musicTimer = window.setInterval(playNote, 2800)
  },
  stopMusic() {
    if (musicTimer) window.clearInterval(musicTimer)
    musicTimer = null
    musicGain?.disconnect()
    musicGain = null
  },
}
