import type { RoomState } from '@/types/game'

interface LeaderboardViewProps {
  room: RoomState
}

export default function LeaderboardView({ room }: LeaderboardViewProps) {
  const players = Object.values(room.players).sort((a, b) => b.score - a.score)
  const winner = players[0]

  return (
    <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900/60 p-6 shadow-xl">
      <h2 className="text-center text-2xl font-bold text-white">Final Results</h2>

      {winner && (
        <div className="mt-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-center">
          <p className="text-xs uppercase tracking-wider text-amber-300">Winner</p>
          <p className="mt-1 text-xl font-bold text-amber-200">🏆 {winner.name}</p>
          <p className="text-sm text-amber-300">{winner.score} points</p>
        </div>
      )}

      <ol className="mt-6 space-y-2">
        {players.map((player, index) => (
          <li
            key={player.id}
            className={`flex items-center justify-between rounded-lg border px-3 py-2 ${
              index === 0
                ? 'border-amber-500/40 bg-slate-800/80'
                : 'border-slate-700 bg-slate-800/60'
            }`}
          >
            <span className="flex items-center gap-2 text-sm text-white">
              <span className="w-5 text-center font-mono text-slate-500">#{index + 1}</span>
              {player.name}
              {index === 0 && <span className="text-amber-300">👑</span>}
            </span>
            <span className="font-mono text-sm text-slate-300">{player.score}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}
