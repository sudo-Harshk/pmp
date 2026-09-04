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
2. In the lobby, the host picks the play mode: **Guessing Game** (default) or **Casual Jukebox** (toggle `Mode: Guessing Game | Casual Jukebox`).
3. Host presses **Start Submission**; everyone submits N YouTube links.
4. Once everyone is ready, the host advances to **PLAYING**.
5. **Guessing Game:** A 30-second snippet plays; players vote on who submitted it (self-voting disabled, `Vote Locked ✅` — all vote buttons disable immediately and cannot be changed/cleared). After **Reveal** (correct submitter + points), a 7-second **Intermission** banner (`Next track starting in X seconds...`) runs and auto-advances to the next track.
6. **Casual Jukebox:** The current track plays in full (up to 3 min) with the submitter shown openly; voting and reveal are hidden. The host drives `Prev / Next / Pause` (synced `playbackPaused`) and `Next` on the last track finishes the run.
7. After the last track, **GAMEOVER** shows the leaderboard with confetti.
