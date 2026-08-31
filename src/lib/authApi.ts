import { storage, STORAGE_KEYS } from './storage'

interface AuthRecord { username: string; password: string; playerId: string }

function records(): AuthRecord[] { return storage.get<AuthRecord[]>(STORAGE_KEYS.AUTH, []) }

export const authApi = {
  current(): AuthRecord | null { return storage.get<AuthRecord | null>('sahtekar:session', null) },
  login(username: string, password: string): { ok: boolean; error?: string } {
    const user = records().find((r) => r.username.toLocaleLowerCase('tr-TR') === username.toLocaleLowerCase('tr-TR'))
    if (!user || user.password !== password) return { ok: false, error: 'Kullanıcı adı veya şifre hatalı' }
    storage.set('sahtekar:session', user); return { ok: true }
  },
  register(username: string, password: string, playerId: string): { ok: boolean; error?: string } {
    const all = records()
    if (all.some((r) => r.username.toLocaleLowerCase('tr-TR') === username.toLocaleLowerCase('tr-TR'))) return { ok: false, error: 'Bu kullanıcı adı zaten kayıtlı' }
    const user = { username, password, playerId }; storage.set(STORAGE_KEYS.AUTH, [...all, user]); storage.set('sahtekar:session', user); return { ok: true }
  },
}
