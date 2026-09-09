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

**Fix (kept design, real-time verified):** `src/components/game/GameView.tsx:23` renders the identical full roster on every screen (`[...players].sort(by name)`, including yourself, same order everywhere) — no banner, no tells. The `isSubmitter` banner is removed; header is always `Who submitted this song?` → `Vote Locked ✅`. A submitter's tap sets local `dummyVote` and returns **without** `onSubmitGuess` — zero Firebase write, zero `scoring.ts` delta, excluded from `guessCount`/`eligible` counters, but shows the identical `Vote Locked ✅ You guessed {dummyVote}`. Since self appears in the grid, `src/lib/scoring.ts` voids self-votes entirely (no `+10`, never feed the incorrect pool) so the farm stays dead with zero UI difference.

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
- **Bugfixes** — `src/lib/bugfixes.rigorous.test.ts:1` 44 cases: `getVoteCandidates` (identical full roster incl. self), `shouldShowSkip`, `canJoinRoom`, `getNewHostId`, `diffPlayers`, `canHostStart`, `canHostNext`, `normalizeRoomName`, plus black-box concealed voting / rejoin / skip / roomName specs
- **Scoring rigorous** now also covers void self-votes (fully void alone, no pool inflation mixed with real incorrect)
- **Room names** — `src/lib/roomNames.rigorous.test.ts:1` 7 cases: pick/slice/trim/non-empty white + variety/fallback black
- **Storage** — `src/lib/storage.rigorous.test.ts:1` 10 cases: missing/malformed/missing fields/extra ignored/overwrite/clear white + save-clear + independent sessions black
- **Total rigorous added:** `+132` cases; grand total `200` across `11` suites, `0` failed, `typecheck`/`build` green

## Phase 1 — Room Lifecycle (Play Again, End Room, Auto-Cleanup)

**Bug:** Finished rooms locked forever at `GAMEOVER` (`Game over — ask the host to start a new room`); nothing ever deleted a room, so dead shells piled up in the DB and no rematch was possible without a new code.

**Fix:** New `src/lib/roomLifecycle.ts:1` pure helpers — `resetPlayersForPlayAgain` (roster kept, scores zeroed), `removePlayer` (returns null when nobody remains), `buildPlayAgainReset` (LOBBY + cleared tracks/submissions/guesses/deltas/timers). `src/hooks/useRoom.ts` gains host-guarded `playAgain` (one transaction resets the same room — code/name/host/mode kept) and `endRoom` (removes the whole node); `leaveRoom` is now a transaction that returns `null` when the last player leaves so the room auto-deletes; the `onValue` listener sends everyone home (`clearSession` + invalid-session routing) when the node vanishes. `src/components/game/LeaderboardView.tsx` shows host `🔄 Play Again (same code)` + `End Room`, guests `Waiting for host to start a new game…`; wired in `src/App.tsx` (`handleEndRoom`).

**Tests:** New `src/lib/roomLifecycle.rigorous.test.ts` (10 cases — reset keeps id/name, no mutation, last-leave null, unknown-id, full reset shape, rematch spec). `210` total.

## Phase 2 — Duplicate Names Blocked

**Bug:** `joinRoom` accepted any name blindly. Two "Alice"s → both matched `submittedBy.includes(myName)` (both got dummy screens, both lost their vote) and `findPlayerIdByName` paid the bonus to the first match only.

**Fix:** New pure `isNameTaken(players, name)` in `src/lib/roomLifecycle.ts` (trimmed, case-insensitive); `src/hooks/useRoom.ts joinRoom` throws `Name already taken in this room`, surfaced in the Entry red error box (no UI change needed). `createRoom` needs nothing (fresh room, single host). Tradeoff accepted: a lingering ghost briefly blocks its name until auto-cleaned; auto-takeover rejected (could hijack a live player).

**Tests:** +8 cases in `roomLifecycle.rigorous.test.ts` (exact/case/whitespace/blank/empty/messy white + duplicate spec black). `221` total.

## Phase 3 — Jukebox Skip Consistency

**Bug:** `JukeboxView.tsx:164` rendered `Skip Unplayable Track` always, while `GameView.tsx:125` shows it only on `101/150/100` errors — same banner, different button rules per mode.

**Fix:** Jukebox skip button now gated on `playerError !== null && [100, 101, 150].includes(playerError)`, exactly like GameView. Both modes: identical amber `Anyone can skip` banner + identical button, visible to everyone at the same time, only on unplayable errors.

**Tests:** No new suite (one-condition JSX change; the `shouldShowSkip` branches are already covered in `bugfixes.rigorous.test.ts`). `221` total unchanged.

## Phase 4 — Dead Code Removal

**Fix:** Removed unused `updateGameState` from `src/hooks/useRoom.ts` (interface + implementation + export — zero callers, and it bypassed all host guards). `221` total unchanged.

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
| Room names rigorous          | `roomNames.rigorous.test.ts` | 10 | Telugu-cinema bank: exhaustive ≤32/meanings + dice spec |
| Bugfixes (voting/skip/join)  | `bugfixes.rigorous.test.ts` | 44 | White+black: candidates/skip/join/failover/toasts/start/roomName |
| Room lifecycle               | `roomLifecycle.rigorous.test.ts` | 40 | Reset, last-leave, rematch, duplicate names, host-fixed count + dead-round spec |
| Build marker                 | `version.rigorous.test.ts` | 5 | Missing/blank/40-char/short/custom label branches |
| **Total**                    |                          | **257**|                                                   |

## Dead-Round Filter (Unvotable Tracks Never Start)

**Bug:** Both players submitted the same link → dedup merged one track with all players as submitters → both taps became local dummies (correctly unrecorded) → reveal scored nothing → `GAMEOVER` 0–0 with `1 track played`. A structurally unplayable game with no warning and no way forward.

**Fix:** New pure `partitionPlayable(tracks, playerNames)` in `src/lib/roomLifecycle.ts` (unvotable = every live player submitted it). `src/hooks/useRoom.ts hostNext` filters before shuffling — **Guessing only** (Jukebox keeps all tracks, playback needs no voters); zero-playable guessing start is a transaction no-op. `src/components/game/SubmissionView.tsx` shows `⚠️ N tracks everyone submitted — skipped at start` and blocks Start with `No playable tracks — submit different songs` when none remain playable.

**Tests:** +8 cases (all-submitter dead round, outsider playable, departed names ignored, mixed split order-preserved, empty, no-live-players, same-link spec, normal-game spec). `257` total.

## Host-Fixed Song Count (Exactly N)

**Gap:** Every player picked their own song count (local stepper 1–10); `submitSongs` accepted any number — 2 vs 8 songs in the same game, nothing enforced.

**Fix:** New `RoomState.songsPerPlayer` (default 3, legacy fallback). Host-only `setSongsPerPlayer` in `src/hooks/useRoom.ts` (caller-is-host + `LOBBY` guards, clamped 1–10); `src/components/game/LobbyView.tsx` host stepper + guest static line. `src/components/game/SubmissionView.tsx` drops the per-client stepper, renders exactly N inputs, Submit enables only at `validCount === N` (`Add X more` otherwise); `submitSongs` transaction truncates stored URLs to the first N (devtools-proof backstop). `playAgain` preserves the count (room setting like `mode`).

**Tests:** +14 cases (`clampSongCount` valid/min/max/fraction/garbage, `limitUrls` truncate/exact/short/fallback, `hasExactCount` exact/short/long/clamped, spec: button gating + oversubmit truncation). `240` total.

## Ops — Deployment Currency Litmus + Footer Build Marker

**Problem:** Phantom "shuffle not working" report traced to a stale Vercel build (grouped playback = pre-shuffle code); no in-app way to tell which build is live.

**Fix:** New `src/lib/version.ts` (`APP_BUILD` from `VITE_APP_VERSION`, `getBuildLabel` truncates 40-char hashes to 7, caps custom labels at 32, falls back to `dev`); `src/App.tsx` footer shows `pmp · build {label}`; `src/vite-env.d.ts` types the optional var. `docs/DEPLOYMENT.md` gains an "Is the Live Site Current?" litmus (footer marker → feature spot-check → dashboard commit compare → redeploy; one-time Build Command `VITE_APP_VERSION=$VERCEL_GIT_COMMIT_SHA npm run build` so the footer stamps real hashes).

**Tests:** New `src/lib/version.rigorous.test.ts` (5 cases). `226` total.

## Polish — Telugu-Cinema Room Names with Meanings

**Ask:** generic word banks ("Gully Groovers") weren't fun enough; base names on Telugu movies with a joke explained per roll.

**Fix:** `src/lib/roomNames.ts` now holds 48 curated `ROOM_NAMES` entries (iconic titles + twists like "Ee Playlistki Emaindi", "SR Karaoke Mandapam", "DJ Tillu Tunes"), each with a `meaning`. New `generateRoomNameEntry()` / `getRoomNameMeaning()`; `src/components/game/EntryView.tsx` shows `💡 {meaning}` under the Room Name field (updates on 🎲 reroll, hides when hand-typed). All names ≤ 32 chars.

**Tests:** `roomNames.rigorous.test.ts` rewritten (10 cases — exhaustive bank ≤32/meanings/uniqueness + dice spec). `213` total.

## Pacing — 15s Snippets + 5s Intermission

**Ask:** shorter rounds so multiple games fit per session (~25s/round, ~2× games).

**Fix:** `SNIPPET_DURATION_SECONDS 30→15`, `INTERMISSION_DURATION_SECONDS 7→5` (`src/lib/playerLogic.ts:1`) — the single source everything derives from (host ticker, `hostNext`, seek sync, Play Again reset, progress bars), so no logic changes. Labels → "15s Snippet" (`GameView`, legacy `PlayerStage`); `IntermissionView` already renders dynamically. Tests updated to 15/5 literals; docs swept.

**Tests:** `249` total unchanged (updated, not added).
