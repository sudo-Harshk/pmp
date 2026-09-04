import { useState } from 'react'
import { useRoom } from '@/hooks/useRoom'
import EntryView from '@/components/game/EntryView'
import LobbyView from '@/components/game/LobbyView'
import SubmissionView from '@/components/game/SubmissionView'
import GameView from '@/components/game/GameView'
import RevealView from '@/components/game/RevealView'
import LeaderboardView from '@/components/game/LeaderboardView'
import type { RoomState } from '@/types/game'

export default function App() {
  const [roomCode, setRoomCode] = useState<string | null>(null)
  const {
    room,
    myPlayerId,
    isHost,
    createRoom,
    joinRoom,
    submitSongs,
    submitGuess,
    startSubmission,
    hostReveal,
    hostNext,
    updateGameState,
  } = useRoom(roomCode ?? undefined)

  async function handleSubmitSongs(urls: string[]) {
    if (!roomCode || !myPlayerId) return
    await submitSongs(roomCode, myPlayerId, urls)
  }

  async function handleGuess(guessedName: string) {
    if (!roomCode || !myPlayerId) return
    await submitGuess(roomCode, myPlayerId, guessedName)
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <header className="mb-10 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
          Play My <span className="text-indigo-400">Playlist</span>
        </h1>
        <p className="mt-3 max-w-md text-slate-400">
          Whoever guesses which player submitted the song earns the points.
        </p>
      </header>

      {!roomCode && (
        <EntryView onCreateRoom={createRoom} onJoinRoom={joinRoom} onEntered={setRoomCode} />
      )}

      {roomCode && room === null && (
        <p className="text-slate-400">Connecting to room {roomCode}…</p>
      )}

      {roomCode && room && (
        <Content
          room={room}
          myPlayerId={myPlayerId}
          isHost={isHost}
          onStartSubmission={() => roomCode && startSubmission(roomCode)}
          onSubmitSongs={handleSubmitSongs}
          onGuess={handleGuess}
          onUpdateGameState={(updates: Partial<RoomState>) =>
            roomCode && updateGameState(roomCode, updates)
          }
          onHostReveal={() => roomCode && hostReveal(roomCode)}
          onNext={() => roomCode && hostNext(roomCode)}
        />
      )}
    </div>
  )
}

interface ContentProps {
  room: RoomState
  myPlayerId: string | null
  isHost: boolean
  onStartSubmission: () => void
  onSubmitSongs: (urls: string[]) => void
  onGuess: (guessedName: string) => void
  onUpdateGameState: (updates: Partial<RoomState>) => void
  onHostReveal: () => void
  onNext: () => void
}

function Content({
  room,
  myPlayerId,
  isHost,
  onStartSubmission,
  onSubmitSongs,
  onGuess,
  onUpdateGameState,
  onHostReveal,
  onNext,
}: ContentProps) {
  switch (room.status) {
    case 'LOBBY':
      return (
        <LobbyView
          room={room}
          myPlayerId={myPlayerId}
          isHost={isHost}
          onStartSubmission={onStartSubmission}
        />
      )
    case 'SUBMISSION':
      return (
        <SubmissionView room={room} myPlayerId={myPlayerId} onSubmitSongs={onSubmitSongs} />
      )
    case 'PLAYING':
      return (
        <GameView
          room={room}
          myPlayerId={myPlayerId}
          isHost={isHost}
          onSubmitGuess={onGuess}
          onUpdateGameState={onUpdateGameState}
          onHostReveal={onHostReveal}
        />
      )
    case 'REVEAL':
      return <RevealView room={room} isHost={isHost} onNext={onNext} />
    case 'GAMEOVER':
      return <LeaderboardView room={room} />
    default:
      return null
  }
}
