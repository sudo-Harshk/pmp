import { useState } from 'react'
import type { FormEvent } from 'react'
import type { RoomState } from '@/types/game'
import { extractVideoId } from '@/lib/youtube'

interface SubmissionViewProps {
  room: RoomState
  myPlayerId: string | null
  isHost: boolean
  onSubmitSongs: (urls: string[]) => void
  onNext: () => void
}

const DEFAULT_COUNT = 3
const MAX_SONGS = 10

export default function SubmissionView({
  room,
  myPlayerId,
  isHost,
  onSubmitSongs,
  onNext,
}: SubmissionViewProps) {
  const [songCount, setSongCount] = useState(DEFAULT_COUNT)
  const [urls, setUrls] = useState<string[]>(() =>
    Array.from({ length: DEFAULT_COUNT }, () => ''),
  )

  const players = Object.values(room.players)
  const me = myPlayerId ? room.players[myPlayerId] : undefined
  const allSubmitted =
    players.length > 0 && players.every((p) => p.hasSubmitted === true)

  function updateCount(newCount: number) {
    const count = Math.max(1, Math.min(MAX_SONGS, newCount))
    setSongCount(count)
    setUrls((prev) => {
      const next = [...prev]
      while (next.length < count) next.push('')
      return next.slice(0, count)
    })
  }

  const validCount = urls.filter((u) => u.trim() !== '' && extractVideoId(u) !== null).length

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const validUrls = urls.filter((u) => u.trim() !== '' && extractVideoId(u) !== null)
    if (validUrls.length === 0) return
    onSubmitSongs(validUrls)
  }

  return (
    <div className="flex w-full max-w-3xl flex-col gap-4 lg:flex-row">
      <div className="w-full flex-1 rounded-2xl border border-slate-700 bg-slate-900/60 p-6 shadow-xl">
        <h2 className="text-2xl font-bold text-white">Submit Your Songs</h2>
        <p className="mb-5 mt-1 text-sm text-slate-400">
          Add {songCount} YouTube links {me ? `as ${me.name}` : ''}.
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
              const trimmed = url.trim()
              const status = trimmed === '' ? 'empty' : extractVideoId(trimmed) ? 'valid' : 'invalid'
              return (
                <div key={index}>
                  <input
                    type="text"
                    value={url}
                    onChange={(e) =>
                      setUrls((prev) => {
                        const next = [...prev]
                        next[index] = e.target.value
                        return next
                      })
                    }
                    placeholder={`YouTube URL ${index + 1}`}
                    className={`w-full rounded-lg border bg-slate-800 px-3 py-2 pr-10 text-white placeholder-slate-500 outline-none transition focus:ring-2 ${
                      status === 'valid'
                        ? 'border-emerald-500 focus:ring-emerald-500/30'
                        : status === 'invalid'
                          ? 'border-rose-500 focus:ring-rose-500/30'
                          : 'border-slate-600 focus:border-indigo-500 focus:ring-indigo-500/30'
                    }`}
                  />
                  {status === 'invalid' && (
                    <p className="mt-1 text-xs text-rose-400">Invalid YouTube URL</p>
                  )}
                </div>
              )
            })}
          </div>

          <button
            type="submit"
            disabled={validCount === 0 || me?.hasSubmitted === true}
            className="w-full rounded-lg bg-indigo-500 py-2.5 font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
          >
            {me?.hasSubmitted ? 'Submitted ✓' : `Submit ${validCount} Song${validCount === 1 ? '' : 's'}`}
          </button>
        </form>
      </div>

      <div className="w-full rounded-2xl border border-slate-700 bg-slate-900/60 p-6 shadow-xl lg:w-64">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Submission Status
        </h3>
        <ul className="space-y-2">
          {players.map((player) => (
            <li
              key={player.id}
              className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2"
            >
              <span className="text-sm text-white">{player.name}</span>
              <span
                className={`text-xs font-semibold ${
                  player.hasSubmitted ? 'text-emerald-400' : 'text-slate-500'
                }`}
              >
                {player.hasSubmitted ? 'Ready ✓' : 'Pending…'}
              </span>
            </li>
          ))}
        </ul>

        {isHost ? (
          room.tracks.length > 0 ? (
            <button
              type="button"
              onClick={onNext}
              className="mt-4 w-full rounded-lg bg-indigo-500 py-2.5 font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
            >
              {room.mode === 'JUKEBOX' ? 'Start Playback' : 'Start Game'}
            </button>
          ) : null
        ) : allSubmitted ? (
          <p className="mt-4 rounded-lg bg-emerald-500/10 px-3 py-2 text-center text-xs font-semibold text-emerald-300">
            Everyone is ready! Waiting for host to start...
          </p>
        ) : null}
      </div>
    </div>
  )
}
