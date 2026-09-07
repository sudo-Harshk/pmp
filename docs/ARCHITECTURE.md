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

    H->>F: createRoom(hostName, roomName) / joinRoom()
    C->>F: joinRoom()
    Note over F: rooms/{code} created with roomName (e.g. Gully Groovers)
    H->>F: setMode(GUESSING|JUKEBOX)
    H->>F: startSubmission()
    F-->>H: onValue(rooms/{code}) → new status
    F-->>C: onValue(rooms/{code}) → new status
    C->>F: submitSongs() [transaction]
    H->>F: hostNext() SUBMISSION→PLAYING [transaction + shuffleFisherYates]
    Note over H,F: roundStartTime = correctedNow + offset, shuffled tracks
    F-->>H: onValue timerSeconds + roundStartTime
    F-->>C: onValue timerSeconds + roundStartTime
    C->>F: onReady seekTo((now - roundStartTime)/1000) drift fix
    H->>F: hostReveal() [transaction, status guard]
    F-->>H: onValue → scores / scoreDeltas
    F-->>C: onValue → scores / scoreDeltas
    H->>F: hostNext() → INTERMISSION [transaction + roundStartTime]
    Note over H,F: INTERMISSION 7s countdown (host ticker via roundStartTime delta)
    F-->>H: onValue timerSeconds--
    F-->>C: onValue timerSeconds--
    H->>F: auto hostNext() → PLAYING
    H->>F: jukeboxJump(index) / jukeboxNavigate(PREV|NEXT) / setPlaybackPaused() / jukeboxSeek(seconds) (anyone in JUKEBOX)
    Note over C,F: Jukebox: anyone can Prev/Pause/Next/Seek/tap queue, all seekTo same second
    C->>F: leaveRoom() → remove players/{id}
    Note over H,F: host failover: if hostId not in players, first remaining promoted
```

Every client opens the URL, creates or joins a room, and then subscribes to a single Firebase node (`rooms/{roomCode}`) via the `onValue` listener. State changes (submissions, guesses, timer, status) are written by the acting client and **pushed to every other client live** — no polling, no server code.

## Directory Layout

```mermaid
graph TD
    SRC[src/]
    SRC --> APP[App.tsx<br/>top-level view router by status + mode]
    SRC --> MAIN[main.tsx<br/>ReactDOM entry]
    SRC --> CSS[index.css<br/>Tailwind + keyframes]
    SRC --> VITE[vite-env.d.ts<br/>env var typings]

    SRC --> TYPES[types/]
    TYPES --> GAME[game.ts<br/>Submission, Player, PlaylistTrack, RoomState,<br/>RoomStatus + GameMode]

    SRC --> LIB[lib/]
    LIB --> FB[firebase.ts<br/>app + db init]
    LIB --> YT[youtube.ts<br/>extractVideoId / processSubmissions<br/>handles watch/youtu.be/shorts + ?t &list stripping]
    LIB --> SC[scoring.ts<br/>calculateRoundScores<br/>live-submitter split, self-farm blocked]
     LIB --> PL[playerLogic.ts<br/>snippetReducer + track nav<br/>INTERMISSION 7s + JUKEBOX 180s + navigateJukebox<br/>shuffleFisherYates via crypto.getRandomValues]
    LIB --> RN[roomNames.ts<br/>generateRoomName - Indian pop-culture word banks, ≤32 chars]
    LIB --> ST[storage.ts<br/>localStorage session helpers]

    SRC --> HOOKS[hooks/]
    HOOKS --> UR[useRoom.ts<br/>real-time room hook + all writes<br/>createRoom(hostName, roomName) + roomName fallback<br/>hostNext (shuffle) / hostReveal (status guard)<br/>jukeboxNavigate/jukeboxJump/jukeboxSeek/ setPlaybackPaused (anyone)<br/>roundStartTime + serverOffset sync + host failover ticker]

    SRC --> COMP[components/]
    COMP --> YTP[YouTubePlayer.tsx<br/>react-youtube wrapper<br/>seekTo/getCurrentTime/getDuration + onStateChange]
    COMP --> GAMEV[game/]
    GAMEV --> ENTRY[EntryView.tsx<br/>Create (Your Name + auto Room Name + 🎲 reroll) / Join]
    GAMEV --> LOBBY[LobbyView.tsx<br/>🎬 roomName + room code + roster + mode toggle]
    GAMEV --> SUB[SubmissionView.tsx<br/>song form + readiness + Start Game/Playback]
     GAMEV --> GV[GameView.tsx<br/>player + absolute 30s timer + concealed dummy vote + hide-self + audio-only + Skip Unplayable]
    GAMEV --> JB[JukeboxView.tsx<br/>common shuffled queue + seek sync + seek bar + queue tap<br/>anyone Prev/Pause/Next/Seek/Skip + visible queue like Spotify]
    GAMEV --> IM[IntermissionView.tsx<br/>7s countdown banner]
    GAMEV --> REV[RevealView.tsx<br/>submitters + guesses + sit-out bonus]
    GAMEV --> LEAD[LeaderboardView.tsx<br/>rankings + tiebreak score→bestRound→name + confetti]
```

> Note: `src/components/{DedupPreview,RoomCard,SongSubmissionForm,PlayerStage}.tsx` are earlier-phase artifacts kept for reference; the live multiplayer flow uses the components under `src/components/game/`.

## Game Loop (state machine)

A room moves through these `status` values (see `RoomStatus` in `src/types/game.ts`):

```mermaid
stateDiagram-v2
    [*] --> LOBBY
    LOBBY --> SUBMISSION: host: Start Submission
    note right of LOBBY: host picks GUESSING | JUKEBOX in Lobby
    SUBMISSION --> PLAYING: host: Start Playback
    PLAYING --> REVEAL: GUESSING: 30s timer / hostReveal
    REVEAL --> INTERMISSION: GUESSING: host Next (has next track)
    INTERMISSION --> PLAYING: auto after 7s countdown
    REVEAL --> GAMEOVER: GUESSING: last track
    PLAYING --> PLAYING: JUKEBOX: Prev / Next (no REVEAL / INTERMISSION)
    PLAYING --> GAMEOVER: JUKEBOX: Next on last
    GAMEOVER --> [*]
```

**Host vs. Client:** The room has exactly one `hostId` for Guessing transitions, but the Jukebox common queue is **Spotify-like: anyone can control**. Only the host may transition `SUBMISSION→PLAYING` (with one-time Fisher–Yates shuffle), run the global countdown, `hostReveal`, and toggle `mode` in the lobby. In Jukebox, **any player** can drive `Prev/Next` (`jukeboxNavigate`), tap any queue row (`jukeboxJump`), `Seek` (`jukeboxSeek`), and `Pause` (`setPlaybackPaused`) — all synced via `roundStartTime` + server-clock offset. All clients submit songs and see the **same concealed voting UI**: `GameView` shows only other players (`candidates = players.filter(p≠me)`), no self-button or `(You)` label, `hasVoted` locks to `Vote Locked ✅`. A submitter's tap is a **local dummy** (`dummyVote` state, no `submitGuess` write, ignored by `scoring.ts` and excluded from `guessCount`/`eligible`), so every screen looks identical to a shoulder-surfer while keeping the watch-party synced. Votes are independent per player (no global `isTaken`), `101/150/100` unplayable videos show **Skip Unplayable Track** with `seekTo` drift fix.

## Firebase Realtime Database Schema

Rooms are stored flat under `rooms/{roomCode}` where `roomCode` is a 4-letter code.

```
rooms/{roomCode}
├── roomCode: string        # "ABCD"
├── roomName: string        # e.g. "Gully Groovers" — auto-generated (Indian pop-culture), ≤32 chars, editable with 🎲 reroll; host name is separate
├── status: string          # LOBBY | SUBMISSION | PLAYING | REVEAL | INTERMISSION | GAMEOVER
├── mode: string            # GUESSING | JUKEBOX (default GUESSING)
├── hostId: string          # player id of the host (auto-failover to first remaining if host leaves)
├── createdAt: number       # epoch ms
├── currentTrackIndex: number
├── timerSeconds: number    # guessing: 30→0 per snippet; intermission: 7→0; jukebox: 180 max (derived from roundStartTime)
├── roundStartTime: number  # epoch ms (corrected with .info/serverTimeOffset), written on every PLAYING/INTERMISSION entry for absolute sync
├── playbackPaused: boolean # jukebox pause state (anyone can toggle, synced)
├── guesses: { playerId: guessedName }
├── scoreDeltas: [ { playerId, playerName, delta, reason } ]  # last reveal only (includes sit-out submitter bonuses)
├── players
│   └── { playerId }:
│       ├── id, name, score
│       ├── hasSubmitted: boolean
│       └── bestRound: number          # highest single-round delta
├── submissions
│   └── { playerId }: [ normalizedWatchUrls ]
└── tracks: [ { videoId, submittedBy[], played } ]   # deduplicated, shuffled once at start via shuffleFisherYates
```

Concurrency-sensitive writes (`submitSongs`, `hostReveal` with `status===PLAYING` guard, `hostNext` with shuffleFisherYates, `jukeboxNavigate`/`jukeboxJump`) use Firebase **transactions** (`runTransaction`) so multiple clients don't clobber each other. Idempotent single-field writes (`submitGuess`, `startSubmission`, `setMode`, `setPlaybackPaused`, `jukeboxSeek` via `update` with `roundStartTime` delta) use `update`. `hostNext` is status-aware: `SUBMISSION→PLAYING` (shuffle + `roundStartTime`), `PLAYING` (skip unplayable → next `PLAYING` or `GAMEOVER`), `REVEAL→INTERMISSION` (7 s, `roundStartTime`) or `GAMEOVER`; `INTERMISSION→PLAYING` (auto-ticked by host `roundStartTime` delta). Jukebox `Prev/Next`/`Jump`/`Seek` are **anyone-can** transactions that set `currentTrackIndex`, `roundStartTime`, `timerSeconds`. All timers are absolute `Math.max(0, duration - floor((correctedNow - roundStartTime)/1000))` to survive background tab throttling. Host failover promotes `Object.keys(players)[0]` if `hostId` leaves. `App.tsx` routes `INTERMISSION` → `IntermissionView` and branches `PLAYING` on `mode` → `GameView` (guessing, 30 s, sit-out) vs `JukeboxView` (common queue, anyone controls, seek bar + queue tap).

## Session Persistence

A player's identity is stored in `localStorage` under `play_my_playlist_session` (`saveSession`/`getSession`/`clearSession` in `src/lib/storage.ts`). On reload, `useRoom` restores `myPlayerId` and re-subscribes; if the room or player no longer exists, the session is silently cleared and the user returns to `EntryView`.

## Testing

- **Vitest** with five pure-logic suites run under jsdom — `youtube`, `scoring`, `playerLogic` (timer + `navigateJukebox` + `shuffleFisherYates` + duration constants), `storage`, and `roomNames`.
- Logic that touches Firebase (`useRoom`) is intentionally kept thin; the testable rules (dedupe, scoring, timer, shuffle, intermission/jukebox navigation, roundStartTime drift, sit-out, session, room-name generation) live in pure modules under `src/lib/`. `playerLogic.test.ts` covers `INTERMISSION_DURATION_SECONDS (7)`, `JUKEBOX_MAX_SECONDS (180)`, `navigateJukebox()`, and `shuffleFisherYates`; `roomNames.test.ts` covers `generateRoomName()` format/length/variety.
- `GameView` enforces concealed voting: every screen shows only others (no self), `voteLocked` + `isSubmitter` dummy (local `dummyVote`, no Firebase write, indistinguishable `Vote Locked ✅`), no global `isTaken` steal; scoring guards + `hostReveal` `status===PLAYING` guard prevent double-scoring. `EntryView` keeps `Your Name` and `Room Name` strictly separate.
- Run everything with `npm test` (68 tests).
