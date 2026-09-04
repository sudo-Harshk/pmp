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

### 2. Submitter Bonus (+5 per incorrect guess, split equally)

For **each guesser who guessed incorrectly**, the submitters collectively earn **+5**. That bonus pool is split **equally** among all submitters in `track.submittedBy`.

- If the bonus pool doesn't divide evenly, the remainder is distributed one point at a time to the first submitters.
  - Example: 2 submitters, 1 incorrect guess → pool = 5 → `3 + 2`.
  - Example: 1 submitter, 3 incorrect guesses → pool = 15 → the submitter gets all 15.

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
- Submitters who do **not** resolve to a player ID are skipped (they contribute to the pool but receive no bonus).
- A player who is both a correct guesser **and** a submitter can accrue both points.
- `bestRound` (per player) is updated at reveal time as the maximum single-round delta, powering the leaderboard's "Best Round" stat.
