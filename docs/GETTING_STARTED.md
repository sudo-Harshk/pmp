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

1. **Create Room** — host enters **Your Name** (identity) and a **Room Name** (auto-generated fun name like "Gully Groovers" — tap 🎲 to reroll or edit; ≤32 chars) — the two are never confused. **Join Room** — guest enters **Your Name** + the 4-letter **Room Code**.
2. In the lobby, the host sees `🎬 {Room Name}` above the code; everyone sees `🎬 {name} · {code}` in the header. Host picks the play mode: **Guessing Game** (default) or **Casual Jukebox**. The shuffled Fisher–Yates playlist is built once at game start so order is never straight.
3. Host presses **Start Submission**; everyone submits N YouTube links (deduped, `?t=`/`&list=` stripped). The host can press **Start Game/Playback** as soon as `tracks.length>0` — not blocked if someone is AFK. Anyone can join with the 4-letter code even after the game started (`SUBMISSION`/`PLAYING`/`REVEAL`/`INTERMISSION`); only `GAMEOVER` blocks (`Game over — ask the host to start a new room`). Leaving players trigger `🔴 {name} left` toasts; joining triggers `🟢 {name} joined`; tab-close is auto-cleaned via `onDisconnect`.
4. Once everyone is ready, the host sees **Start Game** (Guessing) / **Start Playback** (Jukebox) as soon as any track exists; others see *Waiting for host...* only when everyone is ready.
5. **Guessing Game:** A 30-second snippet plays **synced** (`roundStartTime` + server clock + `seekTo` drift fix, everyone hears same second). Voting is **concealed**: every screen shows the same `Who submitted this song?` grid with **only other players** (never yourself) — submitter's tap is a local dummy, identical `Vote Locked ✅` but zero write/score/counter impact. If the video is `101/150/100` unplayable, **everyone** sees `Video unplayable — Anyone can skip` and the same **Skip Unplayable Track** button (anyone can tap during `PLAYING`; `hostNext` PLAYING is open, other transitions remain host-only). After **Reveal** (`sat out — your track ★ +5`), a 7-second **Intermission** auto-advances. Double reveal blocked. Host-leave promotes the first remaining player with `👑 You are now the host` toast.
6. **Casual Jukebox — common queue like Spotify, anyone can DJ:** The shuffled tracks play one by one as a shared queue (visible list below the player, current highlighted, `played` checks). **Anyone** can `Prev / Pause / Next / Seek` or tap any queue row to jump; all stay synced via `roundStartTime` + `seekTo`. Full track up to 3 min, submitter shown openly, voting/reveal hidden, `Skip Unplayable Track` for anyone on `101/150/100`. `Next` on last finishes the run.
7. After the last track, **GAMEOVER** shows the leaderboard with tiebreak `score → bestRound → name` and confetti.
