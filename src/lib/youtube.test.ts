import { describe, expect, it } from 'vitest'
import { extractVideoId, processSubmissions } from '@/lib/youtube'
import type { Submission } from '@/types/game'

describe('extractVideoId', () => {
  it.each([
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s',
    'https://youtu.be/dQw4w9WgXcQ',
    'https://www.youtube.com/embed/dQw4w9WgXcQ',
    'https://www.youtube.com/shorts/dQw4w9WgXcQ',
    'http://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://youtube.com/watch?v=dQw4w9WgXcQ',
  ])('extracts video id from %s', (url) => {
    expect(extractVideoId(url)).toBe('dQw4w9WgXcQ')
  })

  it('returns the first valid v= param even with extra query params', () => {
    expect(
      extractVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=abc&index=3'),
    ).toBe('dQw4w9WgXcQ')
  })

  it('returns null for empty or non-string input', () => {
    expect(extractVideoId('')).toBeNull()
    expect(extractVideoId('   ')).toBeNull()
    expect(extractVideoId(undefined as unknown as string)).toBeNull()
    expect(extractVideoId(null as unknown as string)).toBeNull()
  })

  it('returns null for non-YouTube URLs', () => {
    expect(extractVideoId('https://vimeo.com/123456')).toBeNull()
    expect(extractVideoId('https://example.com/watch?v=dQw4w9WgXcQ')).toBeNull()
    expect(extractVideoId('https://www.youtube.com')).toBeNull()
  })

  it('returns null for an invalid (wrong length) video id', () => {
    expect(extractVideoId('https://www.youtube.com/watch?v=tooshort')).toBeNull()
    expect(extractVideoId('https://www.youtube.com/watch?v=waytoolongvideoid')).toBeNull()
  })
})

describe('processSubmissions', () => {
  const base: Submission[] = [
    { youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', submittedBy: 'Alice' },
    { youtubeUrl: 'https://youtu.be/dQw4w9WgXcQ', submittedBy: 'Bob' },
  ]

  it('deduplicates identical video ids and merges submitters', () => {
    const result = processSubmissions(base)
    expect(result).toHaveLength(1)
    expect(result[0].videoId).toBe('dQw4w9WgXcQ')
    expect(result[0].submittedBy).toEqual(['Alice', 'Bob'])
  })

  it('does not duplicate a submitter name in the merged list', () => {
    const submissions: Submission[] = [
      { youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', submittedBy: 'Alice' },
      { youtubeUrl: 'https://youtu.be/dQw4w9WgXcQ', submittedBy: 'Alice' },
    ]
    const result = processSubmissions(submissions)
    expect(result[0].submittedBy).toEqual(['Alice'])
  })

  it('keeps separate entries for distinct video ids', () => {
    const submissions: Submission[] = [
      { youtubeUrl: 'https://www.youtube.com/watch?v=aaaaaaaaaaa', submittedBy: 'Alice' },
      { youtubeUrl: 'https://www.youtube.com/watch?v=bbbbbbbbbbb', submittedBy: 'Bob' },
    ]
    const result = processSubmissions(submissions)
    expect(result).toHaveLength(2)
    expect(result[0].videoId).toBe('aaaaaaaaaaa')
    expect(result[1].videoId).toBe('bbbbbbbbbbb')
  })

  it('skips invalid or non-YouTube URLs', () => {
    const submissions: Submission[] = [
      { youtubeUrl: 'not-a-url', submittedBy: 'Alice' },
      { youtubeUrl: 'https://vimeo.com/123', submittedBy: 'Bob' },
      { youtubeUrl: '', submittedBy: 'Carol' },
    ]
    expect(processSubmissions(submissions)).toEqual([])
  })

  it('mixes valid and invalid submissions, keeping only the valid ones', () => {
    const submissions: Submission[] = [
      { youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', submittedBy: 'Alice' },
      { youtubeUrl: 'garbage', submittedBy: 'Bob' },
      { youtubeUrl: 'https://youtu.be/bbbbbbbbbbb', submittedBy: 'Carol' },
    ]
    const result = processSubmissions(submissions)
    expect(result).toHaveLength(2)
    expect(result.map((t) => t.videoId)).toEqual(['dQw4w9WgXcQ', 'bbbbbbbbbbb'])
  })

  it('initializes played to false and preserves insertion order', () => {
    const result = processSubmissions(base)
    for (const track of result) {
      expect(track.played).toBe(false)
    }
  })

  it('handles an empty submission list', () => {
    expect(processSubmissions([])).toEqual([])
  })

  it('merges submitters across multiple submissions of the same track', () => {
    const submissions: Submission[] = [
      { youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', submittedBy: 'Alice' },
      { youtubeUrl: 'https://youtu.be/dQw4w9WgXcQ', submittedBy: 'Bob' },
      { youtubeUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', submittedBy: 'Carol' },
      { youtubeUrl: 'https://www.youtube.com/shorts/dQw4w9WgXcQ', submittedBy: 'Dana' },
    ]
    const result = processSubmissions(submissions)
    expect(result[0].submittedBy).toEqual(['Alice', 'Bob', 'Carol', 'Dana'])
  })
})
