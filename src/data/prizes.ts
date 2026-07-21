/**
 * HLSR prize schedule, and the bridge between Eyes on Score class names and the
 * committee's prize taxonomy.
 *
 * Prizes are keyed "Division|Age|Gender|Bow" and awarded by finishing position.
 * They are not uniform — Senior classes add a lifetime license, Target Recurve
 * pays far more than 3D Junior — so every class carries its own rows. Generated
 * from the committee workbook by scripts/parse-prizes.py.
 */
import prizes2026 from './hlsr/prizes-2026.json'

export interface Award {
  cash?: number
  license?: string
  buckle?: string
  cooler?: string
  trophy?: string
}

type PrizeTable = Record<string, Record<string, Award>>

const TABLE: PrizeTable = prizes2026 as PrizeTable

/** How confident the EOS class -> prize class match is. */
export type MatchConfidence = 'exact' | 'assumed' | 'unmatched'

export interface PrizeMatch {
  key: string | null
  confidence: MatchConfidence
  /** Why a match was assumed or refused — surfaced in the awards output. */
  note?: string
}

/**
 * EOS 3D uses Eagle/Youth/Young Adult; the prize sheet uses Junior/Intermediate/
 * Senior. Target uses the prize sheet's own names already.
 */
const AGE_ALIASES: Record<string, string> = {
  eagle: 'Junior',
  junior: 'Junior',
  youth: 'Intermediate',
  intermediate: 'Intermediate',
  'young adult': 'Senior',
  senior: 'Senior',
}

/** EOS bow wording -> the prize sheet's bow classes, per division. */
const BOW_ALIASES: Record<string, Record<string, string>> = {
  '3D': { pins: 'Pins', open: 'Open', recurve: 'Recurve', barebow: 'Barebow' },
  Target: {
    barebow: 'Barebow',
    recurve: 'Recurve',
    nasp: 'NASP',
    // EOS lumps compound into one class; the sheet splits Freestyle Compound
    // from Fixed Pins. Freestyle is the assumed default (see resolvePrizeKey).
    compound: 'Freestyle Compound',
  },
}

function findAge(className: string): string | null {
  const lower = className.toLowerCase()
  // Longest alias first so "young adult" wins over a bare "adult"/"junior".
  for (const alias of Object.keys(AGE_ALIASES).sort((a, b) => b.length - a.length)) {
    if (lower.includes(alias)) return AGE_ALIASES[alias] ?? null
  }
  return null
}

function findBow(className: string, division: string): string | null {
  const lower = className.toLowerCase()
  const aliases = BOW_ALIASES[division] ?? {}
  for (const alias of Object.keys(aliases).sort((a, b) => b.length - a.length)) {
    if (lower.includes(alias)) return aliases[alias] ?? null
  }
  return null
}

function findGender(className: string): string | null {
  const lower = className.toLowerCase()
  if (lower.includes('female')) return 'Female'
  if (lower.includes('male')) return 'Male'
  return null // e.g. EOS "Open" (mixed-gender) classes
}

/**
 * Map an EOS class name (e.g. "Pins Eagle (Ages 9-11) Female" or "Compound
 * Senior Male") onto a prize class key. Returns `unmatched` rather than
 * guessing when the two taxonomies genuinely disagree.
 */
export function resolvePrizeKey(className: string, division: '3D' | 'Target'): PrizeMatch {
  const age = findAge(className)
  const bow = findBow(className, division)
  const gender = findGender(className)

  if (age === null || bow === null) {
    return { key: null, confidence: 'unmatched', note: 'no matching age or bow class' }
  }
  if (gender === null) {
    return {
      key: null,
      confidence: 'unmatched',
      note: 'EOS runs this class mixed-gender; prizes are awarded separately to Male and Female',
    }
  }

  const key = `${division}|${age}|${gender}|${bow}`
  if (TABLE[key] === undefined) {
    return { key, confidence: 'unmatched', note: 'no prize rows for this class' }
  }
  // Compound is the one genuinely ambiguous bow: EOS does not say whether the
  // archer shot Freestyle Compound or Fixed Pins.
  if (division === 'Target' && className.toLowerCase().includes('compound')) {
    return { key, confidence: 'assumed', note: 'EOS "Compound" assumed to be Freestyle Compound' }
  }
  return { key, confidence: 'exact' }
}

/** The award for a finishing position, if that place is paid in this class. */
export function getAward(key: string | null, place: number): Award | null {
  if (key === null) return null
  return TABLE[key]?.[String(place)] ?? null
}

/** Human-readable award summary, e.g. "$750 · Buckle · CCA Cooler · Trophy". */
export function describeAward(award: Award | null): string {
  if (award === null) return ''
  const parts: string[] = []
  if (award.cash !== undefined) parts.push(`$${award.cash.toLocaleString()}`)
  for (const value of [award.license, award.buckle, award.cooler, award.trophy]) {
    if (value !== undefined && value !== '') parts.push(value)
  }
  return parts.join(' · ')
}
