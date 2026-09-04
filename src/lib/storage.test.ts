// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearSession,
  getSession,
  saveSession,
  SESSION_KEY,
} from '@/lib/storage'

function createLocalStorageMock(): Storage {
  const store = new Map<string, string>()
  const api = {
    get length() {
      return store.size
    },
    clear() {
      store.clear()
    },
    getItem(key: string): string | null {
      return store.has(key) ? store.get(key)! : null
    },
    key(index: number): string | null {
      return Array.from(store.keys())[index] ?? null
    },
    removeItem(key: string) {
      store.delete(key)
    },
    setItem(key: string, value: string) {
      store.set(key, String(value))
    },
  }
  return api as Storage
}

beforeEach(() => {
  Object.defineProperty(window, 'localStorage', {
    value: createLocalStorageMock(),
    configurable: true,
    writable: true,
  })
})

describe('session storage', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('returns null when no session has been saved', () => {
    expect(getSession()).toBeNull()
  })

  it('saves and retrieves a session', () => {
    saveSession('ABCD', 'player-1')
    expect(getSession()).toEqual({ roomCode: 'ABCD', playerId: 'player-1' })
  })

  it('persists the raw JSON under the expected key', () => {
    saveSession('WXYZ', 'player-2')
    expect(window.localStorage.getItem(SESSION_KEY)).toBe(
      JSON.stringify({ roomCode: 'WXYZ', playerId: 'player-2' }),
    )
  })

  it('overwrites an existing session', () => {
    saveSession('ABCD', 'player-1')
    saveSession('EFGH', 'player-3')
    expect(getSession()).toEqual({ roomCode: 'EFGH', playerId: 'player-3' })
  })

  it('clears an existing session', () => {
    saveSession('ABCD', 'player-1')
    clearSession()
    expect(getSession()).toBeNull()
    expect(window.localStorage.getItem(SESSION_KEY)).toBeNull()
  })

  it('ignores malformed JSON in storage', () => {
    window.localStorage.setItem(SESSION_KEY, '{not valid json')
    expect(getSession()).toBeNull()
  })

  it('ignores a session object with missing fields', () => {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify({ roomCode: 'ABCD' }))
    expect(getSession()).toBeNull()

    window.localStorage.setItem(SESSION_KEY, JSON.stringify({ playerId: 'p1' }))
    expect(getSession()).toBeNull()
  })

  it('ignores an empty session object', () => {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify({}))
    expect(getSession()).toBeNull()
  })

  it('normalizes a stored session with extra fields', () => {
    window.localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ roomCode: 'ABCD', playerId: 'player-1', extra: true }),
    )
    expect(getSession()).toEqual({ roomCode: 'ABCD', playerId: 'player-1' })
  })
})
