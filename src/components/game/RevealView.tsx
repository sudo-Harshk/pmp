import type { RoomState } from '@/types/game'

interface RevealViewProps {
  room: RoomState
  isHost: boolean
  onNext: () => void
}

export default function RevealView({ room, isHost, onNext }: RevealViewProps) {
  const track = room.tracks[room.currentTrackIndex]
  const players = Object.values(room.players)
  const isLastTrack = room.currentTrackIndex >= room.tracks.length - 1

  if (!track) {
    return <p className="text-slate-400">No track to reveal.</p>
  }

  const submitterNames = new Set(track.submittedBy)
  const deltas = room.scoreDeltas ?? []
  const deltaById = new Map(deltas.map((d) => [d.playerId, d.delta]))

  return (
    <div className="w-full max-w-2xl space-y-4">
      <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Reveal</h2>
          <span className="text-xs text-slate-400">
            Track {room.currentTrackIndex + 1} of {room.tracks.length}
          </span>
        </div>

        <div className="rounded-lg bg-slate-800/70 px-4 py-3">
          <p className="text-xs uppercase tracking-wider text-slate-400">Submitted by</p>
          <p className="mt-1 text-lg font-semibold text-indigo-300">
            {track.submittedBy.join(', ')}
          </p>
        </div>

        <h3 className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Guesses
        </h3>
        <ul className="space-y-2">
          {players
            .filter((p) => room.guesses[p.id] || (deltaById.get(p.id) ?? 0) > 0)
            .map((p) => {
              const guessed = room.guesses[p.id]
              const isGuesser = Boolean(guessed)
              const correct = isGuesser ? submitterNames.has(guessed) : false
              const delta = deltaById.get(p.id) ?? 0
              const isSubmitter = submitterNames.has(p.name)
              return (
                <li
                  key={p.id}
                  className={`flex items-center justify-between rounded-lg border px-3 py-2 ${
                    isGuesser && correct
                      ? 'border-emerald-500/40 bg-emerald-500/10'
                      : isGuesser
                        ? 'border-slate-700 bg-slate-800/60'
                        : 'border-amber-500/30 bg-amber-500/10'
                  }`}
                >
                  <span className="text-sm text-white">
                    {isGuesser ? (
                      <>
                        {p.name} guessed <span className="font-semibold">{guessed}</span>
                      </>
                    ) : isSubmitter ? (
                      <>
                        {p.name} <span className="text-amber-300">sat out — your track</span>
                      </>
                    ) : (
                      <>{p.name} did not guess</>
                    )}
                  </span>
                  <span
                    className={`text-sm font-semibold ${
                      delta > 0 ? 'text-emerald-400' : 'text-slate-500'
                    }`}
                  >
                    {isGuesser ? (correct ? '✓' : '✗') : '★'} {delta > 0 ? `+${delta}` : ''}
                  </span>
                </li>
              )
            })}
        </ul>

        {players.filter((p) => room.guesses[p.id] || (deltaById.get(p.id) ?? 0) > 0).length === 0 && (
          <p className="mt-3 text-sm text-slate-500">No one cast a guess this round.</p>
        )}
      </div>

      {isHost && (
        <button
          type="button"
          onClick={onNext}
          className="w-full rounded-lg bg-indigo-500 py-2.5 font-semibold text-white transition hover:bg-indigo-400"
        >
          {isLastTrack ? 'View Final Results' : 'Next Track'}
        </button>
      )}
    </div>
  )
}
