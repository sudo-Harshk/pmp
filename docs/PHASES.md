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

## Hardening, Bugs & Jukebox Jam — Shuffle, Vote, Scoring & Watch-Party Sync

**Goal:** Fix commercial edge-cases found in 4-player QA and make Jukebox a true Spotify-like common queue.

- **Bugs found in QA (4 players):** straight (unshuffled) order, vote steal (`isTaken` globally disabled a name after one vote), invisible submitter bonus / lost points when submitter left, double-reveal on rapid click, `5/3` guess counter, host controls disappearing on reload.
- **Shuffle** — `src/lib/playerLogic.ts:81` new `shuffleFisherYates<T>` (open-source Fisher–Yates, `crypto.getRandomValues` → `Math.random` fallback, unbiased, non-mutating). Wired **once** at `SUBMISSION→PLAYING` in `src/hooks/useRoom.ts:348` after dedupe so order is never straight. Tests: `playerLogic.test.ts` +4 cases (preserves elements, immutability, empty/single, statistical order change). No new dep.
- **Vote independence + sit-out-but-listen** — `src/components/game/GameView.tsx:32` now derives `isSubmitter = track.submittedBy.includes(myName)`; if true, all hear the same synced video but the owner sees *“This is your song — you all listen together, but you sit out voting. You earn bonus if others miss”* and no vote buttons. Removed global `isTaken` (`Object.values(guesses).includes`) so 4 players can all vote `Alice` independently; `hasVoted`/`isSelf` only local. `hostReveal` now guards `status===PLAYING` + `hostId` to block double scoring.
- **Scoring genuine** — `src/lib/scoring.ts:39` pool now splits only among **live** `resolvedSubmitterIds` (no leakage when `Ghost` left), submitter self-guesses ignored (no devtools farm), `incorrectGuessCount` excludes departed/self, `hostReveal` double-guard, `src/components/game/RevealView.tsx:42` now shows sit-out submitters (`sat out — your track ★ +5`) not just guessers, `src/components/game/GameView.tsx:26` counter fixed to `eligible = players.filter(!submittedBy)`.
- **Watch-party sync** — Added `roundStartTime?: number` to `RoomState` (`src/types/game.ts:45`), `serverOffset` via `.info/serverTimeOffset` (`src/hooks/useRoom.ts:133`), all `roundStartTime` writes now `Date.now()+serverOffset`. Expanded `YouTubePlayer.tsx:4` handle with `seekTo`/`getCurrentTime`/`getDuration`/`getPlayerState` + `onStateChange`. Host ticker now absolute `Math.max(0, duration - floor((correctedNow - roundStartTime)/1000))` every 500 ms (survives background throttling). `GameView`/`JukeboxView` seek on `onReady` and drift-correct every 2 s (`>1.5 s` → `seekTo`).
- **YouTube robustness** — `src/lib/youtube.ts:5` patterns already strip `?t=`/`&list=` for `watch/youtu.be/shorts`; `YouTubePlayer` `onError` logs `101/150` embed block + `100` invalid as `console.warn` and exposes host/anyone **Skip Unplayable Track** (`GameView` host, `JukeboxView` anyone) via `hostNext`/`jukeboxNavigate`.
- **Host failover** — `src/hooks/useRoom.ts:169` effect promotes `Object.keys(players)[0]` if `hostId` not in `players`; `SubmissionView.tsx:152` and `LobbyView.tsx:63` `isHost` now reliably rehydrates via session `room.players[session.playerId]` check.
- **Jukebox common queue (Spotify-like jam)** — Modified, not new: `src/components/game/JukeboxView.tsx` now shows shuffled `tracks` as a tap-to-jump queue below the player, seek bar (`range` → `jukeboxSeek`), and `Prev/Pause/Next/Skip` are **anyone-can** (host guard removed from `jukeboxNavigate`/`setPlaybackPaused` + new `jukeboxJump`/`jukeboxSeek` in `src/hooks/useRoom.ts:431` + `App.tsx` `serverOffset` plumbing). All still share one `currentTrackIndex` + `roundStartTime` so everyone hears the same second like a jam. `YouTubePlayer` `key={videoId}` remount + `onReady` seek handles late join.
- **Tests:** `playerLogic.test.ts` now 26 cases (was 22, +4 shuffle). Total `64` (was 60).

## Fix — Room Name vs Host Name

**Bug:** Create form had only "Your Name"; the value was stored as the host player's name, so typing "abc" looked like "the room name became abc" (lobby showed "abc" as Host).

**Fix:** `RoomState` now has `roomName: string` (`src/types/game.ts:47`) distinct from the host's player name. New `src/lib/roomNames.ts:16` auto-generates fun Indian pop-culture names ("Gully Groovers", "Masala Beats", …) from word banks, `≤32` chars — host need not think. `src/components/game/EntryView.tsx:5` in Create mode shows **Your Name** (identity) + prefilled **Room Name** with 🎲 reroll (editable); `createRoom(hostName, roomName)` (`src/hooks/useRoom.ts:190`) stores it. `LobbyView.tsx:26` header shows `🎬 {roomName}` above the code; `App.tsx:77` header chip shows `🎬 {roomName} · {code}` while in a room; `fromFirestoreRoom` falls back to `Room {code}` for legacy rooms without `roomName`. No Firebase rules change needed. Names still WIP (to be polished later).

**Tests:** New `src/lib/roomNames.test.ts` (4 cases — format, length cap, trimmed, variety). `68` total.

## Fix — Concealed Voting (Dummy + Hide Self)

**Bug:** When your own song played, an amber *“This is your song — sit out”* banner replaced the voting grid — a neighbour shoulder-surfing could instantly tell whose song it was. And your own name still appeared as a disabled `(You)` button.

**Fix:** `src/components/game/GameView.tsx:23` now derives `candidates = players.filter(p.name !== myName)` so every screen shows **only other players** (3 buttons in a 4-player game, no `(You)` label, no self-button). The `isSubmitter` banner is removed; header is always `Who submitted this song?` → `Vote Locked ✅`. A submitter's tap sets local `dummyVote` (`:32/37`) and returns **without** `onSubmitGuess` — zero Firebase write, zero `scoring.ts` delta, excluded from `guessCount`/`eligible` counters, but shows the identical `Vote Locked ✅ You guessed {dummyVote}`. Every screen is now indistinguishable.

**Tests:** No new suite (no component tests; scoring already ignores submitter guesses); `68` total unchanged.

## Fix — Mid-game Rejoin, Toasts & Consistent Skip

**Bugs:** Leaving player showed no `left` toast, ghosts lingered on tab-close, and `joinRoom` threw `Room already in progress` for any status ≠ `LOBBY`, so a leaver couldn't rejoin without recreating. Required `allSubmitted` soft-locked `SubmissionView` start. `GameView` showed `Host can skip` banner to everyone but the `Skip Unplayable Track` button only to the host — non-host guessers saw the banner with no action.

**Fix:** `src/hooks/useRoom.ts:226` `joinRoom` now allows `LOBBY/SUBMISSION/PLAYING/REVEAL/INTERMISSION`, blocked only at `GAMEOVER` (`Game over — ask the host to start a new room`); both `createRoom`/`joinRoom` register `onDisconnect(players/{id}).remove()` for tab-close ghost cleanup. New `src/components/Toasts.tsx:1` diffs `players` keys (skipping initial load) for `🟢 {name} joined` / `🔴 {name} left` / `👑 You are now the host` (host failover promotion) at fixed bottom-center, 4 s auto-dismiss; wired in `src/App.tsx:13`. `src/components/game/SubmissionView.tsx:152` host Start now enabled when `room.tracks.length>0`, not gated on `allSubmitted`, so AFK/late joiners can't block. `src/components/game/GameView.tsx:47` banner now `Anyone can skip` for everyone and `Skip Unplayable Track` button rendered for **everyone only when `101/150/100`**; `src/hooks/useRoom.ts:365` `hostNext` is host-only except `PLAYING` skip which is open to anyone (other transitions still host-guarded).

**Tests:** `typecheck`/`68` tests/`build` green; no new suite (RTDB/toast logic is integration).

## Tests — Rigorous White-Box + Black-Box for All Bug Fixes

**Goal:** Prove every commercial bug fix with both branch (white-box) and spec (black-box) coverage, no regressions.

- **Scoring** — `src/lib/scoring.rigorous.test.ts:1` 19 cases (10 white + 5 black + 4 helpers): ghost vote ignored, self-farm blocked, departed submitter pool discarded, single-live full pool (leakage regression), 2-live 3/2 remainder, 3-live 4/3/3, submitter double-dip blocked, departed guesser ignored, accumulation + `roundToInteger` 2-decimal, empty submitters, spec +10/+5 split, empty guesses
- **YouTube** — `src/lib/youtube.rigorous.test.ts:1` 25 cases (13 white + 12 black): watch/`&list`/`&index`/`?t=`, `youtu.be` `?t`/`?list`, embed, shorts, http/no-www, boundary guard 12-char reject, non-string, first-pattern priority, dedup across 4 forms, `?t`/`&list` stripped dedup
- **Player logic** — `src/lib/playerLogic.rigorous.test.ts:1` 27 cases: `START/PAUSE/TICK` (!running same-ref, >0 decrement, ≤0 clamp), `RESET` custom/default, default unknown, `getPrevious/Next` boundaries, `navigateJukebox` empty/out-of-bounds/PREV/NEXT/finished, `shuffleFisherYates` crypto/`Math.random` fallback/rejection-sampling retry (forced `0xffffffff` > limit), immutability/permutation, spec 30/7/180
- **Bugfixes** — `src/lib/bugfixes.rigorous.test.ts:1` 44 cases: `getVoteCandidates` (null/self/empty/N-1), `shouldShowSkip` (null/100/101/150/other), `canJoinRoom` (5 allowed + GAMEOVER blocked + unknown), `getNewHostId` (keep/first/empty), `diffPlayers` (null/ join/leave/ join+leave/ no-diff), `canHostStart` (0/>0), `canHostNext` (PLAYING open vs SUBMISSION/REVEAL host-only), `normalizeRoomName` (trim/fallback/32-char), plus black-box concealed voting / rejoin / skip / roomName specs
- **Room names** — `src/lib/roomNames.rigorous.test.ts:1` 7 cases: pick/slice/trim/non-empty white + variety/fallback black
- **Storage** — `src/lib/storage.rigorous.test.ts:1` 10 cases: missing/malformed/missing fields/extra ignored/overwrite/clear white + save-clear + independent sessions black
- **Total rigorous added:** `+132` cases; grand total `200` across `11` suites, `0` failed, `typecheck`/`build` green

## Test Coverage Overview

| Suite                        | File                     | Cases | Focus                                              |
| ---------------------------- | ------------------------ | ----- | -------------------------------------------------- |
| YouTube                      | `youtube.test.ts`        | 19    | ID extraction + dedup |
| YouTube rigorous             | `youtube.rigorous.test.ts` | 25  | White+black: 4 patterns + boundary + dedup + stripping |
| Scoring                      | `scoring.test.ts`        | 10    | Guess points + submitter bonus (live split, self-farm blocked) |
| Scoring rigorous             | `scoring.rigorous.test.ts` | 19  | White+black: ghost/self-farm/leakage/remainder/rounding |
| Player logic (timer+nav+shuffle) | `playerLogic.test.ts` | 26  | Countdown, boundaries, intermission/jukebox, shuffle |
| Player logic rigorous        | `playerLogic.rigorous.test.ts` | 27 | White+black: reducer/branches/navigate/shuffle + crypto fallback/retry |
| Session storage              | `storage.test.ts`        | 9     | Persistence round-trip + host rehydrate    |
| Storage rigorous             | `storage.rigorous.test.ts` | 10  | White+black: malformed/missing/overwrite/clear |
| Room names                   | `roomNames.test.ts`      | 4     | Auto-generated room name format/length/variety |
| Room names rigorous          | `roomNames.rigorous.test.ts` | 7 | White+black: pick/slice/trim + fallback |
| Bugfixes (voting/skip/join)  | `bugfixes.rigorous.test.ts` | 44 | White+black: candidates/skip/join/failover/toasts/start/roomName |
| **Total**                    |                          | **200**|                                                   |
