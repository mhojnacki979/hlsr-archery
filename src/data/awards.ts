/**
 * Final placements merged with the HLSR prize schedule — the awards sheet that
 * gets printed at the venue.
 *
 * Classes whose EOS name cannot be matched to a prize class are still listed
 * with their placings, flagged and without prizes, so nobody is handed an award
 * on a guess.
 */
import { getPlacings } from './events'
import type { EventDivision } from './events'
import { getHlsr } from './hlsr'
import type { HlsrSegmentKey } from './hlsr'
import { describeAward, getAward, resolvePrizeKey } from './prizes'
import type { MatchConfidence } from './prizes'

export interface AwardRow {
  place: number
  name: string
  /** Formatted prize, empty when this place is not paid in this class. */
  award: string
}

export interface AwardClass {
  name: string
  confidence: MatchConfidence
  note?: string
  rows: AwardRow[]
}

export interface AwardSegment {
  key: HlsrSegmentKey
  label: string
  classes: AwardClass[]
}

const SEGMENT_DIVISION: Record<HlsrSegmentKey, 'Target' | '3D'> = {
  target: 'Target',
  '3d': '3D',
}

function buildClass(division: EventDivision, prizeDivision: 'Target' | '3D'): AwardClass {
  const match = resolvePrizeKey(division.name, prizeDivision)
  const rows = getPlacings(division).map((placing) => ({
    place: placing.place,
    name: placing.name,
    award: describeAward(getAward(match.key, placing.place)),
  }))
  return {
    name: division.name,
    confidence: match.confidence,
    ...(match.note !== undefined ? { note: match.note } : {}),
    rows,
  }
}

/** Every class of the event, in printing order, with prizes attached. */
export function buildAwards(year = 2025): AwardSegment[] {
  const event = getHlsr(year)
  if (event === null) return []
  return (['target', '3d'] as const).map((key) => ({
    key,
    label: event.segments[key].label,
    classes: event.segments[key].divisions.map((d) => buildClass(d, SEGMENT_DIVISION[key])),
  }))
}
