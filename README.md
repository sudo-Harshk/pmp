# Play My Playlist (pmp)

A **synchronous multiplayer** YouTube playlist guessing game built with React + TypeScript, Vite, Tailwind CSS, and Firebase Realtime Database.

Players submit YouTube links, the game deduplicates identical songs into a single track, and everyone guesses **who** submitted each song within a 30-second snippet. Correct guesses and submitter bonuses earn points; the highest scorer takes the crown.

## Highlights

- **Real-time multiplayer** — rooms, live submissions, voting, and a host-managed game loop synced over Firebase Realtime Database.
- **Two play modes** — host picks in the lobby: **Guessing Game** (30 s snippet + voting + reveal + 7 s intermission) or **Casual Jukebox** (common shuffled playlist, full playback up to 3 min, Spotify-like jam).
- **Shuffled playlist** — Fisher–Yates shuffle (open-source, `crypto.getRandomValues` → `Math.random` fallback) once at game start so order is never straight; deduped tracks never leak submitter order.
- **Watch-party sync** — absolute `roundStartTime` + server-clock correction + `seekTo` drift fix (everyone hears the same second, even late join).
- **Jukebox common queue** — shuffled Fisher–Yates playlist visible as a queue below the player, **anyone** can `Prev / Pause / Next / Seek / tap to jump`, all synced via `roundStartTime`.
- **Smart deduplication** — duplicate songs merge into one track listing every submitter.
- **Embedded player** — `react-youtube` with `seekTo`/`getCurrentTime`/`getDuration`, error handling for `101/150` embed blocks and `100` invalid, plus host/anyone **Skip Unplayable Track**.
- **Audio-Only Mode** — hide the video (equalizer/vinyl overlay) for extra challenge.
- **Vote lock-in & sit-out** — first guess locks `Vote Locked ✅`; owners of the current track hear it with friends but sit out voting (no cheating, they earn submitter bonus instead).
- **Intermission breathing space** — 7 s synchronized countdown banner between reveal and the next track.
- **Session persistence + host failover** — reload/rejoin without losing identity, and if host leaves the first remaining player is auto-promoted.
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
- **Hardening & Jam** — shuffled Fisher–Yates playlist, vote-independence + sit-out-but-listen (no self-vote cheating), absolute `roundStartTime` + `seekTo` watch-party sync, host failover, YouTube `101/150/100` skip, scoring leakage / double-reveal / invisible-bonus fixes, Jukebox common queue (anyone can `Prev/Pause/Next/Seek/tap`, visible queue, like Spotify)

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

- **YouTube parsing & dedup** — `src/lib/youtube.test.ts` (19 cases, including `?t=`/`&list=` stripping)
- **Scoring** — `src/lib/scoring.test.ts` (10 cases, live-submitter split, self-farm blocked)
- **Player logic / timer + shuffle + intermission/jukebox** — `src/lib/playerLogic.test.ts` (26 cases, including Fisher–Yates shuffle)
- **Session storage** — `src/lib/storage.test.ts` (9 cases)

## Hosting

Deploy the static `dist/` build anywhere. `vercel.json` rewrites all routes to `index.html` (SPA). See **[docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)**. Security rules for the Realtime Database: **[docs/FIREBASE_RULES.md](./docs/FIREBASE_RULES.md)**.
