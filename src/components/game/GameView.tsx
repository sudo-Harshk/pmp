import { useEffect, useRef } from 'react'
import type { RoomState } from '@/types/game'
import YouTubePlayer from '@/components/YouTubePlayer'
import { SNIPPET_DURATION_SECONDS } from '@/lib/playerLogic'

interface GameViewProps {
  room: RoomState
  myPlayerId: string | null
  isHost: boolean
  onSubmitGuess: (guessedName: string) => void
  onUpdateGameState: (updates: Partial<RoomState>) => void
  onHostReveal: () => void
}

export default function GameView({
  room,
  myPlayerId,
  isHost,
  onSubmitGuess,
  onUpdateGameState,
  onHostReveal,
}: GameViewProps) {
  const track = room.tracks[room.currentTrackIndex]
  const players = Object.values(room.players)
  const candidates = players.map((p) => p.name)
  const myName = myPlayerId ? room.players[myPlayerId]?.name : null
  const myGuess = myPlayerId ? room.guesses[myPlayerId] : undefined
  const guessCount = Object.keys(room.guesses).length
  const timeUp = room.timerSeconds <= 0

  const timerRef = useRef(room.timerSeconds)
  timerRef.current = room.timerSeconds

  useEffect(() => {
    if (!isHost || room.status !== 'PLAYING') return
    if (timeUp) {
      onHostReveal()
      return
    }
    const id = window.setInterval(() => {
      onUpdateGameState({ timerSeconds: Math.max(0, timerRef.current - 1) })
    }, 1000)
    return () => window.clearInterval(id)
  }, [isHost, room.status, timeUp, onHostReveal, onUpdateGameState])

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
        <span className="text-xs text-slate-400">
          {guessCount}/{players.length - 1} guessed
        </span>
      </div>

      <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-6 shadow-xl">
        <YouTubePlayer
          videoId={track.videoId}
          isPlaying={!timeUp}
          onEnded={() => {
            /* handled by timer */
          }}
        />

        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="text-slate-400">30s Snippet</span>
            <span className={`font-mono font-semibold ${timeUp ? 'text-rose-400' : 'text-white'}`}>
              {timeUp ? 'Time is up!' : `${room.timerSeconds}s`}
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className={`h-full rounded-full transition-all duration-1000 ease-linear ${
                timeUp ? 'bg-rose-500' : 'bg-indigo-500'
              }`}
              style={{
                width: `${Math.min(100, ((SNIPPET_DURATION_SECONDS - room.timerSeconds) / SNIPPET_DURATION_SECONDS) * 100)}%`,
              }}
            />
          </div>
        </div>

        <div className="mt-6">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
            {myGuess ? 'Your guess is locked in' : 'Who submitted this song?'}
          </h3>
          {myGuess ? (
            <p className="rounded-lg bg-indigo-500/10 px-3 py-2 text-center font-semibold text-indigo-300">
              You guessed {myGuess}. Waiting for the reveal…
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {candidates.map((name) => {
                const isSelf = name === myName
                const isTaken = Object.values(room.guesses).includes(name)
                return (
                  <button
                    key={name}
                    type="button"
                    disabled={isSelf || isTaken}
                    onClick={() => onSubmitGuess(name)}
                    className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {name}
                    {isSelf ? ' (You)' : isTaken ? ' ✓' : ''}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
