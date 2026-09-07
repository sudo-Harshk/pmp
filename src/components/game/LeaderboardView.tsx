import { useEffect } from 'react'
import confetti from 'canvas-confetti'
import type { RoomState } from '@/types/game'

interface LeaderboardViewProps {
  room: RoomState
  isHost: boolean
  onPlayAgain: () => void
  onEndRoom: () => void
  onLeave: () => void
}

function fireConfetti(): void {
  const defaults = { zIndex: 40, spread: 360, ticks: 200, gravity: 0.9 }

  confetti({ ...defaults, particleCount: 100, origin: { y: 0.3 } })
  setTimeout(() => confetti({ ...defaults, particleCount: 60, angle: 60, origin: { x: 0, y: 0.6 } }), 250)
  setTimeout(() => confetti({ ...defaults, particleCount: 60, angle: 120, origin: { x: 1, y: 0.6 } }), 400)
  setTimeout(
    () =>
      confetti({
        ...defaults,
        particleCount: 120,
        scalar: 1.2,
        shapes: ['circle', 'square', 'star'],
        origin: { y: 0.4 },
      }),
    700,
  )
}

export default function LeaderboardView({
  room,
  isHost,
  onPlayAgain,
  onEndRoom,
  onLeave,
}: LeaderboardViewProps) {
  const players = Object.values(room.players).sort(
    (a, b) => b.score - a.score || (b.bestRound ?? 0) - (a.bestRound ?? 0) || a.name.localeCompare(b.name),
  )
  const winner = players[0]
  const tracksPlayed = room.tracks.filter((t) => t.played).length

  useEffect(() => {
    fireConfetti()
  }, [])

  return (
    <div className="w-full max-w-md space-y-4">
      <div
        className={`rounded-2xl p-px ${
          winner ? 'bg-gradient-to-br from-amber-400 via-yellow-300 to-amber-500' : 'border border-slate-700'
        }`}
      >
        <div className="rounded-[15px] bg-slate-900 px-6 py-6 shadow-xl">
          <h2 className="text-center text-2xl font-bold text-white">Final Results</h2>

          {winner ? (
            <div className="mt-4 text-center">
              <div className="text-4xl">👑</div>
              <p className="mt-1 text-xs uppercase tracking-wider text-amber-300">Winner</p>
              <p className="mt-1 text-2xl font-bold text-amber-200">{winner.name}</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Stat label="Total Score" value={`${winner.score}`} />
                <Stat label="Best Round" value={`+${winner.bestRound ?? 0}`} />
              </div>
            </div>
          ) : (
            <p className="mt-4 text-center text-slate-400">No players.</p>
          )}
        </div>
      </div>

      <ol className="space-y-2">
        {players.map((player, index) => (
          <li
            key={player.id}
            className={`flex items-center justify-between rounded-lg border px-3 py-2 ${
              index === 0
                ? 'border-amber-400/50 bg-amber-400/10'
                : 'border-slate-700 bg-slate-800/60'
            } ${index === 0 ? 'animate-pulse' : ''}`}
          >
            <span className="flex items-center gap-2 text-sm text-white">
              <span className="w-6 text-center font-mono text-slate-500">#{index + 1}</span>
              {player.name}
              {index === 0 && <span className="text-amber-300">👑</span>}
            </span>
            <span className="font-mono text-sm text-slate-300">{player.score}</span>
          </li>
        ))}
      </ol>

      {tracksPlayed > 0 && (
        <p className="rounded-lg bg-slate-800/60 px-3 py-2 text-center text-xs text-slate-400">
          {tracksPlayed} track{tracksPlayed === 1 ? '' : 's'} played
        </p>
      )}

      {isHost ? (
        <>
          <button
            type="button"
            onClick={onPlayAgain}
            className="w-full rounded-lg bg-indigo-500 py-2.5 font-semibold text-white transition hover:bg-indigo-400"
          >
            🔄 Play Again (same code)
          </button>
          <button
            type="button"
            onClick={onEndRoom}
            className="w-full rounded-lg border border-rose-500/40 py-2.5 text-sm font-medium text-rose-300 transition hover:bg-rose-500/10"
          >
            End Room
          </button>
        </>
      ) : (
        <p className="rounded-lg bg-slate-800/70 px-3 py-3 text-center text-sm text-slate-300">
          Waiting for host to start a new game…
        </p>
      )}

      <button
        type="button"
        onClick={onLeave}
        className="w-full rounded-lg border border-slate-600 py-2.5 text-sm font-medium text-slate-300 transition hover:border-rose-500 hover:text-rose-300"
      >
        Return to Main Menu
      </button>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-800/70 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-0.5 font-mono text-lg font-bold text-amber-200">{value}</p>
    </div>
  )
}
