# Firebase Realtime Database Security Rules

These are the **currently applied** security rules for the `play-my-playlist` Firebase Realtime Database. They live in the Firebase console under **Build → Realtime Database → Rules**.

## Active Rules

```json
{
  "rules": {
    "rooms": {
      "$roomCode": {
        ".read": true,
        ".write": true,
        ".validate": "newData.hasChildren(['status', 'players'])"
      }
    }
  }
}
```

### What each part means

| Rule                          | Effect                                                                 |
| ----------------------------- | ---------------------------------------------------------------------- |
| `"rooms": { "$roomCode": ... }` | Applies scoped rules to every room keyed by its 4-letter code.        |
| `".read": true`               | Any client can read room data (needed so players sync live state).     |
| `".write": true`              | Any client can write room data (needed for create / join / guess / reveal). |
| `".validate": ...`            | Any written node under a room must contain both `status` and `players` children. |

The `.validate` rule enforces a minimum shape: a room must always have a `status` and a `players` map.

## Data Shape the App Writes

The app (see `useRoom` in `src/hooks/useRoom.ts`) writes to these paths:

```
rooms/{roomCode}
├── roomName: string          # e.g. "Gully Groovers" — auto-generated (≤32 chars), separate from host player name
├── status: string            # LOBBY | SUBMISSION | PLAYING | REVEAL | INTERMISSION | GAMEOVER
├── mode: string              # GUESSING | JUKEBOX (default GUESSING; picked in LOBBY via setMode)
├── hostId: string            # auto-failover to first remaining if host leaves
├── createdAt: number
├── currentTrackIndex: number
├── timerSeconds: number      # guessing 30→0, intermission 7→0, jukebox 180 max (derived from roundStartTime delta)
├── roundStartTime: number    # epoch ms (corrected with .info/serverTimeOffset), written on every PLAYING/INTERMISSION entry for absolute sync
├── playbackPaused: boolean   # jukebox pause (anyone can toggle via setPlaybackPaused, all seekTo same second)
├── players: { playerId: { id, name, score, hasSubmitted, bestRound } }
├── guesses: { playerId: guessedName }
├── scoreDeltas: [ { playerId, playerName, delta, reason } ]  # includes sit-out submitter bonuses
├── tracks: [ { videoId, submittedBy[], played } ]  # shuffled once at start via shuffleFisherYates
└── submissions: { playerId: [ urls ] }
```

- **Reads:** `rooms/{code}` (the `onValue` listener) plus `.info/serverTimeOffset` for clock correction.
- **Writes:** `rooms/{code}` (create room, transactions, status/mode/`roundStartTime` updates), `rooms/{code}/players` (join), `rooms/{code}/guesses` (cast guess), `rooms/{code}/players/{playerId}` (leave). Host-only: `hostReveal` (with `status===PLAYING` + `hostId` guard), `hostNext` (shuffles once at start). Anyone in Jukebox: `jukeboxNavigate`/`jukeboxJump`/`jukeboxSeek`/`setPlaybackPaused` (transactions/`update` with `roundStartTime` delta + `seekTo` drift fix); intermission auto-ticks `timerSeconds` via absolute `roundStartTime` delta then `hostNext`.

> Because the game currently uses **anonymous clients** (no Firebase Auth), the rules grant open read/write to keep multiplayer working. The `.validate` rule is the only structural guard. For higher security, add Firebase Auth and restrict writes to the creator (see "Hardening" below).

## Hardening (future work)

If you later add Firebase Auth, you can scope writes to the room creator instead of `true`:

```json
{
  "rules": {
    "rooms": {
      "$roomCode": {
        ".read": true,
        ".write": "auth != null && data.child('hostId').val() === auth.uid"
      }
    }
  }
}
```

A stricter, more granular version would lock each sub-tree (players join, host-only transitions) while still allowing unauthenticated players to join a lobby. Keep the current rules in place while the game is anonymous.
