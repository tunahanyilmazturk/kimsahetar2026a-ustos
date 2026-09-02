const LAST_ROOM_KEY = 'sahtekar:last-online-room'

export interface SavedOnlineRoom {
  roomId: string
  roomCode: string
  savedAt: number
}

export function rememberOnlineRoom(roomId: string, roomCode: string) {
  localStorage.setItem(LAST_ROOM_KEY, JSON.stringify({ roomId, roomCode, savedAt: Date.now() } satisfies SavedOnlineRoom))
}

export function getRememberedOnlineRoom(): SavedOnlineRoom | null {
  try {
    const saved = JSON.parse(localStorage.getItem(LAST_ROOM_KEY) ?? 'null') as Partial<SavedOnlineRoom> | null
    if (!saved?.roomId || !saved.roomCode) return null
    return { roomId: saved.roomId, roomCode: saved.roomCode, savedAt: saved.savedAt ?? 0 }
  } catch {
    return null
  }
}

export function clearRememberedOnlineRoom() {
  localStorage.removeItem(LAST_ROOM_KEY)
}
