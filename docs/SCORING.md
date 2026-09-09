# Scoring Rules

Scoring is a **pure function** — no Firebase I/O — implemented in `src/lib/scoring.ts` and unit-tested in `src/lib/scoring.test.ts`.

## Function Signature

```ts
calculateRoundScores(
  track: PlaylistTrack,
  guesses: Record<string, string>,   // { playerId: guessedName }
  currentScores: Record<string, number>,
  players: Record<string, Player>,    // used to resolve submitter names -> IDs
): { scores: Record<string, number>, deltas: Record<string, number> }
```

- `scores` — the **updated** totals (each player's `currentScores` value plus this round's delta).
- `deltas` — the point change per player this round.

## Point System

### 1. Guesser Points (+10 for a correct guess)

Every player who guessed a name that appears in the track's `submittedBy` list earns **+10**.

```ts
const delta = correctNames.has(guessedName) ? 10 : 0
```

### 2. Submitter Bonus (+5 per incorrect guess, split equally among live submitters)

For **each guesser who guessed incorrectly** (excluding departed players and submitters themselves — submitter self-guesses are ignored to prevent devtools farm), the **live** submitters collectively earn **+5**. That bonus pool is split **equally** among `resolvedSubmitterIds` (names in `submittedBy` that still map to a live `playerId`).

- No leakage: pool is divided by `resolved.length`, not original `submittedBy.length`; if `["Alice","Ghost"]` with Ghost gone, Alice gets the full `5` (previously `3` leaked `2`).
- Remainder bias still goes to first live submitters in `submittedBy` order (shuffled global order, but `submittedBy` inner order is insertion).
  - Example: 2 live submitters, 1 incorrect guess → pool = 5 → `3 + 2`.
  - Example: 1 live submitter, 3 incorrect guesses → pool = 15 → the submitter gets all 15.
  - Example: 0 live submitters → pool discarded, no phantom points.

### Example

Track `submittedBy: ['Alice', 'Bob']`, guesses:
- Carol → "Alice" (correct, +10)
- Dave → "Frank" (incorrect)
- Eve → "Bob" (correct, +10)

Incorrect guessers: 1 → bonus pool = 5, split `3 / 2` between Alice and Bob.

**Result deltas:**
| Player | Why                  | Delta |
| ------ | -------------------- | ----- |
| Carol  | correct guess        | +10   |
| Eve    | correct guess        | +10   |
| Alice  | submitter bonus      | +3    |
| Bob    | submitter bonus      | +2    |
| Dave   | incorrect            | 0     |

## Notes

- `guesses` is keyed by **player ID**; the `submittedBy` values are **names**. The `players` record is used to map each submitter name back to a player ID so bonuses land on the right player.
- Guesses from departed players or from a submitter of the current track are **ignored** (no `+10`, not counted toward `incorrect` pool) — owners see the identical full voting grid but their tap is a local dummy (`Vote Locked ✅`, zero Firebase write), so they cannot farm own bonus via devtools.
- Self-votes (guessed name = own name) are fully **void** — no `+10`, never counted toward the `incorrect` pool — because the grid shows yourself; this keeps the identical-grid UI cheat-proof.
- Submitters who do **not** resolve to a live player ID are skipped and do **not** dilute the split (no leakage).
- Double `hostReveal` is blocked inside the transaction (`status !== PLAYING` → no-op), so a round cannot be scored twice.
- `RevealView` now renders sit-out submitters (`sat out — your track ★ +5`) not just guessers, so bonuses are visible; `GameView` counter is `eligible = players - submittedBy` and `guessCount` excludes departed/self.
- `bestRound` (per player) is updated at reveal time as `max(prev, delta)`, powering the leaderboard tiebreak `score → bestRound → name` (`LeaderboardView` sort).
