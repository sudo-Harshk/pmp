import { useEffect, useRef, useState } from 'react'
import type { RoomState } from '@/types/game'
import YouTubePlayer, { type YouTubePlayerHandle } from '@/components/YouTubePlayer'
import { JUKEBOX_MAX_SECONDS } from '@/lib/playerLogic'

interface JukeboxViewProps {
  room: RoomState
  serverOffset: number
  onNavigate: (nav: { type: 'PREV' } | { type: 'NEXT' }) => void
  onJump: (index: number) => void
  onSeek: (seconds: number) => void
  onSetPaused: (paused: boolean) => void
}

export default function JukeboxView({
  room,
  serverOffset,
  onNavigate,
  onJump,
  onSeek,
  onSetPaused,
}: JukeboxViewProps) {
  const track = room.tracks[room.currentTrackIndex]
  const paused = room.playbackPaused === true
  const isLast = room.currentTrackIndex >= room.tracks.length - 1
  const [playerError, setPlayerError] = useState<number | null>(null)
  const playerRef = useRef<YouTubePlayerHandle | null>(null)
  const [duration, setDuration] = useState(JUKEBOX_MAX_SECONDS)

  function handlePlayerError(code: number) {
    if ([100, 101, 150].includes(code)) {
      console.warn(`YouTube player error ${code} for video ${track?.videoId} — unplayable, anyone can skip`)
    } else {
      console.warn(`YouTube player error ${code} for video ${track?.videoId}`)
    }
    setPlayerError(code)
  }

  useEffect(() => {
    setPlayerError(null)
  }, [room.currentTrackIndex, room.status])

  // Spotify-like sync: all members hear same second via roundStartTime + seekTo
  useEffect(() => {
    if (!room.roundStartTime || room.status !== 'PLAYING') return
    const handle = playerRef.current
    if (!handle) return

    const sync = () => {
      if (paused) return
      const expected = Math.max(0, (Date.now() + serverOffset - (room.roundStartTime as number)) / 1000)
      try {
        const actual = handle.getCurrentTime()
        if (Math.abs(actual - expected) > 1.5) {
          handle.seekTo(expected, true)
        }
      } catch {
        // player not ready
      }
    }

    // Immediate seek on track/round change or pause toggle
    const expectedOnMount = paused
      ? 0
      : Math.max(0, (Date.now() + serverOffset - (room.roundStartTime as number)) / 1000)
    try {
      const h = playerRef.current
      if (h && !paused) {
        // Only seek if we have a handle and not paused
        const actual = h.getCurrentTime()
        if (Math.abs(actual - expectedOnMount) > 1.5) h.seekTo(expectedOnMount, true)
      }
    } catch {}

    const id = window.setInterval(sync, 2000)
    return () => window.clearInterval(id)
  }, [room.roundStartTime, room.currentTrackIndex, room.status, paused, serverOffset])

  if (!track) {
    return <p className="text-slate-400">No track available.</p>
  }

  const elapsed = room.roundStartTime && !paused ? Math.max(0, Math.floor((Date.now() + serverOffset - room.roundStartTime) / 1000)) : 0
  const displayElapsed = paused ? 0 : elapsed

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
            onReady={(h) => {
              playerRef.current = h
              try {
                const d = h.getDuration()
                if (d && isFinite(d) && d > 0) setDuration(Math.min(Math.ceil(d), JUKEBOX_MAX_SECONDS))
              } catch {}
              // Initial sync seek
              if (!paused && room.roundStartTime) {
                const expected = Math.max(0, (Date.now() + serverOffset - room.roundStartTime) / 1000)
                try {
                  if (Math.abs(h.getCurrentTime() - expected) > 1.5) h.seekTo(expected, true)
                  h.playVideo()
                } catch {}
              }
            }}
            onEnded={() => {
              if (!isLast) onNavigate({ type: 'NEXT' })
            }}
            onError={handlePlayerError}
          />
        </div>

        <div className="mt-4 rounded-lg bg-slate-800/70 px-4 py-3 text-center">
          <p className="text-xs uppercase tracking-wider text-slate-400">Currently playing — submitted by</p>
          <p className="mt-1 text-lg font-semibold text-indigo-300">{track.submittedBy.join(', ')}</p>
        </div>

        {playerError !== null && (
          <div className="mt-3 rounded-lg bg-amber-500/10 px-3 py-2 text-center text-xs font-semibold text-amber-300">
            {[100, 101, 150].includes(playerError)
              ? `Video unplayable (error ${playerError}). Anyone can skip.`
              : `Player error ${playerError}. Anyone can skip if needed.`}
          </div>
        )}

        {/* Common controls — anyone can control, like Spotify */}
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

        {playerError !== null && [100, 101, 150].includes(playerError) && (
          <button
            type="button"
            onClick={() => onNavigate({ type: 'NEXT' })}
            className="mt-3 w-full rounded-lg border border-amber-500/40 py-2 text-sm font-medium text-amber-300 transition hover:bg-amber-500/10"
          >
            Skip Unplayable Track
          </button>
        )}

        {/* Seek bar — anyone can seek, like Spotify */}
        <div className="mt-5">
          <input
            type="range"
            min={0}
            max={duration}
            value={Math.min(displayElapsed, duration)}
            onChange={(e) => onSeek(Number(e.target.value))}
            className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-800 accent-indigo-500"
          />
          <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
            <span>{Math.floor(displayElapsed / 60)}:{String(displayElapsed % 60).padStart(2, '0')}</span>
            <span>{Math.floor(duration / 60)}:{String(duration % 60).padStart(2, '0')}</span>
          </div>
        </div>

        <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
          <span>Common playlist — all hear same second</span>
          <span>max {JUKEBOX_MAX_SECONDS}s</span>
        </div>
      </div>

      {/* Queue list — like Spotify queue, visible above/below, tap to jump */}
      <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4 shadow-xl">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Queue — shuffled with Fisher–Yates • tap to jump (anyone)
        </h3>
        <ol className="space-y-1">
          {room.tracks.map((t, idx) => (
            <li
              key={`${t.videoId}-${idx}`}
              onClick={() => onJump(idx)}
              className={`flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2 transition ${
                idx === room.currentTrackIndex
                  ? 'border-indigo-500 bg-indigo-500/20 text-white'
                  : t.played
                    ? 'border-slate-700 bg-slate-800/40 text-slate-400'
                    : 'border-slate-700 bg-slate-800/60 text-slate-200 hover:bg-slate-700'
              }`}
            >
              <span className="flex items-center gap-2 text-sm">
                <span className="w-6 text-center font-mono text-xs">{idx + 1}</span>
                <span className="font-mono text-xs">{t.videoId}</span>
                <span className="text-xs text-slate-400">by {t.submittedBy.join(', ')}</span>
                {idx === room.currentTrackIndex && <span className="text-xs font-semibold text-indigo-300">● Playing</span>}
                {t.played && idx !== room.currentTrackIndex && <span className="text-xs text-slate-500">✓</span>}
              </span>
              <span className="text-xs text-slate-500">{idx === room.currentTrackIndex ? 'Jump' : 'Tap'}</span>
            </li>
          ))}
        </ol>
        {room.tracks.length === 0 && <p className="text-sm text-slate-500">No tracks yet.</p>}
      </div>
    </div>
  )
}
