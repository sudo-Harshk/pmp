import type { PlaylistTrack, Player } from '@/types/game'

export const CORRECT_GUESS_POINTS = 10
export const SUBMITTER_BONUS_PER_INCORRECT_GUESS = 5

export interface RoundResult {
  scores: Record<string, number>
  deltas: Record<string, number>
}

function roundToInteger(value: number): number {
  return Math.round(value * 100) / 100
}

export function calculateRoundScores(
  track: PlaylistTrack,
  guesses: Record<string, string>,
  currentScores: Record<string, number>,
  players: Record<string, Player>,
): RoundResult {
  const scores: Record<string, number> = { ...currentScores }
  const deltas: Record<string, number> = {}

  const submitters = track.submittedBy
  const correctNames = new Set(submitters)

  for (const guesserId of Object.keys(guesses)) {
    const guessedName = guesses[guesserId]
    const delta = correctNames.has(guessedName) ? CORRECT_GUESS_POINTS : 0
    deltas[guesserId] = (deltas[guesserId] ?? 0) + delta
    scores[guesserId] = (scores[guesserId] ?? 0) + delta
  }

  const incorrectGuessCount = Object.keys(guesses).filter(
    (guesserId) => !correctNames.has(guesses[guesserId]),
  ).length

  if (incorrectGuessCount > 0 && submitters.length > 0) {
    const bonusPool = SUBMITTER_BONUS_PER_INCORRECT_GUESS * incorrectGuessCount
    const base = Math.floor(bonusPool / submitters.length)
    const rem = bonusPool % submitters.length

    const resolvedSubmitterIds = submitters
      .map((name) => findPlayerIdByName(players, name))
      .filter((id): id is string => id !== null)

    resolvedSubmitterIds.forEach((submitterId, index) => {
      const share = base + (index < rem ? 1 : 0)
      deltas[submitterId] = (deltas[submitterId] ?? 0) + share
      scores[submitterId] = (scores[submitterId] ?? 0) + share
    })
  }

  const roundedScores: Record<string, number> = {}
  const roundedDeltas: Record<string, number> = {}
  for (const [id, value] of Object.entries(scores)) {
    roundedScores[id] = roundToInteger(value)
  }
  for (const [id, value] of Object.entries(deltas)) {
    roundedDeltas[id] = roundToInteger(value)
  }

  return { scores: roundedScores, deltas: roundedDeltas }
}

export function findPlayerIdByName(
  players: Record<string, Player>,
  playerName: string,
): string | null {
  for (const [id, player] of Object.entries(players)) {
    if (player.name === playerName) return id
  }
  return null
}
