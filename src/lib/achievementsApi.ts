import { storage, STORAGE_KEYS } from './storage'
import { inventoryApi } from './profileApi'
import { ACHIEVEMENTS, ACHIEVEMENT_MAP } from '../config/achievements'
import type { Stats, UnlockedAchievements, Achievement } from '../types'

export const achievementsApi = {
  get(): UnlockedAchievements {
    return storage.get<UnlockedAchievements>(STORAGE_KEYS.ACHIEVEMENTS, {})
  },

  /** Stats'a göre yeni unlock edilen başarım ID'lerini döndürür. */
  check(stats: Stats): string[] {
    const unlocked = this.get()
    const newlyUnlocked: string[] = []
    for (const a of ACHIEVEMENTS) {
      if (unlocked[a.id]) continue
      const value = stats[a.condition.stat] ?? 0
      if (value >= a.condition.value) {
        newlyUnlocked.push(a.id)
      }
    }
    if (newlyUnlocked.length > 0) {
      const next = { ...unlocked }
      for (const id of newlyUnlocked) {
        next[id] = Date.now()
        const reward = ACHIEVEMENT_MAP[id]?.reward
        if (reward) {
          const inventory = inventoryApi.get()
          if (reward.type === 'avatar' && !inventory.avatars.includes(reward.id)) {
            inventoryApi.addAvatarReward(reward.id)
          }
          if (reward.type === 'frame' && !inventory.frames.includes(reward.id)) {
            inventoryApi.addFrameReward(reward.id)
          }
        }
      }
      storage.set(STORAGE_KEYS.ACHIEVEMENTS, next)
    }
    return newlyUnlocked
  },

  isUnlocked(id: string): boolean {
    return Boolean(this.get()[id])
  },

  getAchievement(id: string): Achievement | undefined {
    return ACHIEVEMENT_MAP[id]
  },

  all(): Achievement[] {
    return ACHIEVEMENTS
  },

  reset(): void {
    storage.set(STORAGE_KEYS.ACHIEVEMENTS, {})
  },
}
