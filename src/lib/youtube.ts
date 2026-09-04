import type { PlaylistTrack, Submission } from '@/types/game'

const YOUTUBE_VIDEO_ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/

const URL_PATTERNS: RegExp[] = [
  /(?:youtube\.com\/watch\?[^#]*v=)([a-zA-Z0-9_-]{11})(?![a-zA-Z0-9_-])/,
  /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})(?![a-zA-Z0-9_-])/,
  /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})(?![a-zA-Z0-9_-])/,
  /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})(?![a-zA-Z0-9_-])/,
]

export function extractVideoId(url: string): string | null {
  if (typeof url !== 'string') return null

  for (const pattern of URL_PATTERNS) {
    const match = url.match(pattern)
    const candidate = match?.[1]

    if (candidate && YOUTUBE_VIDEO_ID_PATTERN.test(candidate)) {
      return candidate
    }
  }

  return null
}

export function processSubmissions(submissions: Submission[]): PlaylistTrack[] {
  const trackMap = new Map<string, string[]>()

  for (const submission of submissions) {
    const videoId = extractVideoId(submission.youtubeUrl)
    if (videoId === null) continue

    const existing = trackMap.get(videoId)
    if (existing) {
      if (!existing.includes(submission.submittedBy)) {
        existing.push(submission.submittedBy)
      }
    } else {
      trackMap.set(videoId, [submission.submittedBy])
    }
  }

  return Array.from(trackMap.entries()).map(([videoId, submittedBy]) => ({
    videoId,
    submittedBy,
    played: false,
  }))
}
