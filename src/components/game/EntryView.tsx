import { useState } from 'react'
import type { FormEvent } from 'react'

interface EntryViewProps {
  onCreateRoom: (hostName: string) => Promise<{ roomCode: string; playerId: string }>
  onJoinRoom: (roomCode: string, playerName: string) => Promise<string>
  onEntered: (roomCode: string) => void
}

type Mode = 'create' | 'join'

export default function EntryView({
  onCreateRoom,
  onJoinRoom,
  onEntered,
}: EntryViewProps) {
  const [mode, setMode] = useState<Mode>('create')
  const [name, setName] = useState('')
  const [roomCode, setRoomCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const canSubmit = name.trim().length > 0 && (mode === 'create' || roomCode.trim().length > 0)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!canSubmit || busy) return
    setBusy(true)
    setError(null)
    try {
      if (mode === 'create') {
        const result = await onCreateRoom(name.trim())
        onEntered(result.roomCode)
      } else {
        const code = await onJoinRoom(roomCode.trim(), name.trim())
        onEntered(code)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900/60 p-6 shadow-xl">
      <h2 className="mb-4 text-center text-2xl font-bold text-white">Play My Playlist</h2>

      <div className="mb-6 grid grid-cols-2 gap-1 rounded-lg bg-slate-800 p-1">
        <button
          type="button"
          onClick={() => setMode('create')}
          className={`rounded-md py-2 text-sm font-medium transition ${
            mode === 'create' ? 'bg-indigo-500 text-white shadow' : 'text-slate-300 hover:text-white'
          }`}
        >
          Create Room
        </button>
        <button
          type="button"
          onClick={() => setMode('join')}
          className={`rounded-md py-2 text-sm font-medium transition ${
            mode === 'join' ? 'bg-indigo-500 text-white shadow' : 'text-slate-300 hover:text-white'
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
              placeholder="e.g. ABCD"
              maxLength={4}
              className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-white placeholder-slate-500 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>
        )}

        {mode === 'create' && (
          <p className="rounded-lg bg-slate-800/70 px-3 py-2 text-xs text-slate-400">
            A random 4-letter room code will be generated for you.
          </p>
        )}

        {error && (
          <p role="alert" className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={!canSubmit || busy}
          className="w-full rounded-lg bg-indigo-500 py-2.5 font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
        >
          {busy ? '…' : mode === 'create' ? 'Create Room' : 'Join Room'}
        </button>
      </form>
    </div>
  )
}
