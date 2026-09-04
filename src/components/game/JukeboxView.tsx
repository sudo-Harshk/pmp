import { useEffect, useState } from 'react'
import type { RoomState } from '@/types/game'
import YouTubePlayer from '@/components/YouTubePlayer'
import { JUKEBOX_MAX_SECONDS } from '@/lib/playerLogic'

interface JukeboxViewProps {
  room: RoomState
  isHost: boolean
  onNavigate: (nav: { type: 'PREV' } | { type: 'NEXT' }) => void
  onSetPaused: (paused: boolean) => void
}

export default function JukeboxView({
  room,
  isHost,
  onNavigate,
  onSetPaused,
}: JukeboxViewProps) {
  const track = room.tracks[room.currentTrackIndex]
  const paused = room.playbackPaused === true
  const isLast = room.currentTrackIndex >= room.tracks.length - 1
  const [playerError, setPlayerError] = useState<number | null>(null)

  function handlePlayerError(code: number) {
    if ([100, 101, 150].includes(code)) {
      console.warn(`YouTube player error ${code} for video ${track?.videoId} — unplayable, host can skip`)
    } else {
      console.warn(`YouTube player error ${code} for video ${track?.videoId}`)
    }
    setPlayerError(code)
  }

  useEffect(() => {
    setPlayerError(null)
  }, [room.currentTrackIndex, room.status])

  if (!track) {
    return <p className="text-slate-400">No track available.</p>
  }

  return (
    <div className="w-full max-w-2xl space-y-4">
      <div className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3">
        <p className="text-sm text-slate-300">
          Track <span className="font-bold text-white">{room.currentTrackIndex + 1}</span> of{' '}
          <span className="font-bold text-white">{room.tracks.length}</span>
        </p>
        <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-semibold text-amber-300">
          Casual Jukebox
        </span>
      </div>

      <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-6 shadow-xl">
        <div className="relative overflow-hidden rounded-xl border border-slate-700 bg-black aspect-video">
          <YouTubePlayer
            videoId={track.videoId}
            isPlaying={!paused}
            onEnded={() => {
              if (isHost && !isLast) onNavigate({ type: 'NEXT' })
            }}
            onError={handlePlayerError}
          />
        </div>

        {playerError !== null && (
          <div className="mt-3 rounded-lg bg-amber-500/10 px-3 py-2 text-center text-xs font-semibold text-amber-300">
            {[100, 101, 150].includes(playerError)
              ? `Video unplayable (error ${playerError}). Host can skip.`
              : `Player error ${playerError}. Host can skip if needed.`}
          </div>
        )}

        {isHost && (
          <button
            type="button"
            onClick={() => onNavigate({ type: 'NEXT' })}
            className="mt-3 w-full rounded-lg border border-amber-500/40 py-2 text-sm font-medium text-amber-300 transition hover:bg-amber-500/10"
          >
            Skip Unplayable Track
          </button>
        )}

        <div className="mt-4 rounded-lg bg-slate-800/70 px-4 py-3 text-center">
          <p className="text-xs uppercase tracking-wider text-slate-400">Currently playing — submitted by</p>
          <p className="mt-1 text-lg font-semibold text-indigo-300">{track.submittedBy.join(', ')}</p>
        </div>

        {isHost && (
          <div className="mt-5 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => onNavigate({ type: 'PREV' })}
              disabled={room.currentTrackIndex <= 0}
              className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              ⏮ Prev
            </button>
            <button
              type="button"
              onClick={() => onSetPaused(!paused)}
              className="w-40 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-400"
            >
              {paused ? '▶ Play' : '⏸ Pause'}
            </button>
            <button
              type="button"
              onClick={() => onNavigate({ type: 'NEXT' })}
              className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
            >
              {isLast ? 'Finish ⏭' : 'Next ⏭'}
            </button>
          </div>
        )}

        {!isHost && (
          <p className="mt-5 text-center text-sm text-slate-400">
            The host controls playback.
          </p>
        )}

        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
            <span>Full song</span>
            <span>max {JUKEBOX_MAX_SECONDS}s</span>
          </div>
        </div>
      </div>
    </div>
  )
}
