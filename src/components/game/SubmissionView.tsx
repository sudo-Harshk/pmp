import { useState } from 'react'
import type { FormEvent } from 'react'
import type { RoomState } from '@/types/game'
import { hasExactCount } from '@/lib/roomLifecycle'
import { extractVideoId } from '@/lib/youtube'

interface SubmissionViewProps {
  room: RoomState
  myPlayerId: string | null
  isHost: boolean
  onSubmitSongs: (urls: string[]) => void
  onNext: () => void
}

export default function SubmissionView({
  room,
  myPlayerId,
  isHost,
  onSubmitSongs,
  onNext,
}: SubmissionViewProps) {
  // Host-fixed count from the lobby — every player submits exactly this many
  const songCount = room.songsPerPlayer
  const [urls, setUrls] = useState<string[]>(() => Array.from({ length: songCount }, () => ''))

  const players = Object.values(room.players)
  const me = myPlayerId ? room.players[myPlayerId] : undefined
  const allSubmitted =
    players.length > 0 && players.every((p) => p.hasSubmitted === true)

  const validCount = urls.filter((u) => u.trim() !== '' && extractVideoId(u) !== null).length
  const exactReady = hasExactCount(validCount, songCount)

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const validUrls = urls.filter((u) => u.trim() !== '' && extractVideoId(u) !== null)
    // Host-fixed count: short submissions are not accepted
    if (!hasExactCount(validUrls.length, songCount)) return
    onSubmitSongs(validUrls)
  }

  return (
    <div className="flex w-full max-w-3xl flex-col gap-4 lg:flex-row">
      <div className="w-full flex-1 rounded-2xl border border-slate-700 bg-slate-900/60 p-6 shadow-xl">
        <h2 className="text-2xl font-bold text-white">Submit Your Songs</h2>
        <p className="mb-5 mt-1 text-sm text-slate-400">
          Add exactly {songCount} YouTube link{songCount === 1 ? '' : 's'}{' '}
          {me ? `as ${me.name}` : ''} (host fixed the count).
        </p>

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
            disabled={!exactReady || me?.hasSubmitted === true}
            className="w-full rounded-lg bg-indigo-500 py-2.5 font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
          >
            {me?.hasSubmitted
              ? 'Submitted ✓'
              : exactReady
                ? `Submit ${songCount} Song${songCount === 1 ? '' : 's'}`
                : `Add ${songCount - validCount} more`}
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
