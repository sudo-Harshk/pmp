import { useState } from 'react'
import { useRoom } from '@/hooks/useRoom'
import { clearSession, getSession, saveSession } from '@/lib/storage'
import EntryView from '@/components/game/EntryView'
import LobbyView from '@/components/game/LobbyView'
import SubmissionView from '@/components/game/SubmissionView'
import GameView from '@/components/game/GameView'
import JukeboxView from '@/components/game/JukeboxView'
import IntermissionView from '@/components/game/IntermissionView'
import RevealView from '@/components/game/RevealView'
import LeaderboardView from '@/components/game/LeaderboardView'
import type { GameMode, RoomState } from '@/types/game'

export default function App() {
  const [roomCode, setRoomCode] = useState<string | null>(() => getSession()?.roomCode ?? null)

  const {
    room,
    myPlayerId,
    isHost,
    serverOffset,
    createRoom,
    joinRoom,
    submitSongs,
    submitGuess,
    startSubmission,
    hostNext,
    setMode,
    jukeboxNavigate,
    jukeboxJump,
    jukeboxSeek,
    setPlaybackPaused,
    leaveRoom,
  } = useRoom(roomCode ?? undefined, {
    onInvalidSession: () => {
      clearSession()
      setRoomCode(null)
    },
  })

  async function handleCreateRoom(hostName: string) {
    const result = await createRoom(hostName)
    saveSession(result.roomCode, result.playerId)
    setRoomCode(result.roomCode)
    return result
  }

  async function handleJoinRoom(code: string, playerName: string) {
    const playerId = await joinRoom(code, playerName)
    saveSession(code.trim().toUpperCase(), playerId)
    setRoomCode(code.trim().toUpperCase())
    return playerId
  }

  function handleLeave() {
    if (roomCode && myPlayerId) {
      void leaveRoom(roomCode, myPlayerId)
    }
    clearSession()
    setRoomCode(null)
  }

  async function handleSubmitSongs(urls: string[]) {
    if (!roomCode || !myPlayerId) return
    await submitSongs(roomCode, myPlayerId, urls)
  }

  async function handleGuess(guessedName: string) {
    if (!roomCode || !myPlayerId) return
    await submitGuess(roomCode, myPlayerId, guessedName)
  }

  const inRoom = roomCode !== null

  return (
    <div className="flex min-h-screen flex-col px-4 py-6">
      <header className="mb-6 flex h-14 items-center justify-between">
        <h1 className="text-xl font-extrabold tracking-tight text-white">
          Play My <span className="text-indigo-400">Playlist</span>
        </h1>
        {inRoom && (
          <button
            type="button"
            onClick={handleLeave}
            className="rounded-md border border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-rose-500 hover:text-rose-300"
          >
            Leave Room
          </button>
        )}
      </header>

      <main className="flex flex-1 flex-col items-center justify-center">
        {!inRoom && (
          <EntryView
            onCreateRoom={handleCreateRoom}
            onJoinRoom={handleJoinRoom}
            onEntered={(code) => {
              // session already saved by create/join handlers
              setRoomCode(code)
            }}
          />
        )}

        {inRoom && room === null && (
          <p className="text-slate-400">Connecting to room {roomCode}…</p>
        )}

        {inRoom && room && (
          <Content
            room={room}
            myPlayerId={myPlayerId}
            isHost={isHost}
            serverOffset={serverOffset}
            onStartSubmission={() => roomCode && startSubmission(roomCode)}
            onSubmitSongs={handleSubmitSongs}
            onGuess={handleGuess}
            onNext={() => roomCode && hostNext(roomCode)}
            onSetMode={(mode: GameMode) => roomCode && setMode(roomCode, mode)}
            onJukeboxNavigate={(nav: { type: 'PREV' } | { type: 'NEXT' }) =>
              roomCode && jukeboxNavigate(roomCode, nav)
            }
            onJukeboxJump={(idx: number) => roomCode && jukeboxJump(roomCode, idx)}
            onJukeboxSeek={(sec: number) => roomCode && jukeboxSeek(roomCode, sec)}
            onSetPlaybackPaused={(paused: boolean) =>
              roomCode && setPlaybackPaused(roomCode, paused)
            }
            onLeave={handleLeave}
          />
        )}
      </main>
    </div>
  )
}

interface ContentProps {
  room: RoomState
  myPlayerId: string | null
  isHost: boolean
  serverOffset: number
  onStartSubmission: () => void
  onSubmitSongs: (urls: string[]) => void
  onGuess: (guessedName: string) => void
  onNext: () => void
  onSetMode: (mode: GameMode) => void
  onJukeboxNavigate: (nav: { type: 'PREV' } | { type: 'NEXT' }) => void
  onJukeboxJump: (index: number) => void
  onJukeboxSeek: (seconds: number) => void
  onSetPlaybackPaused: (paused: boolean) => void
  onLeave: () => void
}

function Content({
  room,
  myPlayerId,
  isHost,
  serverOffset,
  onStartSubmission,
  onSubmitSongs,
  onGuess,
  onNext,
  onSetMode,
  onJukeboxNavigate,
  onJukeboxJump,
  onJukeboxSeek,
  onSetPlaybackPaused,
  onLeave,
}: ContentProps) {
  switch (room.status) {
    case 'LOBBY':
      return (
        <LobbyView
          room={room}
          myPlayerId={myPlayerId}
          isHost={isHost}
          onStartSubmission={onStartSubmission}
          onSetMode={onSetMode}
          onLeave={onLeave}
        />
      )
    case 'SUBMISSION':
      return (
        <SubmissionView
          room={room}
          myPlayerId={myPlayerId}
          isHost={isHost}
          onSubmitSongs={onSubmitSongs}
          onNext={onNext}
        />
      )
    case 'PLAYING':
      if (room.mode === 'JUKEBOX') {
        return (
          <JukeboxView
            room={room}
            serverOffset={serverOffset}
            onNavigate={onJukeboxNavigate}
            onJump={onJukeboxJump}
            onSeek={onJukeboxSeek}
            onSetPaused={onSetPlaybackPaused}
          />
        )
      }
      return (
        <GameView
          room={room}
          myPlayerId={myPlayerId}
          isHost={isHost}
          onSubmitGuess={onGuess}
          onSkip={onNext}
        />
      )
    case 'REVEAL':
      return <RevealView room={room} isHost={isHost} onNext={onNext} />
    case 'INTERMISSION':
      return <IntermissionView room={room} />
    case 'GAMEOVER':
      return <LeaderboardView room={room} onLeave={onLeave} />
    default:
      return null
  }
}
