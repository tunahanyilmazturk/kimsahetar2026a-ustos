import { useCallback, useEffect, useState } from 'react'
import { profileApi, statsApi, inventoryApi } from '../lib/profileApi'
import type { Profile, Stats, Inventory } from '../types'

/**
 * Yerel profil hook'u — profile + stats + inventory'yi tek yerden yönetir.
 * Storage değişikliklerini cross-tab `storage` event ile senkronize eder.
 *
 * Backend eklendiğinde sadece `profileApi`/`statsApi`/`inventoryApi` değişecek,
 * bu hook ve tüketicileri aynı kalır.
 */
export function useProfile() {
  const [profile, setProfile] = useState<Profile>(() => profileApi.get())
  const [stats, setStats] = useState<Stats>(() => statsApi.get())
  const [inventory, setInventory] = useState<Inventory>(() => inventoryApi.get())

  const refresh = useCallback(() => {
    setProfile(profileApi.get())
    setStats(statsApi.get())
    setInventory(inventoryApi.get())
  }, [])

  // Cross-tab senkronizasyon
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key && e.key.startsWith('sahtekar:')) refresh()
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [refresh])

  const updateProfile = useCallback((patch: Partial<Profile>) => {
    const next = profileApi.update(patch)
    setProfile(next)
    return next
  }, [])

  const addCoins = useCallback((delta: number) => {
    const ok = profileApi.addCoins(delta)
    if (ok) setProfile(profileApi.get())
    return ok
  }, [])

  const addXp = useCallback((amount: number) => {
    const r = profileApi.addXp(amount)
    setProfile(profileApi.get())
    return r
  }, [])

  const buyAvatar = useCallback((avatarId: string, price: number) => {
    const r = inventoryApi.buyAvatar(avatarId, price)
    if (r.ok) {
      setProfile(profileApi.get())
      setInventory(inventoryApi.get())
    }
    return r
  }, [])

  const buyFrame = useCallback((frameId: string, price: number) => {
    const r = inventoryApi.buyFrame(frameId, price)
    if (r.ok) {
      setProfile(profileApi.get())
      setInventory(inventoryApi.get())
    }
    return r
  }, [])

  const equipAvatar = useCallback((avatarId: string) => {
    const ok = inventoryApi.equipAvatar(avatarId)
    if (ok) setInventory(inventoryApi.get())
    return ok
  }, [])

  const equipFrame = useCallback((frameId: string | null) => {
    const ok = inventoryApi.equipFrame(frameId)
    if (ok) setInventory(inventoryApi.get())
    return ok
  }, [])

  return {
    profile,
    stats,
    inventory,
    refresh,
    updateProfile,
    addCoins,
    addXp,
    buyAvatar,
    buyFrame,
    equipAvatar,
    equipFrame,
  }
}
