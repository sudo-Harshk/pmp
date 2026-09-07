import { useEffect, useState } from 'react'
import type { RoomState } from '@/types/game'
import YouTubePlayer from '@/components/YouTubePlayer'
import { SNIPPET_DURATION_SECONDS } from '@/lib/playerLogic'

interface GameViewProps {
  room: RoomState
  myPlayerId: string | null
  isHost: boolean
  onSubmitGuess: (guessedName: string) => void
  onSkip: () => void
}

export default function GameView({
  room,
  myPlayerId,
  isHost: _isHost,
  onSubmitGuess,
  onSkip,
}: GameViewProps) {
  const track = room.tracks[room.currentTrackIndex]
  const players = Object.values(room.players)
  const myName = myPlayerId ? room.players[myPlayerId]?.name : null
  const candidates = players.filter((p) => p.name !== myName).map((p) => p.name)
  const myGuess = myPlayerId ? room.guesses[myPlayerId] : undefined
  const eligibleGuessers = players.filter((p) => !track.submittedBy.includes(p.name)).length
  const guessCount = Object.keys(room.guesses).filter((id) => room.players[id] && !track.submittedBy.includes(room.players[id].name)).length
  const timeUp = room.timerSeconds <= 0
  const [hideVideo, setHideVideo] = useState(false)
  const [voteLocked, setVoteLocked] = useState(false)
  const [playerError, setPlayerError] = useState<number | null>(null)
  const [dummyVote, setDummyVote] = useState<string | null>(null)

  const isSubmitter = myName ? track.submittedBy.includes(myName) : false
  const hasVoted = Boolean(myGuess) || voteLocked

  function handleGuess(name: string) {
    if (hasVoted) return
    setVoteLocked(true)
    if (isSubmitter) {
      setDummyVote(name)
      return
    }
    onSubmitGuess(name)
  }

  function handlePlayerError(code: number) {
    if ([100, 101, 150].includes(code)) {
      console.warn(`YouTube player error ${code} for video ${track?.videoId} — unplayable, anyone can skip`)
    } else {
      console.warn(`YouTube player error ${code} for video ${track?.videoId}`)
    }
    setPlayerError(code)
  }

  useEffect(() => {
    setVoteLocked(false)
    setDummyVote(null)
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
        <span className="text-xs text-slate-400">
          {guessCount}/{eligibleGuessers} guessed
        </span>
      </div>

      <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-sm font-medium text-slate-300">Hidden Video (Audio-Only)</span>
          <button
            type="button"
            role="switch"
            aria-checked={hideVideo}
            onClick={() => setHideVideo((v) => !v)}
            className={`relative h-6 w-11 rounded-full transition ${
              hideVideo ? 'bg-indigo-500' : 'bg-slate-700'
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
                hideVideo ? 'left-[22px]' : 'left-0.5'
              }`}
            />
          </button>
        </div>

        <div className="relative overflow-hidden rounded-xl border border-slate-700 bg-black aspect-video">
          <YouTubePlayer
            videoId={track.videoId}
            isPlaying={!timeUp}
            onEnded={() => {
              /* handled by timer */
            }}
            onError={handlePlayerError}
          />
          {hideVideo && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-950/95">
              <AudioMask />
              <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-indigo-300">
                Audio Only
              </p>
            </div>
          )}
        </div>

        {playerError !== null && (
          <div className="mt-3 rounded-lg bg-amber-500/10 px-3 py-2 text-center text-xs font-semibold text-amber-300">
            { [100, 101, 150].includes(playerError)
              ? `Video unplayable (error ${playerError}). Anyone can skip.`
              : `Player error ${playerError}. Anyone can skip if needed.`}
          </div>
        )}

        {playerError !== null && [100, 101, 150].includes(playerError) && (
          <button
            type="button"
            onClick={onSkip}
            className="mt-3 w-full rounded-lg border border-amber-500/40 py-2 text-sm font-medium text-amber-300 transition hover:bg-amber-500/10"
          >
            Skip Unplayable Track
          </button>
        )}

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
            {hasVoted ? 'Vote Locked ✅' : 'Who submitted this song?'}
          </h3>
          {hasVoted ? (
            <p className="rounded-lg bg-indigo-500/10 px-3 py-2 text-center font-semibold text-indigo-300">
              Vote Locked ✅ You guessed {isSubmitter ? dummyVote : myGuess}. Waiting for the reveal…
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {candidates.map((name) => (
                <button
                  key={name}
                  type="button"
                  disabled={hasVoted}
                  onClick={() => handleGuess(name)}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function AudioMask() {
  const bars = [0.1, 0.25, 0.4, 0.55, 0.7]
  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative flex h-28 w-28 items-center justify-center">
        <div className="h-24 w-24 animate-spin rounded-full bg-gradient-to-br from-slate-700 via-slate-800 to-black [animation-duration:3s] shadow-inner" />
        <div className="absolute inset-6 rounded-full bg-slate-950" />
        <div className="absolute inset-11 rounded-full bg-indigo-500" />
      </div>
      <div className="flex h-12 items-end gap-1.5">
        {bars.map((delay, i) => (
          <span
            key={i}
            className="w-2 origin-bottom rounded-full bg-indigo-400"
            style={{
              height: '100%',
              transformOrigin: 'bottom',
              animation: `equalize 0.8s ease-in-out infinite`,
              animationDelay: `${delay}s`,
            }}
          />
        ))}
      </div>
    </div>
  )
}
