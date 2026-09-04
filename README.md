# pmp

Play My Playlist — a synchronous multiplayer YouTube playlist guessing game.

## What's implemented

- **`src/types/game.ts`** — Type definitions: `Submission`, `PlaylistTrack`, `Player`, `RoomState`, plus the `RoomStatus` union.
- **`src/lib/youtube.ts`** — Unit-tested helpers:
  - `extractVideoId(url)` — robustly extracts the 11-char video ID from `watch`, `youtu.be`, `embed`, and `shorts` URLs.
  - `processSubmissions(submissions)` — deduplicates identical video IDs, merges submitter names (no dupes), and returns unique `PlaylistTrack[]`.
- **UI components** (`src/components/`):
  - `RoomCard` — create/join a mock room with a player name.
  - `SongSubmissionForm` — dynamic N-song form (default 3, adjustable 1–10) with live valid/invalid YouTube URL indicators.
  - `DedupPreview` — shows the deduplicated playlist with per-track video ID and all submitters.
- **`src/App.tsx`** — local state wiring (lobby → submission → preview) using React `useState`.

## Scripts

```bash
npm install     # install dependencies
npm run dev     # start Vite dev server
npm test        # run vitest unit tests
npm run build   # typecheck + production build
npm run preview # preview the production build
```
