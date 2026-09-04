# Play My Playlist (pmp)

A **synchronous multiplayer** YouTube playlist guessing game built with React + TypeScript, Vite, Tailwind CSS, and Firebase Realtime Database.

Players submit YouTube links, the game deduplicates identical songs into a single track, and everyone guesses **who** submitted each song within a 30-second snippet. Correct guesses and submitter bonuses earn points; the highest scorer takes the crown.

## Highlights

- **Real-time multiplayer** — rooms, live submissions, voting, and a host-managed game loop synced over Firebase Realtime Database.
- **Two play modes** — host picks in the lobby: **Guessing Game** (30 s snippet + voting + reveal + 7 s intermission) or **Casual Jukebox** (full playback up to 3 min, open submitter, `Prev/Next/Pause` media controls).
- **Smart deduplication** — duplicate songs merge into one track listing every submitter.
- **Embedded player** — `react-youtube` with error handling for restricted/removed videos.
- **Audio-Only Mode** — hide the video (equalizer/vinyl overlay) for extra challenge.
- **Vote lock-in** — first guess disables all vote buttons immediately with a `Vote Locked ✅` indicator.
- **Intermission breathing space** — 7 s synchronized countdown banner between reveal and the next track.
- **Session persistence** — reload or rejoin a room without losing identity or host status.
- **Auto-scoring** — +10 for correct guesses, +5 per wrong guess split among submitters.
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

Phases 1–4 are complete; refinements add intermission, vote lock-in, and casual jukebox mode:

- **Phase 1** — Core types, YouTube parsing & deduplication helpers + tests
- **Phase 2** — Embedded player, 30 s snippet timer, error handling
- **Phase 3** — Firebase sync, real-time game loop, voting & scoring
- **Phase 4** — Session persistence, confetti, audio-only mode, Vercel config
- **Refinements** — 7 s intermission stage, single-vote lock-in, jukebox mode toggle (no scoring change)

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

- **YouTube parsing & dedup** — `src/lib/youtube.test.ts` (19 cases)
- **Scoring** — `src/lib/scoring.test.ts` (10 cases)
- **Player logic / timer + intermission/jukebox** — `src/lib/playerLogic.test.ts` (22 cases)
- **Session storage** — `src/lib/storage.test.ts` (9 cases)

## Hosting

Deploy the static `dist/` build anywhere. `vercel.json` rewrites all routes to `index.html` (SPA). See **[docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)**. Security rules for the Realtime Database: **[docs/FIREBASE_RULES.md](./docs/FIREBASE_RULES.md)**.
