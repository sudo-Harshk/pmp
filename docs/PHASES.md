# Development Phases

A record of how this project was built, phase by phase. Each phase shipped as a commit on `main`.

## Phase 1 — Deduplication & Core Types

**Goal:** Define the domain types and the core YouTube parsing/deduplication logic.

- `src/types/game.ts` — `Submission`, `PlaylistTrack`, `Player`, `RoomState`, `RoomStatus`.
- `src/lib/youtube.ts`:
  - `extractVideoId(url)` — extracts the 11-char video ID from `watch`, `youtu.be`, `embed`, and `shorts` URLs (with boundary guards).
  - `processSubmissions(submissions)` — merges duplicate video IDs into a single `PlaylistTrack` whose `submittedBy` lists every submitter name without duplicates.
- `src/lib/youtube.test.ts` — 19 unit tests.
- Local prototype UI (room card, submission form, dedup preview) driven by `useState`.

**Commit:** `phase 1: playlist core`

## Phase 2 — Player, Timer & Error Handling

**Goal:** Add playback and the 30-second snippet timing loop.

- `src/components/YouTubePlayer.tsx` — `react-youtube` wrapper with programmatic play/pause and error handling for embed (101/150) and invalid/removed (2/100) videos.
- `src/lib/playerLogic.ts` — pure `snippetReducer` (START / PAUSE / TICK / RESET) plus track-boundary helpers.
- `src/lib/playerLogic.test.ts` — 12 tests for timer transitions and boundary conditions.
- `src/components/PlayerStage.tsx` — 30s countdown bar, Play/Pause/Next controls, embed-error banner.

**Commit:** `phase 2: player + timer`

## Phase 3 — Firebase Sync, Game Loop, Voting & Scoring

**Goal:** Make it synchronous and multiplayer in real time.

- **Dependency:** Firebase Realtime Database (`src/lib/firebase.ts`).
- **Environment:** `.env.local` / `.env.example` with `VITE_FIREBASE_*` vars; typed via `src/vite-env.d.ts`.
- **Types extended:** `LOBBY | SUBMISSION | PLAYING | REVEAL | GAMEOVER`, plus `hostId`, `currentTrackIndex`, `timerSeconds`, `guesses`, `scoreDeltas`.
- `src/lib/scoring.ts` — `calculateRoundScores`: +10 per correct guess, +5 per incorrect guess split among submitters; `src/lib/scoring.test.ts` (10 tests).
- `src/hooks/useRoom.ts` — `onValue` listener + `createRoom`/`joinRoom`/`submitSongs`/`submitGuess`/`startSubmission`/`hostReveal`/`hostNext`/`updateGameState` with transactions for concurrency.
- `src/components/game/` — Entry, Lobby, Submission, Game, Reveal, Leaderboard views.
- `src/App.tsx` — routes views by `room.status`.

**Commit:** `feat: implement Phase 3 real-time game loop, scoring, and Firebase sync`

## Phase 4 — Session Persistence, UX Polish & Production Readiness

**Goal:** Rejoin support, better UX, and deploy preparation.

- **Dependencies:** `canvas-confetti` (+ types), `jsdom` (for tests).
- `src/lib/storage.ts` (+ tests) — `saveSession` / `getSession` / `clearSession` under `play_my_playlist_session`.
- **Auto-rejoin** — `useRoom` restores identity on reload if the room + player still exist, for both hosts and clients; otherwise silently clears and returns to `EntryView`.
- **Leave Room** — `leaveRoom()` removes the player from RTDB; Leave buttons in the header, `LobbyView`, and leaderboard.
- `LeaderboardView` — multi-burst `canvas-confetti` on mount, gold gradient winner card, total score + best-round stats.
- `GameView` — **Hide Video (Audio-Only Mode)** toggle with an animated equalizer/vinyl overlay to hide titles and thumbnails.
- `vercel.json` — SPA rewrite `/(.*)` → `/index.html` for free static hosting.

**Commit:** `feat: add session persistence, confetti, audio-only mode, and Vercel config`

## Refinements — Intermission, Vote Lock-In & Casual Jukebox Mode

**Goal:** Small game-loop refinements and a casual playback mode without changing the scoring/session core.

- **Types:** `RoomStatus` adds `INTERMISSION`; new `GameMode = 'GUESSING' | 'JUKEBOX'`; `RoomState` gains `mode` (default `GUESSING`) and `playbackPaused`. Sync constants `INTERMISSION_DURATION_SECONDS = 7` and `JUKEBOX_MAX_SECONDS = 180` and pure `navigateJukebox()` helper added to `src/lib/playerLogic.ts`.
- **Vote lock-in** — `src/components/game/GameView.tsx`: once a player submits a guess, all voting buttons disable immediately via local `voteLocked` state and show `Vote Locked ✅`; state resets on the next track/status change.
- **Intermission stage** — New `src/components/game/IntermissionView.tsx` plus `useRoom` host ticker: `hostNext` now transitions `REVEAL` → `INTERMISSION` (sets `currentTrackIndex + 1`, `timerSeconds = 7`) or `GAMEOVER` on the last track; a host-only `setInterval` in `useRoom` ticks `timerSeconds` down and auto-calls `hostNext` (`INTERMISSION` → `PLAYING`) at zero. `App.tsx` adds `case 'INTERMISSION'` rendering the banner `Next track starting in X seconds...`.
- **Casual jukebox mode** — Host toggle in `src/components/game/LobbyView.tsx` (`Mode: Guessing Game | Casual Jukebox`) calls `setMode()`. `src/components/game/JukeboxView.tsx` plays the current track in full (or 180 s max), shows submitter(s) openly, and exposes host-synced `Prev / Next / Pause` via `jukeboxNavigate()` (transaction, `finished` on last `NEXT`) and `setPlaybackPaused()`; guessing `REVEAL`/`INTERMISSION` and voting are skipped. `src/App.tsx` branches `case 'PLAYING'` on `room.mode` to `JukeboxView` vs `GameView`, and `useRoom.fromFirestoreRoom()` defaults legacy rooms to `GUESSING`.
- **Tests:** `src/lib/playerLogic.test.ts` adds 10 cases — 2 for duration constants + 8 for `navigateJukebox()` (NEXT advance, NEXT on last → finished, PREV step-back/clamp, single-track, empty, out-of-bounds).

## Test Coverage Overview

| Suite                        | File                     | Cases | Focus                                              |
| ---------------------------- | ------------------------ | ----- | -------------------------------------------------- |
| YouTube                      | `youtube.test.ts`        | 19    | ID extraction + dedup                                |
| Scoring                      | `scoring.test.ts`        | 10    | Guess points + submitter bonus distribution         |
| Player logic (timer + nav)   | `playerLogic.test.ts`    | 22    | Countdown, track boundaries, intermission/jukebox  |
| Session storage              | `storage.test.ts`        | 9     | Persistence round-trip (jsdom)                     |
| **Total**                    |                          | **60**|                                                    |
