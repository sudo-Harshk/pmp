import type { RoomState } from '@/types/game'

interface LobbyViewProps {
  room: RoomState
  myPlayerId: string | null
  isHost: boolean
  onStartSubmission: () => void
}

export default function LobbyView({
  room,
  myPlayerId,
  isHost,
  onStartSubmission,
}: LobbyViewProps) {
  const players = Object.values(room.players)

  return (
    <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900/60 p-6 shadow-xl">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white">Room</h2>
        <p className="mt-1 font-mono text-4xl font-extrabold tracking-[0.3em] text-indigo-300">
          {room.roomCode}
        </p>
        <p className="mt-2 text-sm text-slate-400">
          Share this code with your friends to play together.
        </p>
      </div>

      <div className="mt-6">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Players ({players.length})
        </h3>
        <ul className="space-y-2">
          {players.map((player) => (
            <li
              key={player.id}
              className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2"
            >
              <span className="text-sm text-white">
                {player.name}
                {player.id === myPlayerId && (
                  <span className="ml-2 rounded-full bg-indigo-500/20 px-2 py-0.5 text-[10px] font-semibold text-indigo-300">
                    You
                  </span>
                )}
                {room.hostId === player.id && (
                  <span className="ml-2 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                    Host
                  </span>
                )}
              </span>
              <span className="font-mono text-sm text-slate-400">{player.score}</span>
            </li>
          ))}
        </ul>
      </div>

      {isHost ? (
        <button
          type="button"
          onClick={onStartSubmission}
          disabled={players.length < 2}
          className="mt-6 w-full rounded-lg bg-indigo-500 py-2.5 font-semibold text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
        >
          Start Submission
        </button>
      ) : (
        <p className="mt-6 rounded-lg bg-slate-800/70 px-3 py-3 text-center text-sm text-slate-300">
          Waiting for the host to start the game…
        </p>
      )}
    </div>
  )
}
