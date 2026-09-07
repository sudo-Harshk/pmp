import { describe, expect, it } from 'vitest'
import { generateRoomName } from '@/lib/roomNames'

// WHITE-BOX: branches of generateRoomName → pick + slice + trim
describe('WHITE-BOX: generateRoomName branches', () => {
  it('branch: pick returns valid adjective + noun → two words', () => {
    const name = generateRoomName()
    const parts = name.split(' ')
    expect(parts.length).toBeGreaterThanOrEqual(2)
    expect(parts[0].length).toBeGreaterThan(0)
    expect(parts[1].length).toBeGreaterThan(0)
  })
  it('branch: slice 0,32 → never exceeds 32', () => {
    for (let i = 0; i < 100; i++) expect(generateRoomName().length).toBeLessThanOrEqual(32)
  })
  it('branch: trim → no leading/trailing spaces', () => {
    for (let i = 0; i < 50; i++) {
      const n = generateRoomName()
      expect(n).toBe(n.trim())
      expect(n).not.toMatch(/^\s/)
      expect(n).not.toMatch(/\s$/)
    }
  })
  it('branch: never returns empty (word banks non-empty)', () => {
    for (let i = 0; i < 50; i++) expect(generateRoomName().length).toBeGreaterThan(0)
  })
})

// BLACK-BOX: spec
describe('BLACK-BOX: generateRoomName spec', () => {
  it('returns pop-culture flavored two-word name, auto-generated no input needed', () => {
    const n = generateRoomName()
    expect(n.split(' ').length).toBe(2)
  })
  it('variety over many calls (random)', () => {
    const s = new Set<string>()
    for (let i = 0; i < 30; i++) s.add(generateRoomName())
    expect(s.size).toBeGreaterThan(1)
  })
  it('fallback for legacy rooms without roomName → Room {code} (simulated)', () => {
    function fromFirestoreRoomFallback(roomName: unknown, code: string): string {
      return typeof roomName === 'string' && roomName.trim().length > 0 ? roomName.trim().slice(0, 32) : `Room ${code}`
    }
    expect(fromFirestoreRoomFallback(undefined, 'ABCD')).toBe('Room ABCD')
    expect(fromFirestoreRoomFallback('', 'ABCD')).toBe('Room ABCD')
    expect(fromFirestoreRoomFallback('   ', 'ABCD')).toBe('Room ABCD')
    expect(fromFirestoreRoomFallback('Gully Groovers', 'ABCD')).toBe('Gully Groovers')
    expect(fromFirestoreRoomFallback('A'.repeat(40), 'ABCD')).toHaveLength(32)
  })
})
