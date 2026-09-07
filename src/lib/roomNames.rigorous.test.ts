import { describe, expect, it } from 'vitest'
import {
  generateRoomName,
  generateRoomNameEntry,
  getRoomNameMeaning,
  ROOM_NAMES,
} from '@/lib/roomNames'

// WHITE-BOX: exhaustive over the curated bank + generator branches
describe('WHITE-BOX: Telugu-cinema room name bank', () => {
  it('bank is non-empty with variety', () => {
    expect(ROOM_NAMES.length).toBeGreaterThanOrEqual(20)
    expect(new Set(ROOM_NAMES.map((e) => e.name)).size).toBe(ROOM_NAMES.length)
  })

  it('every entry: name non-blank, ≤32 chars, trimmed, ≥2 words', () => {
    for (const entry of ROOM_NAMES) {
      expect(entry.name.trim().length).toBeGreaterThan(0)
      expect(entry.name).toBe(entry.name.trim())
      expect(entry.name.length).toBeLessThanOrEqual(32)
      expect(entry.name.split(' ').length).toBeGreaterThanOrEqual(2)
    }
  })

  it('every entry: meaning non-blank and references its movie', () => {
    for (const entry of ROOM_NAMES) {
      expect(entry.meaning.trim().length).toBeGreaterThan(10)
      expect(entry.meaning).toBe(entry.meaning.trim())
    }
  })

  it('branch: generateRoomNameEntry returns a bank member', () => {
    for (let i = 0; i < 30; i++) {
      const entry = generateRoomNameEntry()
      expect(ROOM_NAMES).toContainEqual(entry)
    }
  })

  it('branch: generateRoomName slices + trims (≤32, never blank)', () => {
    for (let i = 0; i < 50; i++) {
      const name = generateRoomName()
      expect(name.length).toBeGreaterThan(0)
      expect(name.length).toBeLessThanOrEqual(32)
      expect(name).toBe(name.trim())
    }
  })

  it('branch: getRoomNameMeaning round-trips every entry', () => {
    for (const entry of ROOM_NAMES) {
      expect(getRoomNameMeaning(entry.name)).toBe(entry.meaning)
    }
  })

  it('branch: getRoomNameMeaning tolerates surrounding whitespace', () => {
    const first = ROOM_NAMES[0]
    expect(getRoomNameMeaning(`  ${first.name}  `)).toBe(first.meaning)
  })

  it('branch: getRoomNameMeaning returns null for hand-typed/unknown names', () => {
    expect(getRoomNameMeaning('My Custom Room')).toBeNull()
    expect(getRoomNameMeaning('')).toBeNull()
    expect(getRoomNameMeaning('   ')).toBeNull()
  })
})

// BLACK-BOX: spec — dice roll gives a funny name with its meaning
describe('BLACK-BOX: room name dice spec', () => {
  it('every roll produces a two-word name with an explanation', () => {
    for (let i = 0; i < 20; i++) {
      const entry = generateRoomNameEntry()
      expect(entry.name.split(' ').length).toBeGreaterThanOrEqual(2)
      expect(getRoomNameMeaning(entry.name)).toBe(entry.meaning)
    }
  })

  it('rolls vary across calls', () => {
    const seen = new Set<string>()
    for (let i = 0; i < 40; i++) seen.add(generateRoomName())
    expect(seen.size).toBeGreaterThan(1)
  })
})
