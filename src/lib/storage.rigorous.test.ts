// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { clearSession, getSession, saveSession, SESSION_KEY } from '@/lib/storage'

function mockStore() {
  const m = new Map<string, string>()
  return {
    get length() { return m.size },
    clear() { m.clear() },
    getItem(k: string) { return m.has(k) ? m.get(k)! : null },
    key(i: number) { return Array.from(m.keys())[i] ?? null },
    removeItem(k: string) { m.delete(k) },
    setItem(k: string, v: string) { m.set(k, String(v)) },
  } as Storage
}
beforeEach(() => {
  Object.defineProperty(window, 'localStorage', { value: mockStore(), configurable: true, writable: true })
  window.localStorage.clear()
})

// WHITE-BOX: branches of getSession
describe('WHITE-BOX: storage branches', () => {
  it('branch: no key → null', () => expect(getSession()).toBeNull())
  it('branch: malformed JSON → null', () => {
    window.localStorage.setItem(SESSION_KEY, '{not json')
    expect(getSession()).toBeNull()
  })
  it('branch: missing roomCode → null', () => {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify({ playerId: 'p1' }))
    expect(getSession()).toBeNull()
  })
  it('branch: missing playerId → null', () => {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify({ roomCode: 'ABCD' }))
    expect(getSession()).toBeNull()
  })
  it('branch: empty object → null', () => {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify({}))
    expect(getSession()).toBeNull()
  })
  it('branch: valid session → normalized object (extra fields ignored)', () => {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify({ roomCode: 'ABCD', playerId: 'p1', extra: 'x' }))
    expect(getSession()).toEqual({ roomCode: 'ABCD', playerId: 'p1' })
  })
  it('branch: saveSession overwrites', () => {
    saveSession('ABCD', 'p1')
    saveSession('EFGH', 'p2')
    expect(getSession()).toEqual({ roomCode: 'EFGH', playerId: 'p2' })
  })
  it('branch: clearSession removes', () => {
    saveSession('ABCD', 'p1')
    clearSession()
    expect(getSession()).toBeNull()
    expect(window.localStorage.getItem(SESSION_KEY)).toBeNull()
  })
})

// BLACK-BOX: spec — session persists across reload, cleared on invalid
describe('BLACK-BOX: storage spec', () => {
  it('save then get returns same, clear then get null', () => {
    saveSession('WXYZ', 'player-99')
    expect(getSession()).toEqual({ roomCode: 'WXYZ', playerId: 'player-99' })
    clearSession()
    expect(getSession()).toBeNull()
  })
  it('host + guest sessions are independent', () => {
    saveSession('ABCD', 'host-1')
    expect(getSession()?.playerId).toBe('host-1')
    saveSession('ABCD', 'guest-2')
    expect(getSession()?.playerId).toBe('guest-2')
  })
})
