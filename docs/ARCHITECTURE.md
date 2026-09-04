# Architecture

This document describes how **Play My Playlist** is structured, how the real-time game loop works, and the Firebase Realtime Database schema it syncs against.

## Tech Stack

- **Frontend:** React 18 + TypeScript, built with [Vite](https://vitejs.dev/)
- **Styling:** Tailwind CSS v3
- **Backend / Realtime Sync:** Firebase Realtime Database (modular SDK)
- **Video playback:** `react-youtube` (YouTube IFrame API)
- **Testing:** Vitest + jsdom
- **Hosting:** Vercel (static SPA, see `vercel.json`)

## High-Level Data Flow

```mermaid
sequenceDiagram
    autonumber
    participant H as Host client
    participant C as Client(s)
    participant F as Firebase RTDB

    H->>F: createRoom(code) / joinRoom()
    C->>F: joinRoom()
    Note over F: rooms/{code} created
    H->>F: startSubmission()
    F-->>H: onValue(rooms/{code}) → new status
    F-->>C: onValue(rooms/{code}) → new status
    C->>F: submitSongs() [transaction]
    H->>F: hostReveal() [transaction]
    F-->>H: onValue → scores / scoreDeltas
    F-->>C: onValue → scores / scoreDeltas
    C->>F: leaveRoom() → remove players/{id}
```

Every client opens the URL, creates or joins a room, and then subscribes to a single Firebase node (`rooms/{roomCode}`) via the `onValue` listener. State changes (submissions, guesses, timer, status) are written by the acting client and **pushed to every other client live** — no polling, no server code.

## Directory Layout

```mermaid
graph TD
    SRC[src/]
    SRC --> APP[App.tsx<br/>top-level view router]
    SRC --> MAIN[main.tsx<br/>ReactDOM entry]
    SRC --> CSS[index.css<br/>Tailwind + keyframes]
    SRC --> VITE[vite-env.d.ts<br/>env var typings]

    SRC --> TYPES[types/]
    TYPES --> GAME[game.ts<br/>Submission, Player, PlaylistTrack, RoomState]

    SRC --> LIB[lib/]
    LIB --> FB[firebase.ts<br/>app + db init]
    LIB --> YT[youtube.ts<br/>extractVideoId / processSubmissions]
    LIB --> SC[scoring.ts<br/>calculateRoundScores]
    LIB --> PL[playerLogic.ts<br/>timer reducer + track nav]
    LIB --> ST[storage.ts<br/>localStorage session helpers]

    SRC --> HOOKS[hooks/]
    HOOKS --> UR[useRoom.ts<br/>real-time room hook + all writes]

    SRC --> COMP[components/]
    COMP --> YTP[YouTubePlayer.tsx<br/>react-youtube wrapper]
    COMP --> GAMEV[game/]
    GAMEV --> ENTRY[EntryView.tsx<br/>Create / Join]
    GAMEV --> LOBBY[LobbyView.tsx<br/>room code + roster]
    GAMEV --> SUB[SubmissionView.tsx<br/>song form + readiness]
    GAMEV --> GV[GameView.tsx<br/>player + timer + voting + audio-only]
    GAMEV --> REV[RevealView.tsx<br/>submitters + guesses]
    GAMEV --> LEAD[LeaderboardView.tsx<br/>rankings + confetti]
```

> Note: `src/components/{DedupPreview,RoomCard,SongSubmissionForm,PlayerStage}.tsx` are earlier-phase artifacts kept for reference; the live multiplayer flow uses the components under `src/components/game/`.

## Game Loop (state machine)

A room moves through these `status` values (see `RoomStatus` in `src/types/game.ts`):

```mermaid
stateDiagram-v2
    [*] --> LOBBY
    LOBBY --> SUBMISSION: host: Start Submission
    SUBMISSION --> PLAYING: host advances when ready
    PLAYING --> REVEAL: 30s timer ends / host reveal
    REVEAL --> PLAYING: host: Next Track (repeat for each track)
    REVEAL --> GAMEOVER: host: last track
    GAMEOVER --> [*]
```

**Host vs. Client:** The room has exactly one `hostId`. Only the host may transition status, run the global countdown, reveal scores, and advance tracks. Clients cast guesses and submit songs. This keeps a single source of truth and avoids conflicting transitions.

## Firebase Realtime Database Schema

Rooms are stored flat under `rooms/{roomCode}` where `roomCode` is a 4-letter code.

```
rooms/{roomCode}
├── roomCode: string        # "ABCD"
├── status: string          # LOBBY | SUBMISSION | PLAYING | REVEAL | GAMEOVER
├── hostId: string          # player id of the host
├── createdAt: number       # epoch ms
├── currentTrackIndex: number
├── timerSeconds: number    # 30 -> 0
├── guesses: { playerId: guessedName }
├── scoreDeltas: [ { playerId, playerName, delta, reason } ]  # last reveal only
├── players
│   └── { playerId }:
│       ├── id, name, score
│       ├── hasSubmitted: boolean
│       └── bestRound: number          # highest single-round delta
├── submissions
│   └── { playerId }: [ normalizedWatchUrls ]
└── tracks: [ { videoId, submittedBy[], played } ]   # deduplicated playlist
```

Concurrency-sensitive writes (`submitSongs`, `hostReveal`, `hostNext`) use Firebase **transactions** (`runTransaction`) so multiple clients don't clobber each other. Idempotent single-field writes (`submitGuess`, `startSubmission`) use `update`.

## Session Persistence

A player's identity is stored in `localStorage` under `play_my_playlist_session` (`saveSession`/`getSession`/`clearSession` in `src/lib/storage.ts`). On reload, `useRoom` restores `myPlayerId` and re-subscribes; if the room or player no longer exists, the session is silently cleared and the user returns to `EntryView`.

## Testing

- **Vitest** with three pure-logic suites (`youtube`, `scoring`, `playerLogic`) plus a `storage` suite run under jsdom.
- Logic that touches Firebase (`useRoom`) is intentionally kept thin; the testable rules (dedupe, scoring, timer, session) live in pure modules under `src/lib/`.
- Run everything with `npm test`.
