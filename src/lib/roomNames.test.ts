import { describe, expect, it } from 'vitest'
import { generateRoomName } from './roomNames'

describe('generateRoomName', () => {
  it('returns a non-empty string with two words', () => {
    const name = generateRoomName()
    expect(name.trim().length).toBeGreaterThan(0)
    expect(name.split(' ').length).toBeGreaterThanOrEqual(2)
  })

  it('is at most 32 chars', () => {
    for (let i = 0; i < 50; i++) {
      expect(generateRoomName().length).toBeLessThanOrEqual(32)
    }
  })

  it('is trimmed and not blank', () => {
    for (let i = 0; i < 20; i++) {
      const name = generateRoomName()
      expect(name).toBe(name.trim())
      expect(name.length).toBeGreaterThan(0)
    }
  })

  it('produces variety over many calls', () => {
    const set = new Set<string>()
    for (let i = 0; i < 50; i++) set.add(generateRoomName())
    expect(set.size).toBeGreaterThan(1)
  })
})
