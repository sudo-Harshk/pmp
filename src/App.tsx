import { useMemo, useState } from 'react'
import RoomCard from '@/components/RoomCard'
import SongSubmissionForm from '@/components/SongSubmissionForm'
import DedupPreview from '@/components/DedupPreview'
import PlayerStage from '@/components/PlayerStage'
import { processSubmissions } from '@/lib/youtube'
import type { PlaylistTrack, Player, RoomState, Submission } from '@/types/game'

type Phase =
  | { stage: 'lobby' }
  | { stage: 'submission'; roomCode: string; player: Player }
  | { stage: 'preview'; roomCode: string; player: Player; tracks: PlaylistTrack[] }
  | { stage: 'playback'; roomCode: string; player: Player; tracks: PlaylistTrack[] }

export default function App() {
  const [phase, setPhase] = useState<Phase>({ stage: 'lobby' })

  const roomState = useMemo<RoomState | null>(() => {
    if (
      phase.stage === 'submission' ||
      phase.stage === 'preview' ||
      phase.stage === 'playback'
    ) {
      return {
        roomCode: phase.roomCode,
        status: 'PLAYING',
        players: { [phase.player.id]: phase.player },
        tracks: 'tracks' in phase ? phase.tracks : [],
      }
    }
    return null
  }, [phase])

  function handleJoin(name: string, roomCode: string) {
    const player: Player = { id: crypto.randomUUID(), name, score: 0 }
    setPhase({ stage: 'submission', roomCode, player })
  }

  function handleSubmit(submissions: Submission[]) {
    if (phase.stage !== 'submission') return
    const tracks = processSubmissions(submissions)
    setPhase({ stage: 'preview', roomCode: phase.roomCode, player: phase.player, tracks })
  }

  function handleReset() {
    setPhase({ stage: 'lobby' })
  }

  function handleStartPlayback() {
    if (phase.stage !== 'preview') return
    setPhase({ stage: 'playback', roomCode: phase.roomCode, player: phase.player, tracks: phase.tracks })
  }

  function handleBackToPreview() {
    if (phase.stage !== 'playback') return
    setPhase({ stage: 'preview', roomCode: phase.roomCode, player: phase.player, tracks: phase.tracks })
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <header className="mb-10 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
          Play My <span className="text-indigo-400">Playlist</span>
        </h1>
        <p className="mt-3 max-w-md text-slate-400">
          Submit your songs, deduplicate the list, and get ready to guess what your friends picked.
        </p>
      </header>

      {phase.stage === 'lobby' && <RoomCard onJoin={handleJoin} />}

      {phase.stage === 'submission' && (
        <div className="flex w-full max-w-xl flex-col items-center gap-4">
          <RoomBanner roomCode={phase.roomCode} playerName={phase.player.name} />
          <SongSubmissionForm playerName={phase.player.name} onSubmit={handleSubmit} />
        </div>
      )}

      {phase.stage === 'preview' && (
        <div className="flex w-full max-w-xl flex-col items-center gap-4">
          <RoomBanner roomCode={phase.roomCode} playerName={phase.player.name} />
          <DedupPreview
            tracks={phase.tracks}
            onReset={handleReset}
            onPlay={handleStartPlayback}
          />
        </div>
      )}

      {phase.stage === 'playback' && (
        <div className="flex w-full flex-col items-center gap-4">
          <RoomBanner roomCode={phase.roomCode} playerName={phase.player.name} />
          <PlayerStage tracks={phase.tracks} onBack={handleBackToPreview} />
        </div>
      )}

      {roomState && (
        <footer className="mt-8 text-center text-xs text-slate-500">
          Room {roomState.roomCode} · Status:{' '}
          <span className="font-semibold text-indigo-300">{roomState.status}</span> ·{' '}
          {Object.values(roomState.players).length} player
          {Object.values(roomState.players).length === 1 ? '' : 's'} · {roomState.tracks.length}{' '}
          unique track{roomState.tracks.length === 1 ? '' : 's'}
        </footer>
      )}
    </div>
  )
}

interface RoomBannerProps {
  roomCode: string
  playerName: string
}

function RoomBanner({ roomCode, playerName }: RoomBannerProps) {
  return (
    <div className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3">
      <span className="text-sm text-slate-400">Room</span>
      <span className="rounded-lg bg-indigo-500/20 px-2 py-0.5 font-mono font-bold text-indigo-300">
        {roomCode}
      </span>
      <span className="text-slate-600">•</span>
      <span className="text-sm text-slate-300">{playerName}</span>
    </div>
  )
}
