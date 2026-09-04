import type { RoomState } from '@/types/game'
import { INTERMISSION_DURATION_SECONDS } from '@/lib/playerLogic'

interface IntermissionViewProps {
  room: RoomState
}

export default function IntermissionView({ room }: IntermissionViewProps) {
  const seconds = Math.max(0, room.timerSeconds ?? INTERMISSION_DURATION_SECONDS)
  const nextTrack = room.tracks[room.currentTrackIndex]

  return (
    <div className="w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-900/60 p-8 text-center shadow-xl">
      <p className="text-xs font-semibold uppercase tracking-widest text-indigo-300">
        Intermission
      </p>
      <h2 className="mt-2 text-2xl font-bold text-white">Next track starting in {seconds} seconds…</h2>
      <p className="mt-2 text-sm text-slate-400">Take a breather — talk it out before the next song.</p>

      {nextTrack && (
        <p className="mx-auto mt-6 inline-block rounded-lg bg-slate-800/70 px-4 py-2 text-sm text-slate-300">
          Up next: <span className="font-semibold text-white">Track {room.currentTrackIndex + 1}</span>
        </p>
      )}

      <div className="mx-auto mt-6 h-2 w-full max-w-xs overflow-hidden rounded-full bg-slate-800">
        <div
          className="h-full rounded-full bg-indigo-500 transition-all duration-1000 ease-linear"
          style={{
            width: `${((INTERMISSION_DURATION_SECONDS - seconds) / INTERMISSION_DURATION_SECONDS) * 100}%`,
          }}
        />
      </div>
    </div>
  )
}
