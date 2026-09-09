# Play My Playlist (pmp)

A **synchronous multiplayer** YouTube playlist guessing game built with React + TypeScript, Vite, Tailwind CSS, and Firebase Realtime Database.

Players submit YouTube links, the game deduplicates identical songs into a single track, and everyone guesses **who** submitted each song within a 15-second snippet. Correct guesses and submitter bonuses earn points; the highest scorer takes the crown.

## Highlights

- **Real-time multiplayer** — rooms with auto-generated Telugu-cinema names (`Pokiri Playlist`, `DJ Tillu Tunes` — tap 🎲 to reroll, each with its joke explained 💡), live submissions, voting, and a host-managed loop synced over Firebase RTDB.
- **Two play modes** — host picks in the lobby: **Guessing Game** (15 s snippet + voting + reveal + 5 s intermission) or **Casual Jukebox** (common shuffled playlist, full playback up to 3 min, Spotify-like jam).
- **Shuffled playlist** — Fisher–Yates shuffle (open-source, `crypto.getRandomValues` → `Math.random` fallback) once at game start so order is never straight; deduped tracks never leak submitter order.
- **Watch-party sync** — absolute `roundStartTime` + server-clock correction + `seekTo` drift fix (everyone hears the same second, even late join).
- **Jukebox common queue** — shuffled Fisher–Yates playlist visible as a queue below the player, **anyone** can `Prev / Pause / Next / Seek / tap to jump`, all synced via `roundStartTime`.
- **Smart deduplication** — duplicate songs merge into one track listing every submitter.
- **Embedded player** — `react-youtube` with `seekTo`/`getCurrentTime`/`getDuration`, error handling for `101/150` embed blocks and `100` invalid, plus **Skip Unplayable Track** shown to everyone only when `101/150/100` (anyone can tap, consistent banner).
- **Audio-Only Mode** — hide the video (equalizer/vinyl overlay) for extra challenge.
- **Concealed voting** — every screen shows the identical `Who submitted this song?` grid (full roster including yourself, same sorted order); submitter's tap is a local dummy — identical `Vote Locked ✅` with zero Firebase write or scoring impact, indistinguishable to a shoulder-surfer.
- **Intermission breathing space** — 7 s synchronized countdown banner between reveal and the next track.
- **Session persistence + host failover + toasts** — reload/rejoin without losing identity; `onDisconnect` auto-cleans ghosts on tab-close; `🟢 joined` / `🔴 left` / `👑 You are now host` toasts for everyone; host failover auto-promotes.
- **Mid-game rejoin** — anyone can join the same 4-letter code during `SUBMISSION`/`PLAYING`/`REVEAL`/`INTERMISSION` and lands on the current screen; only `GAMEOVER` blocks with `Game over — ask the host to start a new room`.
- **Genuine scoring** — `+10` per correct, `+5 × incorrect` split only among live submitters (no leakage), submitter self-guesses ignored, double-reveal blocked, `bestRound` tiebreak.
- **Victory confetti** — celebratory cannon on the final leaderboard.

## Tech Stack

| Layer      | Choice                                  |
| ---------- | --------------------------------------- |
| UI         | React 18 + TypeScript                   |
| Build      | Vite                                    |
| Styling    | Tailwind CSS v3                         |
| Backend    | Firebase Realtime Database (modular SDK)|
| Video      | `react-youtube` (YouTube IFrame API)    |
| Testing    | Vitest + jsdom                          |
| Hosting    | Vercel (static SPA)                     |

## Project Status

Phases 1–4 are complete; refinements and commercial hardening are now on `main`:

- **Phase 1** — Core types, YouTube parsing & deduplication helpers + tests
- **Phase 2** — Embedded player, 30 s snippet timer, error handling
- **Phase 3** — Firebase sync, real-time game loop, voting & scoring
- **Phase 4** — Session persistence, confetti, audio-only mode, Vercel config
- **Refinements** — 7 s intermission, vote lock-in, jukebox mode
- **Hardening & Jam** — shuffled Fisher–Yates playlist, vote-independence + sit-out-but-listen, absolute `roundStartTime` + `seekTo` sync, host failover, YouTube skip, scoring fixes, Jukebox common queue (anyone controls)
- **Room identity** — **fix:** `Room Name` is now separate from `Host Name` (auto-generated fun names with 🎲 reroll, editable, `≤32` chars; lobby + header show `🎬 {roomName} · {code}`, legacy rooms fall back to `Room {code}`)
- **Concealed voting** — **fix:** dummy local vote + hide self (3 buttons in 4-player) — every screen indistinguishable
- **Rejoin & toasts** — **fix:** mid-game join (except `GAMEOVER`), `onDisconnect` ghost cleanup, `🟢/🔴/👑` toasts, submission no longer soft-locks when someone is AFK, and **Skip Unplayable** is now consistent for everyone (`Anyone can skip` + anyone can tap during `PLAYING`)
- **Phase 1 — Room lifecycle** — **fix:** host **🔄 Play Again** resets the same room to lobby (same code/roster, scores zeroed) so rematches need no new code; host **End Room** deletes the node and routes everyone home; last-player leave auto-deletes (no orphans)
- **Phase 2 — Duplicate names** — **fix:** join rejects taken names (`Name already taken in this room`, case-insensitive) so two "Alice"s can never split votes or steal bonuses
- **Phase 3 — Jukebox skip consistency** — **fix:** Jukebox `Skip Unplayable Track` now shows only on `101/150/100` errors, exactly like Guessing mode — same banner, same button, everyone, same time
- **Phase 4 — Dead code** — **fix:** removed unused guard-bypassing `updateGameState` from `useRoom`
- **Host-fixed song count** — host sets **Songs per player** in the lobby (1–10, default 3); everyone submits exactly N (button gated, devtools extras truncated server-side)
- **Dead-round filter** — tracks everyone submitted are unvotable by construction: flagged and skipped at start (Guessing), Start blocked with guidance when none remain playable

See [`docs/PHASES.md`](./docs/PHASES.md) for the full history.

## Getting Started

```bash
npm install
cp .env.example .env.local   # then fill in your Firebase credentials
npm run dev
```

Full setup instructions (incl. Firebase project creation): **[docs/GETTING_STARTED.md](./docs/GETTING_STARTED.md)**

> `.env.local` is gitignored. Only the placeholder `.env.example` is committed.

## Scripts

| Command              | Description                          |
| -------------------- | ------------------------------------ |
| `npm run dev`        | Start the Vite dev server            |
| `npm run build`      | Type-check + production build        |
| `npm run preview`    | Preview the production build        |
| `npm run typecheck`  | TypeScript check-only compile        |
| `npm test`           | Run all unit tests                   |
| `npm run test:watch` | Run unit tests in watch mode         |

## Documentation

Everything lives in [`docs/`](./docs/):

- **[ARCHITECTURE.md](./docs/ARCHITECTURE.md)** — tech stack, data flow, game-loop state machine, Firebase schema
- **[GETTING_STARTED.md](./docs/GETTING_STARTED.md)** — local setup, env vars, Firebase setup, how to play
- **[PHASES.md](./docs/PHASES.md)** — phase-by-phase feature history and test coverage
- **[SCORING.md](./docs/SCORING.md)** — exact scoring rules
- **[DEPLOYMENT.md](./docs/DEPLOYMENT.md)** — deploy to Vercel (free) for your team
- **[FIREBASE_RULES.md](./docs/FIREBASE_RULES.md)** — current Realtime Database security rules + data shape

## Tests

```bash
npm test
```

- **YouTube parsing & dedup** — `src/lib/youtube.test.ts` (19) + `youtube.rigorous.test.ts` (25) — patterns, boundary, `?t`/`&list` dedup
- **Scoring** — `src/lib/scoring.test.ts` (10) + `scoring.rigorous.test.ts` (19) — ghost/self-farm/leakage/remainder/rounding
- **Player logic / timer + shuffle + intermission/jukebox** — `src/lib/playerLogic.test.ts` (26) + `playerLogic.rigorous.test.ts` (27) — reducer branches, navigate, shuffle crypto/fallback/retry
- **Session storage** — `src/lib/storage.test.ts` (9) + `storage.rigorous.test.ts` (10) — malformed/missing/overwrite/clear
- **Room names** — `src/lib/roomNames.test.ts` (4) + `roomNames.rigorous.test.ts` (10) — 48 Telugu-cinema names with meanings, exhaustive ≤32
- **Bugfixes (voting/skip/join)** — `bugfixes.rigorous.test.ts` (44) — candidates/skip/join/failover/toasts/start/roomName
- **Room lifecycle** — `roomLifecycle.rigorous.test.ts` (40) — reset, last-leave, rematch, duplicate names, host-fixed count + dead-round spec
- **Build marker** — `version.rigorous.test.ts` (5) — footer label branches
- **Total: 257 tests across 13 suites — all white-box + black-box for every bug fix**

## Hosting

Deploy the static `dist/` build anywhere. `vercel.json` rewrites all routes to `index.html` (SPA). See **[docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)**. Security rules for the Realtime Database: **[docs/FIREBASE_RULES.md](./docs/FIREBASE_RULES.md)**.
