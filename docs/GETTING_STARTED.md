# Getting Started

Follow these steps to run **Play My Playlist** locally.

## Prerequisites

- **Node.js 18+** (developed against Node 20+)
- **npm** (bundled with Node)
- A **Firebase project** with Realtime Database enabled (see [Firebase Setup](#firebase-setup))

## 1. Install Dependencies

```bash
npm install
```

## 2. Configure Environment Variables

Copy the example env file to a real local file:

```bash
cp .env.example .env.local
```

Fill in your Firebase web app credentials in `.env.local`:

```dotenv
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://your-project-default-rtdb.firebaseio.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

> `.env.local` is gitignored and must **never** be committed. Only `.env.example` (with empty values) lives in the repo.

## 3. Start the Dev Server

```bash
npm run dev
```

Open the printed URL (default `http://localhost:5173`). To test real-time multiplayer, open the URL in **two browser windows** and join the same room code.

## Available Scripts

| Command               | Description                                  |
| --------------------- | -------------------------------------------- |
| `npm run dev`         | Start the Vite dev server (HMR)              |
| `npm run build`       | Type-check + production build into `dist/`   |
| `npm run preview`     | Preview the production build locally         |
| `npm run typecheck`   | Run the TypeScript compiler in check-only    |
| `npm test`            | Run all Vitest unit tests once               |
| `npm run test:watch`  | Run unit tests in watch mode                 |

## Firebase Setup

1. In the [Firebase Console](https://console.firebase.google.com/), create a project.
2. Add a **Web App** to get the config snippet.
3. Under **Build → Realtime Database**, create a database and copy its URL into `VITE_FIREBASE_DATABASE_URL`.
4. Set sensible database **security rules** (see [`FIREBASE_RULES.md`](./FIREBASE_RULES.md)) before exposing it publicly.

## Playing a Round

1. **Create Room** (host) or **Join Room** (clients) with a name.
2. In the lobby, the host picks the play mode: **Guessing Game** (default) or **Casual Jukebox** (toggle `Mode: Guessing Game | Casual Jukebox`). The shuffled Fisher–Yates playlist is built once at game start so order is never straight.
3. Host presses **Start Submission**; everyone submits N YouTube links (deduped, `?t=`/`&list=` stripped).
4. Once everyone is ready, the host sees **Start Game** (Guessing) / **Start Playback** (Jukebox); others see *Waiting for host...*.
5. **Guessing Game:** A 30-second snippet plays **synced** (`roundStartTime` + server clock + `seekTo` drift fix, everyone hears same second). Owners of the current track **hear it with friends but sit out voting** (*“This is your song — sit out”* banner, no vote buttons) and earn submitter bonus if others miss; others vote independently (no global `isTaken` steal) and `Vote Locked ✅` locks immediately. If the video is `101/150/100` unplayable, a host **Skip Unplayable Track** appears (`console.warn`). After **Reveal** (now shows sit-out bonuses `sat out — your track ★ +5`), a 7-second **Intermission** banner (`Next track starting in X seconds...`) auto-advances. Double reveal is blocked.
6. **Casual Jukebox — common queue like Spotify, anyone can DJ:** The shuffled tracks play one by one as a shared queue (visible list below the player, current highlighted, `played` checks). **Anyone** (not just host) can `Prev / Pause / Next / Seek` (seek bar) or tap any queue row to jump (`jukeboxJump`); all stay synced to the same second via `roundStartTime` + `seekTo` correction and late join seeks to the middle. Full track up to 3 min, submitter shown openly, voting/reveal hidden, `Skip Unplayable Track` for anyone on `101/150/100`. `Next` on last finishes the run. If host leaves, the first remaining player is auto-promoted.
7. After the last track, **GAMEOVER** shows the leaderboard with tiebreak `score → bestRound → name` and confetti.
