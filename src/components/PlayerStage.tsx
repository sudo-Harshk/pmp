import { useEffect, useReducer, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { PlaylistTrack } from '@/types/game'
import YouTubePlayer, {
  isEmbedRestrictedError,
  isInvalidVideoError,
  type YouTubePlayerHandle,
} from '@/components/YouTubePlayer'
import {
  createInitialSnippetState,
  getNextTrackIndex,
  getPreviousTrackIndex,
  snippetReducer,
  SNIPPET_DURATION_SECONDS,
} from '@/lib/playerLogic'

interface PlayerStageProps {
  tracks: PlaylistTrack[]
  onBack: () => void
}

export default function PlayerStage({ tracks, onBack }: PlayerStageProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [errorCode, setErrorCode] = useState<number | null>(null)
  const [snippet, dispatch] = useReducer(snippetReducer, undefined, () =>
    createInitialSnippetState(),
  )
  const playerRef = useRef<YouTubePlayerHandle | null>(null)
  const announcedRef = useRef(false)

  const trackCount = tracks.length
  const currentTrack = tracks[Math.min(currentIndex, trackCount - 1)]
  const atStart = currentIndex <= 0
  const atEnd = currentIndex >= trackCount - 1

  useEffect(() => {
    dispatch({ type: 'START' })
  }, [])

  useEffect(() => {
    if (!snippet.running) return
    const id = window.setInterval(() => dispatch({ type: 'TICK' }), 1000)
    return () => window.clearInterval(id)
  }, [snippet.running])

  useEffect(() => {
    if (snippet.secondsRemaining === 0 && !snippet.running && !announcedRef.current) {
      announcedRef.current = true
      setIsPlaying(false)
    }
  }, [snippet.secondsRemaining, snippet.running])

  function selectTrack(nextIndex: number) {
    setCurrentIndex(nextIndex)
    setErrorCode(null)
    setIsPlaying(true)
    announcedRef.current = false
    dispatch({ type: 'RESET' })
    dispatch({ type: 'START' })
  }

  function handlePlay() {
    setIsPlaying(true)
    dispatch({ type: 'START' })
  }

  function handlePause() {
    setIsPlaying(false)
    dispatch({ type: 'PAUSE' })
  }

  function handleNext() {
    if (atEnd) return
    selectTrack(getNextTrackIndex(currentIndex, trackCount))
  }

  function handlePrev() {
    if (atStart) return
    selectTrack(getPreviousTrackIndex(currentIndex))
  }

  function handleSkip() {
    handleNext()
  }

  function handlePlayerError(code: number) {
    setErrorCode(code)
    setIsPlaying(false)
    dispatch({ type: 'PAUSE' })
  }

  function handlePlayerEnded() {
    setIsPlaying(false)
    dispatch({ type: 'PAUSE' })
  }

  if (trackCount === 0) {
    return (
      <div className="w-full max-w-xl rounded-2xl border border-slate-700 bg-slate-900/60 p-6 text-center shadow-xl">
        <p className="text-slate-300">No tracks to play. Go back and submit some songs.</p>
        <button
          type="button"
          onClick={onBack}
          className="mt-4 rounded-lg bg-indigo-500 px-4 py-2 font-semibold text-white transition hover:bg-indigo-400"
        >
          Back
        </button>
      </div>
    )
  }

  const errorMessage = describeError(errorCode)

  return (
    <div className="w-full max-w-2xl space-y-4">
      <div className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3">
        <p className="text-sm text-slate-300">
          Track <span className="font-bold text-white">{currentIndex + 1}</span> of{' '}
          <span className="font-bold text-white">{trackCount}</span>
        </p>
        <button
          type="button"
          onClick={onBack}
          className="rounded-md border border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-slate-700"
        >
          Back to Preview
        </button>
      </div>

      <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-6 shadow-xl">
        {currentTrack && (
          <YouTubePlayer
            videoId={currentTrack.videoId}
            isPlaying={isPlaying}
            onReady={(handle) => {
              playerRef.current = handle
            }}
            onEnded={handlePlayerEnded}
            onError={handlePlayerError}
          />
        )}

        {errorCode !== null && currentTrack && (
          <div
            role="alert"
            className="mt-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3"
          >
            <p className="text-sm text-amber-200">{errorMessage}</p>
            <button
              type="button"
              onClick={handleSkip}
              className="mt-2 rounded-md bg-amber-500 px-3 py-1.5 text-xs font-semibold text-slate-900 transition hover:bg-amber-400"
            >
              Skip Track
            </button>
          </div>
        )}

        <SnippetTimer
          secondsRemaining={snippet.secondsRemaining}
          running={snippet.running}
        />

        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <ControlButton onClick={handlePrev} disabled={atStart} label="Prev">
            ⏮
          </ControlButton>
          {isPlaying ? (
            <ControlButton onClick={handlePause} label="Pause">
              ⏸
            </ControlButton>
          ) : (
            <ControlButton onClick={handlePlay} label="Play" primary disabled={errorCode !== null}>
              ▶
            </ControlButton>
          )}
          <ControlButton onClick={handleNext} disabled={atEnd} label="Next">
            ⏭
          </ControlButton>
        </div>
      </div>
    </div>
  )
}

interface SnippetTimerProps {
  secondsRemaining: number
  running: boolean
}

function SnippetTimer({ secondsRemaining, running }: SnippetTimerProps) {
  const elapsed = SNIPPET_DURATION_SECONDS - secondsRemaining
  const progress = Math.max(0, Math.min(1, elapsed / SNIPPET_DURATION_SECONDS))
  const timeUp = secondsRemaining === 0 && !running

  return (
    <div className="mt-4">
      <div className="mb-1 flex items-center justify-between text-xs text-slate-400">
        <span>30s Snippet</span>
        <span className={timeUp ? 'font-semibold text-rose-400' : 'font-mono'}>
          {timeUp ? 'Time is up!' : `${secondsRemaining}s remaining`}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-linear ${
            timeUp ? 'bg-rose-500' : 'bg-indigo-500'
          }`}
          style={{ width: `${progress * 100}%` }}
        />
      </div>
    </div>
  )
}

interface ControlButtonProps {
  onClick: () => void
  disabled?: boolean
  primary?: boolean
  label: string
  children: ReactNode
}

function ControlButton({
  onClick,
  disabled = false,
  primary = false,
  label,
  children,
}: ControlButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`h-12 w-12 rounded-full text-xl font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
        primary
          ? 'bg-indigo-500 text-white hover:bg-indigo-400'
          : 'border border-slate-600 bg-slate-800 text-white hover:bg-slate-700'
      }`}
    >
      {children}
    </button>
  )
}

function describeError(errorCode: number | null): string {
  if (errorCode === null) return 'This video could not be played.'
  if (isEmbedRestrictedError(errorCode)) {
    return 'This video cannot be embedded on external sites.'
  }
  if (isInvalidVideoError(errorCode)) {
    return 'This video is invalid or has been removed.'
  }
  return `The video could not be played (error ${errorCode}).`
}
