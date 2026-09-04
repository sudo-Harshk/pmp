import type { PlaylistTrack } from '@/types/game'

interface DedupPreviewProps {
  tracks: PlaylistTrack[]
  onReset: () => void
  onPlay?: () => void
}

export default function DedupPreview({ tracks, onReset, onPlay }: DedupPreviewProps) {
  const duplicates = tracks.filter((t) => t.submittedBy.length > 1)
  const singles = tracks.filter((t) => t.submittedBy.length === 1)

  return (
    <div className="w-full max-w-xl rounded-2xl border border-slate-700 bg-slate-900/60 p-6 shadow-xl">
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Deduplicated Playlist</h2>
          <p className="mt-1 text-sm text-slate-400">
            {tracks.length} unique track{tracks.length === 1 ? '' : 's'} from your submissions
          </p>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="rounded-md border border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-slate-700"
        >
          Start Over
        </button>
      </div>

      {duplicates.length > 0 && (
        <section className="mb-5">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-amber-400">
            Duplicates Merged
          </h3>
          <ul className="space-y-2">
            {duplicates.map((track) => (
              <TrackRow key={track.videoId} track={track} duplicated />
            ))}
          </ul>
        </section>
      )}

      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Full Playlist
        </h3>
        {tracks.length === 0 ? (
          <p className="rounded-lg bg-slate-800/70 px-3 py-6 text-center text-sm text-slate-500">
            No valid tracks were found.
          </p>
        ) : (
          <ul className="space-y-2">
            {tracks.map((track) => (
              <TrackRow key={track.videoId} track={track} />
            ))}
          </ul>
        )}
      </section>

      {singles.length > 0 && (
        <p className="mt-5 rounded-lg bg-slate-800/70 px-3 py-2 text-sm text-slate-400">
          <span className="font-semibold text-emerald-400">{singles.length} track{singles.length === 1 ? '' : 's'}</span>{' '}
          submitted by a single player.
        </p>
      )}

      {onPlay && (
        <button
          type="button"
          onClick={onPlay}
          disabled={tracks.length === 0}
          className="mt-5 w-full rounded-lg bg-emerald-500 py-2.5 font-semibold text-slate-900 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
        >
          Start Playback ({tracks.length} track{tracks.length === 1 ? '' : 's'})
        </button>
      )}
    </div>
  )
}

interface TrackRowProps {
  track: PlaylistTrack
  duplicated?: boolean
}

function TrackRow({ track, duplicated = false }: TrackRowProps) {
  return (
    <li
      className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${
        duplicated ? 'border-amber-500/40 bg-amber-500/5' : 'border-slate-700 bg-slate-800/60'
      }`}
    >
      <span
        className={`inline-flex h-2.5 w-2.5 shrink-0 rounded-full ${
          track.played ? 'bg-emerald-400' : 'bg-slate-500'
        }`}
        title={track.played ? 'Played' : 'Not played'}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate font-mono text-sm text-indigo-300">{track.videoId}</p>
        <p className="mt-0.5 text-xs text-slate-400">
          {track.submittedBy.length === 1
            ? `Submitted by: ${track.submittedBy[0]}`
            : `Submitted by: ${track.submittedBy.join(', ')}`}
        </p>
      </div>
      {duplicated && (
        <span className="shrink-0 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-300">
          {track.submittedBy.length}x
        </span>
      )}
    </li>
  )
}
