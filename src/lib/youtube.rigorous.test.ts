import { describe, expect, it } from 'vitest'
import { extractVideoId, processSubmissions } from '@/lib/youtube'
import type { Submission } from '@/types/game'

// WHITE-BOX: each URL_PATTERNS branch, boundary guards, YOUTUBE_VIDEO_ID_PATTERN
describe('WHITE-BOX: extractVideoId branches', () => {
  it('branch: watch with v= and &list & index stripped (boundary guard ?![a-zA-Z0-9_-])', () => {
    expect(extractVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PL123&index=3')).toBe('dQw4w9WgXcQ')
  })
  it('branch: watch with ?t= timestamp stripped', () => {
    expect(extractVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s')).toBe('dQw4w9WgXcQ')
    expect(extractVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s&list=abc')).toBe('dQw4w9WgXcQ')
  })
  it('branch: youtu.be with ?t and ?list', () => {
    expect(extractVideoId('https://youtu.be/dQw4w9WgXcQ?t=10')).toBe('dQw4w9WgXcQ')
    expect(extractVideoId('https://youtu.be/dQw4w9WgXcQ?list=PL123')).toBe('dQw4w9WgXcQ')
  })
  it('branch: embed', () => {
    expect(extractVideoId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
    expect(extractVideoId('https://www.youtube.com/embed/dQw4w9WgXcQ?start=30')).toBe('dQw4w9WgXcQ')
  })
  it('branch: shorts', () => {
    expect(extractVideoId('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
    expect(extractVideoId('https://www.youtube.com/shorts/dQw4w9WgXcQ?feature=share')).toBe('dQw4w9WgXcQ')
  })
  it('branch: http and no-www variants', () => {
    expect(extractVideoId('http://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
    expect(extractVideoId('https://youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ')
  })
  it('branch: pattern not matched → null', () => {
    expect(extractVideoId('https://vimeo.com/123')).toBeNull()
    expect(extractVideoId('https://www.youtube.com')).toBeNull()
    expect(extractVideoId('https://www.youtube.com/watch?x=dQw4w9WgXcQ')).toBeNull()
  })
  it('branch: candidate fails YOUTUBE_VIDEO_ID_PATTERN (wrong length) → null', () => {
    expect(extractVideoId('https://www.youtube.com/watch?v=short')).toBeNull()
    expect(extractVideoId('https://www.youtube.com/watch?v=waytoolongvideoid')).toBeNull()
    expect(extractVideoId('https://youtu.be/short')).toBeNull()
  })
  it('branch: boundary guard — 12th char prevents match', () => {
    // If id is 11 chars but immediately followed by alphanum/_/-, the lookahead (?![...]) should fail and then no pattern matches → null? Actually the pattern would match first 11 but lookahead fails, so no capture.
    // We test a URL where video id appears to be 12 chars long (invalid) — should be null
    expect(extractVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQQ')).toBeNull() // 12 chars
  })
  it('branch: non-string input → null', () => {
    expect(extractVideoId('' as any)).toBeNull()
    expect(extractVideoId(null as any)).toBeNull()
    expect(extractVideoId(undefined as any)).toBeNull()
    expect(extractVideoId(123 as any)).toBeNull()
  })
  it('branch: picks first valid pattern (watch before youtu.be) — returns watch id', () => {
    // URL containing both patterns (edge) — should return first match's id (watch)
    const url = 'https://www.youtube.com/watch?v=aaaaaaaaaaa youtu.be/bbbbbbbbbbb'
    expect(extractVideoId(url)).toBe('aaaaaaaaaaa')
  })
})

// BLACK-BOX: spec — user provides any YouTube URL, we return 11-char id or null
describe('BLACK-BOX: extractVideoId spec', () => {
  it.each([
    ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://youtu.be/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://www.youtube.com/embed/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://www.youtube.com/shorts/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
  ])('extracts %s → %s', (url, id) => {
    expect(extractVideoId(url)).toBe(id)
  })
  it('returns null for garbage', () => {
    expect(extractVideoId('not a url')).toBeNull()
    expect(extractVideoId('')).toBeNull()
  })
})

describe('WHITE-BOX: processSubmissions branches', () => {
  it('branch: invalid videoId → continue (skipped)', () => {
    const subs: Submission[] = [
      { youtubeUrl: 'garbage', submittedBy: 'Alice' },
      { youtubeUrl: 'https://www.youtube.com/watch?v=aaaaaaaaaaa', submittedBy: 'Bob' },
    ]
    const result = processSubmissions(subs)
    expect(result).toHaveLength(1)
    expect(result[0].videoId).toBe('aaaaaaaaaaa')
  })
  it('branch: existing includes submitter → not duplicated', () => {
    const subs: Submission[] = [
      { youtubeUrl: 'https://youtu.be/dQw4w9WgXcQ', submittedBy: 'Alice' },
      { youtubeUrl: 'https://youtu.be/dQw4w9WgXcQ', submittedBy: 'Alice' },
    ]
    expect(processSubmissions(subs)[0].submittedBy).toEqual(['Alice'])
  })
  it('branch: existing does not include submitter → push', () => {
    const subs: Submission[] = [
      { youtubeUrl: 'https://youtu.be/dQw4w9WgXcQ', submittedBy: 'Alice' },
      { youtubeUrl: 'https://youtu.be/dQw4w9WgXcQ', submittedBy: 'Bob' },
    ]
    expect(processSubmissions(subs)[0].submittedBy).toEqual(['Alice', 'Bob'])
  })
  it('branch: new videoId → set new map entry', () => {
    const subs: Submission[] = [
      { youtubeUrl: 'https://youtu.be/aaaaaaaaaaa', submittedBy: 'Alice' },
      { youtubeUrl: 'https://youtu.be/bbbbbbbbbbb', submittedBy: 'Bob' },
    ]
    const result = processSubmissions(subs)
    expect(result).toHaveLength(2)
  })
  it('branch: dedup across watch/youtu.be/shorts/embed forms for same id', () => {
    const id = 'dQw4w9WgXcQ'
    const subs: Submission[] = [
      { youtubeUrl: `https://www.youtube.com/watch?v=${id}`, submittedBy: 'Alice' },
      { youtubeUrl: `https://youtu.be/${id}`, submittedBy: 'Bob' },
      { youtubeUrl: `https://www.youtube.com/embed/${id}`, submittedBy: 'Carol' },
      { youtubeUrl: `https://www.youtube.com/shorts/${id}`, submittedBy: 'Dana' },
    ]
    const result = processSubmissions(subs)
    expect(result).toHaveLength(1)
    expect(result[0].submittedBy).toEqual(['Alice', 'Bob', 'Carol', 'Dana'])
  })
})

describe('BLACK-BOX: processSubmissions spec', () => {
  it('empty → empty', () => expect(processSubmissions([])).toEqual([]))
  it('played is always false initially', () => {
    const r = processSubmissions([{ youtubeUrl: 'https://youtu.be/aaaaaaaaaaa', submittedBy: 'Alice' }])
    expect(r[0].played).toBe(false)
  })
  it('preserves insertion order of first appearance', () => {
    const subs: Submission[] = [
      { youtubeUrl: 'https://youtu.be/bbbbbbbbbbb', submittedBy: 'Bob' },
      { youtubeUrl: 'https://youtu.be/aaaaaaaaaaa', submittedBy: 'Alice' },
    ]
    const r = processSubmissions(subs)
    expect(r[0].videoId).toBe('bbbbbbbbbbb')
    expect(r[1].videoId).toBe('aaaaaaaaaaa')
  })
  it('strips ?t and &list — same videoId deduplicated', () => {
    const subs: Submission[] = [
      { youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30s&list=PL123', submittedBy: 'Alice' },
      { youtubeUrl: 'https://youtu.be/dQw4w9WgXcQ?list=PL123', submittedBy: 'Bob' },
    ]
    const r = processSubmissions(subs)
    expect(r).toHaveLength(1)
    expect(r[0].submittedBy).toEqual(['Alice', 'Bob'])
  })
})
