/**
 * Result types shared by the board components, plus podium derivation.
 *
 * Brackets are the authoritative single-elimination pairing trees from Eyes on
 * Score (tournament_group_bracket_layout): seeds, head-to-head matches, real
 * winners. A division with no bracket (e.g. 3D qualification only) falls back to
 * top qualifiers for its placings.
 */

export interface EventQualRow {
  rank: number
  name: string
  avg: string
  score: number
}

/** One archer's side of a head-to-head match. */
export interface BracketShooter {
  name: string
  seed: number
  score: number
  winner: boolean
}

export interface BracketMatch {
  a: BracketShooter
  b: BracketShooter | null
}

export interface BracketRound {
  name: string
  matches: BracketMatch[]
}

export interface EventBracket {
  rounds: BracketRound[]
}

export interface EventDivision {
  name: string
  champion: string | null
  qualification: EventQualRow[]
  bracket: EventBracket | null
}

export interface Podium {
  first: string | null
  second: string | null
  third: string | null
}

function matchWinner(m: BracketMatch): string | null {
  if (m.a.winner) return m.a.name
  if (m.b?.winner) return m.b.name
  return null
}

function matchLoser(m: BracketMatch): string | null {
  if (m.a.winner) return m.b?.name ?? null
  return m.a.name
}

/**
 * Final placings. In the final round, match 0 is the gold match (winner = 1st,
 * loser = 2nd) and match 1 is the bronze match (winner = 3rd). Falls back to the
 * top qualifiers when a division has no bracket.
 */
export function getPodium(division: EventDivision): Podium {
  const rounds = division.bracket?.rounds ?? []
  const final = rounds[rounds.length - 1]
  const gold = final?.matches[0]
  if (gold !== undefined) {
    return {
      first: matchWinner(gold),
      second: matchLoser(gold),
      third: final?.matches[1] ? matchWinner(final.matches[1]) : null,
    }
  }
  const seeded = [...division.qualification].sort((a, b) => a.rank - b.rank)
  return {
    first: seeded[0]?.name ?? null,
    second: seeded[1]?.name ?? null,
    third: seeded[2]?.name ?? null,
  }
}
