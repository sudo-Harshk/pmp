import { useState } from 'react'
import type { FormEvent } from 'react'
import { extractVideoId } from '@/lib/youtube'
import type { Submission } from '@/types/game'

interface SongSubmissionFormProps {
  playerName: string
  onSubmit: (submissions: Submission[]) => void
}

const DEFAULT_COUNT = 3
const MAX_SONGS = 10

type UrlState = 'valid' | 'invalid' | 'empty'

export default function SongSubmissionForm({ playerName, onSubmit }: SongSubmissionFormProps) {
  const [songCount, setSongCount] = useState(DEFAULT_COUNT)
  const [urls, setUrls] = useState<string[]>(() => Array.from({ length: DEFAULT_COUNT }, () => ''))
  const [validation, setValidation] = useState<UrlState[]>(
    Array.from({ length: DEFAULT_COUNT }, () => 'empty'),
  )

  function updateCount(newCount: number) {
    const count = Math.max(1, Math.min(MAX_SONGS, newCount))
    setSongCount(count)
    setUrls((prev) => {
      const next = [...prev]
      while (next.length < count) next.push('')
      return next.slice(0, count)
    })
    setValidation((prev) => {
      const next = [...prev]
      while (next.length < count) next.push('empty')
      return next.slice(0, count)
    })
  }

  function updateUrl(index: number, value: string) {
    const nextUrls = [...urls]
    nextUrls[index] = value
    setUrls(nextUrls)

    const nextValidation = [...validation]
    nextValidation[index] = extractVideoId(value) ? 'valid' : value.trim() ? 'invalid' : 'empty'
    setValidation(nextValidation)
  }

  const validCount = validation.filter((v) => v === 'valid').length
  const hasAnyValid = validCount > 0

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!hasAnyValid) return

    const submissions: Submission[] = []
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i].trim()
      const status = validation[i]
      if (status !== 'valid') continue
      const videoId = extractVideoId(url)
      if (!videoId) continue

      submissions.push({
        youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
        submittedBy: playerName,
      })
    }
    onSubmit(submissions)
  }

  return (
    <div className="w-full max-w-xl rounded-2xl border border-slate-700 bg-slate-900/60 p-6 shadow-xl">
      <h2 className="mb-1 text-2xl font-bold text-white">Submit Songs</h2>
      <p className="mb-5 text-sm text-slate-400">
        Add {songCount} YouTube links as <span className="font-semibold text-indigo-300">{playerName}</span>.
      </p>

      <div className="mb-4 flex items-center justify-between">
        <label htmlFor="song-count" className="text-sm font-medium text-slate-300">
          Number of songs
        </label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => updateCount(songCount - 1)}
            disabled={songCount <= 1}
            className="h-8 w-8 rounded-md border border-slate-600 text-slate-300 transition hover:bg-slate-700 disabled:opacity-40"
          >
            −
          </button>
          <span className="w-8 text-center text-sm font-semibold text-white">{songCount}</span>
          <button
            type="button"
            onClick={() => updateCount(songCount + 1)}
            disabled={songCount >= MAX_SONGS}
            className="h-8 w-8 rounded-md border border-slate-600 text-slate-300 transition hover:bg-slate-700 disabled:opacity-40"
          >
            +
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-3">
          {urls.map((url, index) => {
            const status = validation[index]
            return (
              <div key={index}>
                <div className="relative">
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => updateUrl(index, e.target.value)}
                    placeholder={`YouTube URL ${index + 1}`}
                    className={`w-full rounded-lg border bg-slate-800 px-3 py-2 pr-10 text-white placeholder-slate-500 outline-none transition focus:ring-2 ${
                      status === 'valid'
                        ? 'border-emerald-500 focus:border-emerald-500 focus:ring-emerald-500/30'
                        : status === 'invalid'
                          ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/30'
                          : 'border-slate-600 focus:border-indigo-500 focus:ring-indigo-500/30'
                    }`}
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-lg leading-none">
                    {status === 'valid' ? '✅' : status === 'invalid' ? '⚠️' : ''}
                  </span>
                </div>
                {status === 'invalid' && (
                  <p className="mt-1 text-xs text-rose-400">Invalid YouTube URL</p>
                )}
              </div>
            )
          })}
        </div>

        <p className="text-sm text-slate-300">
          {validCount > 0 ? (
            <span className="text-emerald-400">{validCount} valid URL{validCount === 1 ? '' : 's'}</span>
          ) : (
            <span className="text-slate-500">No valid URLs yet</span>
          )}
        </p>

        <button
          type="submit"
          disabled={!hasAnyValid}
          className="w-full rounded-lg bg-indigo-500 py-2.5 font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
        >
          Process {validCount} Song{validCount === 1 ? '' : 's'}
        </button>
      </form>
    </div>
  )
}
