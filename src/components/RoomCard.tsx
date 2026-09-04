import { useState } from 'react'
import type { FormEvent } from 'react'

interface RoomCardProps {
  onJoin: (name: string, roomCode: string) => void
}

type Mode = 'create' | 'join'

export default function RoomCard({ onJoin }: RoomCardProps) {
  const [mode, setMode] = useState<Mode>('create')
  const [name, setName] = useState('')
  const [roomCode, setRoomCode] = useState('')

  const canSubmit = name.trim().length > 0 && (mode === 'create' || roomCode.trim().length > 0)

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!canSubmit) return
    const code =
      mode === 'create'
        ? roomCode.trim() || generateRoomCode()
        : roomCode.trim().toUpperCase()
    onJoin(name.trim(), code)
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900/60 p-6 shadow-xl">
      <h2 className="mb-4 text-center text-2xl font-bold text-white">Join a Game</h2>

      <div className="mb-6 grid grid-cols-2 gap-1 rounded-lg bg-slate-800 p-1">
        <button
          type="button"
          onClick={() => setMode('create')}
          className={`rounded-md py-2 text-sm font-medium transition ${
            mode === 'create'
              ? 'bg-indigo-500 text-white shadow'
              : 'text-slate-300 hover:text-white'
          }`}
        >
          Create Room
        </button>
        <button
          type="button"
          onClick={() => setMode('join')}
          className={`rounded-md py-2 text-sm font-medium transition ${
            mode === 'join'
              ? 'bg-indigo-500 text-white shadow'
              : 'text-slate-300 hover:text-white'
          }`}
        >
          Join Room
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="player-name" className="mb-1 block text-sm font-medium text-slate-300">
            Your Name
          </label>
          <input
            id="player-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Alice"
            maxLength={32}
            className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-white placeholder-slate-500 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
          />
        </div>

        {mode === 'join' && (
          <div>
            <label htmlFor="room-code" className="mb-1 block text-sm font-medium text-slate-300">
              Room Code
            </label>
            <input
              id="room-code"
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              placeholder="e.g. ABC123"
              maxLength={6}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-white placeholder-slate-500 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>
        )}

        {mode === 'create' && (
          <p className="rounded-lg bg-slate-800/70 px-3 py-2 text-xs text-slate-400">
            A random room code will be generated for you.
          </p>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full rounded-lg bg-indigo-500 py-2.5 font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
        >
          {mode === 'create' ? 'Create Room' : 'Join Room'}
        </button>
      </form>
    </div>
  )
}

function generateRoomCode(): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)]
  }
  return code
}
