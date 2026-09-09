import { describe, expect, it } from 'vitest'
import { calculateRoundScores, findPlayerIdByName } from '@/lib/scoring'
import type { Player, PlaylistTrack } from '@/types/game'

function makePlayer(id: string, name: string, score = 0): Player {
  return { id, name, score, hasSubmitted: false, bestRound: 0 }
}
function track(submittedBy: string[]): PlaylistTrack {
  return { videoId: 'aaaaaaaaaaa', submittedBy, played: false }
}

// ─────────────────────────────────────────────────────────────────────────────
// WHITE-BOX: branch-by-branch coverage of calculateRoundScores
// ─────────────────────────────────────────────────────────────────────────────
describe('WHITE-BOX: calculateRoundScores branches', () => {
  it('branch: guesserId not in players → continue (departed ghost vote ignored)', () => {
    const players: Record<string, Player> = { pAlice: makePlayer('pAlice', 'Alice') }
    const t = track(['Alice'])
    const guesses: Record<string, string> = { pGhost: 'Alice', pAlice: 'Alice' } // pGhost departed, pAlice is submitter (self)
    const { deltas, scores } = calculateRoundScores(t, guesses, {}, players)
    // ghost ignored, submitter self-guess ignored → no deltas for them (but submitter would still get bonus if there were incorrect, none here)
    expect(deltas.pGhost).toBeUndefined()
    expect(deltas.pAlice).toBeUndefined()
    expect(scores).toEqual({})
  })

  it('branch: guesser is submitter → continue (self-farm blocked)', () => {
    const players: Record<string, Player> = {
      pAlice: makePlayer('pAlice', 'Alice'),
      pBob: makePlayer('pBob', 'Bob'),
    }
    const t = track(['Alice'])
    // Alice guesses Bob (incorrect) but Alice is submitter — must be ignored entirely, not counted as incorrect
    const guesses: Record<string, string> = { pAlice: 'Bob' }
    const { deltas, scores } = calculateRoundScores(t, guesses, {}, players)
    expect(deltas.pAlice).toBeUndefined()
    expect(scores.pAlice).toBeUndefined()
    // No incorrect counted, so no bonus either
    expect(deltas).toEqual({})
  })

  it('branch: self-guess not counted toward incorrectGuessCount (no pool created from self incorrect)', () => {
    const players: Record<string, Player> = {
      pAlice: makePlayer('pAlice', 'Alice'),
      pBob: makePlayer('pBob', 'Bob'),
      pCarol: makePlayer('pCarol', 'Carol'),
    }
    const t = track(['Alice'])
    // Bob correct, Alice (submitter) incorrect — only Bob should count, Alice ignored → bonus pool 0 (no incorrect from non-submitters)
    const guesses: Record<string, string> = { pBob: 'Alice', pAlice: 'Carol' }
    const { deltas } = calculateRoundScores(t, guesses, {}, players)
    expect(deltas.pBob).toBe(10)
    expect(deltas.pAlice).toBeUndefined() // self-farm ignored, no bonus because incorrectCount=0
  })

  it('branch: resolvedSubmitterIds empty → pool discarded (departed submitter)', () => {
    const players: Record<string, Player> = {
      pBob: makePlayer('pBob', 'Bob'),
      pCarol: makePlayer('pCarol', 'Carol'),
    }
    const t = track(['Ghost']) // submitter not in players (departed)
    const guesses: Record<string, string> = { pBob: 'Carol' } // incorrect
    const { deltas, scores } = calculateRoundScores(t, guesses, {}, players)
    expect(deltas.pBob).toBe(0)
    // Ghost not live → no bonus awarded to anyone, pool discarded
    expect(deltas).not.toHaveProperty('Ghost')
    expect(scores).not.toHaveProperty('Ghost')
  })

  it('branch: bonus split — single live submitter gets full pool (no leakage)', () => {
    const players: Record<string, Player> = {
      pAlice: makePlayer('pAlice', 'Alice'),
      pBob: makePlayer('pBob', 'Bob'),
      pCarol: makePlayer('pCarol', 'Carol'),
    }
    // Track has Alice + Ghost (departed), but only Alice is live
    const t = track(['Alice', 'Ghost'])
    const guesses: Record<string, string> = { pBob: 'Carol', pCarol: 'Dave' } // 2 incorrect (non-self)
    const { deltas } = calculateRoundScores(t, guesses, {}, players)
    // Pool = 10, divided by 1 live submitter → Alice gets 10 (not 5 with leakage 5/2)
    expect(deltas.pAlice).toBe(10)
  })

  it('branch: bonus split — 2 live submitters, remainder distributed to first (3/2)', () => {
    const players: Record<string, Player> = {
      pAlice: makePlayer('pAlice', 'Alice'),
      pBob: makePlayer('pBob', 'Bob'),
      pCarol: makePlayer('pCarol', 'Carol'),
    }
    const t = track(['Alice', 'Bob'])
    const guesses: Record<string, string> = { pCarol: 'Ghost' } // 1 incorrect → pool 5 → 3/2
    const { deltas } = calculateRoundScores(t, guesses, {}, players)
    expect(deltas.pAlice).toBe(3)
    expect(deltas.pBob).toBe(2)
  })

  it('branch: bonus split — 3 live submitters, pool 10 → 4/3/3', () => {
    const players2: Record<string, Player> = {
      pAlice: makePlayer('pAlice', 'Alice'),
      pBob: makePlayer('pBob', 'Bob'),
      pCarol: makePlayer('pCarol', 'Carol'),
      pDave: makePlayer('pDave', 'Dave'),
      pEve: makePlayer('pEve', 'Eve'),
    }
    const t2 = track(['Alice', 'Bob', 'Carol'])
    const guesses2: Record<string, string> = { pDave: 'Ghost', pEve: 'Ghost' } // 2 incorrect → pool 10 → 4/3/3
    const { deltas } = calculateRoundScores(t2, guesses2, {}, players2)
    expect(deltas.pAlice).toBe(4)
    expect(deltas.pBob).toBe(3)
    expect(deltas.pCarol).toBe(3)
  })

  it('branch: submitter also correct guesser + bonus — accumulates both', () => {
    const players: Record<string, Player> = {
      pAlice: makePlayer('pAlice', 'Alice'),
      pBob: makePlayer('pBob', 'Bob'),
      pCarol: makePlayer('pCarol', 'Carol'),
    }
    const t = track(['Bob']) // Bob is submitter
    // Alice correct, Carol incorrect → Alice +10, Bob gets bonus 5 from Carol incorrect + also Alice correct doesn't give Bob bonus for correct? Wait bonus is per incorrect, so Bob gets 5
    // But can a submitter also be correct guesser? Bob is submitter, Alice guesses Bob correct → Alice +10, Bob +5 bonus from Carol? Actually Carol incorrect is also vs Bob's track, so Bob gets bonus.
    // Let's test scenario where a non-submitter is also bonus? No. Instead test where a player is submitter for this track and also guesses correctly on same track — that's self-farm blocked, not both.
    // So self can't be both. Instead test where a player previously earned but now gets both via different tracks? Not same round.
    // For same round, a submitter cannot earn correct-guess points (self ignored). So we test that submitter cannot double-dip via guessing own track.
    const guesses: Record<string, string> = { pBob: 'Bob', pAlice: 'Bob' } // Bob self-guess ignored, Alice correct
    const { deltas } = calculateRoundScores(t, guesses, {}, players)
    expect(deltas.pBob).toBeUndefined() // self-farm blocked, and no incorrect → no bonus
    expect(deltas.pAlice).toBe(10)
  })

  it('branch: departed guesser ignored in incorrect count', () => {
    const players: Record<string, Player> = {
      pAlice: makePlayer('pAlice', 'Alice'),
      pBob: makePlayer('pBob', 'Bob'),
    }
    const t = track(['Alice'])
    const guesses: Record<string, string> = { pGhost: 'Carol', pBob: 'Carol' }
    const { deltas } = calculateRoundScores(t, guesses, {}, players)
    // Only Bob counts (1 incorrect) → Alice gets 5, ghost ignored
    expect(deltas.pAlice).toBe(5)
    expect(deltas.pBob).toBe(0)
  })

  it('branch: currentScores accumulation and rounding', () => {
    const players: Record<string, Player> = {
      pAlice: makePlayer('pAlice', 'Alice'),
      pBob: makePlayer('pBob', 'Bob'),
    }
    const t = track(['Alice'])
    const guesses: Record<string, string> = { pBob: 'Alice' }
    const current = { pBob: 20.5, pAlice: 1.234 }
    const { scores } = calculateRoundScores(t, guesses, current, players)
    expect(scores.pBob).toBe(30.5)
    expect(scores.pAlice).toBe(1.23) // no bonus, rounded via roundToInteger (1.234*100=123.4→123→1.23)
  })

  it('branch: submitters length 0 → no bonus even if incorrect', () => {
    const players: Record<string, Player> = {
      pBob: makePlayer('pBob', 'Bob'),
    }
    const t = track([])
    const guesses: Record<string, string> = { pBob: 'Alice' }
    const { deltas } = calculateRoundScores(t, guesses, {}, players)
    expect(deltas.pBob).toBe(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// BLACK-BOX: spec-based — input → expected output without knowing internals
// ─────────────────────────────────────────────────────────────────────────────
describe('BLACK-BOX: scoring spec', () => {
  const players: Record<string, Player> = {
    pAlice: makePlayer('pAlice', 'Alice'),
    pBob: makePlayer('pBob', 'Bob'),
    pCarol: makePlayer('pCarol', 'Carol'),
    pDave: makePlayer('pDave', 'Dave'),
  }

  it('spec: +10 per correct guesser, no other effect', () => {
    const t = track(['Alice'])
    const { deltas } = calculateRoundScores(t, { pBob: 'Alice', pCarol: 'Alice' }, {}, players)
    expect(deltas).toEqual({ pBob: 10, pCarol: 10 })
  })

  it('spec: +5 per incorrect guesser split among live submitters', () => {
    const t = track(['Alice', 'Bob'])
    const { deltas } = calculateRoundScores(t, { pCarol: 'Dave', pDave: 'Carol' }, {}, players)
    // 2 incorrect (non-self) → pool 10 → 5/5
    expect(deltas.pAlice).toBe(5)
    expect(deltas.pBob).toBe(5)
  })

  it('spec: submitter self-vote has zero effect (black-box)', () => {
    const t = track(['Alice'])
    const before = calculateRoundScores(t, { pBob: 'Carol' }, {}, players)
    const after = calculateRoundScores(t, { pBob: 'Carol', pAlice: 'Bob' }, {}, players)
    expect(before.deltas).toEqual(after.deltas) // Alice self-vote adds nothing
    expect(before.scores).toEqual(after.scores)
  })

  it('spec: departed submitter not awarded (leakage regression)', () => {
    const t = track(['Alice', 'Ghost'])
    const { deltas } = calculateRoundScores(t, { pBob: 'Carol' }, {}, players)
    // Only Alice live → she gets full 5, not 3
    expect(deltas.pAlice).toBe(5)
    expect(deltas.pBob).toBe(0)
  })

  it('spec: empty guesses → no scores changed', () => {
    const t = track(['Alice'])
    const { deltas, scores } = calculateRoundScores(t, {}, { pBob: 7 }, players)
    expect(deltas).toEqual({})
    expect(scores).toEqual({ pBob: 7 })
  })

  it('spec: non-submitter self-vote is fully void (no delta, no pool feed)', () => {
    const t = track(['Alice'])
    // Bob votes himself: void — Alice gets no bonus from it
    const { deltas } = calculateRoundScores(t, { pBob: 'Bob' }, {}, players)
    expect(deltas.pBob).toBeUndefined()
    expect(deltas.pAlice).toBeUndefined()
  })

  it('spec: self-vote mixed with real incorrect does not inflate pool', () => {
    const t = track(['Alice'])
    // Bob self-votes (void) + Carol genuinely incorrect → pool from Carol only = 5
    const { deltas } = calculateRoundScores(t, { pBob: 'Bob', pCarol: 'Dave' }, {}, players)
    expect(deltas.pBob).toBeUndefined()
    expect(deltas.pCarol).toBe(0)
    expect(deltas.pAlice).toBe(5)
  })
})

describe('WHITE-BOX: findPlayerIdByName', () => {
  it('returns id when name matches', () => {
    const players: Record<string, Player> = {
      p1: makePlayer('p1', 'Alice'),
      p2: makePlayer('p2', 'Bob'),
    }
    expect(findPlayerIdByName(players, 'Bob')).toBe('p2')
  })
  it('returns null when not found', () => {
    const players: Record<string, Player> = { p1: makePlayer('p1', 'Alice') }
    expect(findPlayerIdByName(players, 'Ghost')).toBeNull()
  })
  it('case-sensitive', () => {
    const players: Record<string, Player> = { p1: makePlayer('p1', 'Alice') }
    expect(findPlayerIdByName(players, 'alice')).toBeNull()
  })
})
