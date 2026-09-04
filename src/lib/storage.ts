export const SESSION_KEY = 'play_my_playlist_session'

export interface SavedSession {
  roomCode: string
  playerId: string
}

function getStorage(): Storage | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage
    }
    return null
  } catch {
    return null
  }
}

export function saveSession(roomCode: string, playerId: string): void {
  const storage = getStorage()
  if (!storage) return
  const session: SavedSession = { roomCode, playerId }
  storage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function getSession(): SavedSession | null {
  const storage = getStorage()
  if (!storage) return null
  const raw = storage.getItem(SESSION_KEY)
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as Partial<SavedSession>
    if (
      typeof parsed.roomCode === 'string' &&
      parsed.roomCode.length > 0 &&
      typeof parsed.playerId === 'string' &&
      parsed.playerId.length > 0
    ) {
      return { roomCode: parsed.roomCode, playerId: parsed.playerId }
    }
    return null
  } catch {
    return null
  }
}

export function clearSession(): void {
  const storage = getStorage()
  if (!storage) return
  storage.removeItem(SESSION_KEY)
}
