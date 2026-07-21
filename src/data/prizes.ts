/**
 * HLSR prize schedule, and the bridge between Eyes on Score class names and the
 * committee's prize taxonomy.
 *
 * Prizes are keyed "Division|Age|GenderScope|Bow" and awarded by finishing
 * position. They are not uniform — Senior classes add a lifetime license, Target
 * Senior Open Compound pays eight places while most Target classes pay four —
 * so every class carries its own rows. Generated from the committee workbook by
 * scripts/parse-prizes.py, which reads each block header as the class.
 */
import prizes2025 from './hlsr/prizes-2025.json'

export interface Award {
  cash?: number
  license?: string
  buckle?: string
  cooler?: string
  trophy?: string
}

type PrizeTable = Record<string, Record<string, Award>>

const TABLE: PrizeTable = prizes2025 as PrizeTable

export type MatchConfidence = 'exact' | 'assumed' | 'unmatched'

export interface PrizeMatch {
  key: string | null
  confidence: MatchConfidence
  /** Why a match was assumed or refused — surfaced in the awards output. */
  note?: string
}

/** EOS 3D ages are Eagle/Youth/Young Adult; the prize sheet uses its own names. */
const AGE_ALIASES: Record<string, string> = {
  eagle: 'Junior',
  junior: 'Junior',
  youth: 'Intermediate',
  intermediate: 'Intermediate',
  'young adult': 'Senior',
  senior: 'Senior',
}

/**
 * EOS bow wording -> candidate prize bow classes, best first.
 *
 * Matched as a prefix, longest first, because several bow names are two words
 * ("Freestyle Compound", "Fixed Pins") and would otherwise be truncated. 3D
 * open classes are labelled plain "Recurve" for Junior but "Olympic Recurve"
 * further up, so multiple candidates are tried against the table.
 */
const BOW_PREFIXES: Record<string, Record<string, string[]>> = {
  '3D': {
    pins: ['Pins Compound'],
    open: ['Open Compound'],
    recurve: ['Recurve', 'Olympic Recurve'],
    barebow: ['Barebow Recurve', 'Barebow'],
  },
  Target: {
    'freestyle compound': ['Open Compound'],
    'fixed pins': ['Pins Compound'],
    nasp: ['NASP'],
    recurve: ['Recurve'],
    barebow: ['Barebow'],
    // Older events ran one merged "Compound" class; the sheet splits it.
    compound: ['Open Compound', 'Pins Compound'],
  },
}

interface ParsedClass {
  bowCandidates: string[]
  age: string
  gender: string
}

/**
 * Split an EOS class name into bow / age / gender.
 *
 * "Freestyle Compound Senior Male"    -> Open Compound, Senior, Male
 * "Fixed Pins Junior Female"          -> Pins Compound, Junior, Female
 * "Recurve Senior Open"               -> Recurve,       Senior, Open (mixed)
 * "Pins Eagle (Ages 9-11) Female"     -> Pins Compound, Eagle,  Female
 *
 * The bow is matched as a longest-first prefix rather than by taking the first
 * token, because "Open" is both a bow class and a mixed-gender scope and
 * several bow names are two words.
 */
function parseClassName(className: string, division: '3D' | 'Target'): ParsedClass | null {
  const cleaned = className
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()

  const prefixes = BOW_PREFIXES[division] ?? {}
  const prefix = Object.keys(prefixes)
    .sort((a, b) => b.length - a.length)
    .find((p) => cleaned.startsWith(`${p} `))
  if (prefix === undefined) return null

  const rest = cleaned.slice(prefix.length).trim().split(' ')
  if (rest.length < 2) return null
  const gender = rest[rest.length - 1] ?? ''
  const age = rest.slice(0, -1).join(' ')
  if (gender === '' || age === '') return null

  return { bowCandidates: prefixes[prefix] ?? [], age, gender }
}

function genderScope(gender: string): string | null {
  if (gender === 'female') return 'Female'
  if (gender === 'male') return 'Male'
  if (gender === 'open' || gender === 'mixed') return 'Open'
  return null
}

/**
 * Map an EOS class name onto a prize class key, trying each candidate bow class
 * against the table. Returns `unmatched` rather than guessing when the two
 * taxonomies genuinely disagree.
 */
export function resolvePrizeKey(className: string, division: '3D' | 'Target'): PrizeMatch {
  const parsed = parseClassName(className, division)
  if (parsed === null) return { key: null, confidence: 'unmatched', note: 'unrecognised class name' }

  const age = AGE_ALIASES[parsed.age]
  const scope = genderScope(parsed.gender)
  const candidates = parsed.bowCandidates

  if (age === undefined || scope === null || candidates.length === 0) {
    return { key: null, confidence: 'unmatched', note: 'no matching age, gender, or bow class' }
  }

  const matches = candidates
    .map((bow) => `${division}|${age}|${scope}|${bow}`)
    .filter((key) => TABLE[key] !== undefined)

  const key = matches[0]
  if (key === undefined) {
    return { key: null, confidence: 'unmatched', note: 'no prize rows for this class' }
  }
  if (matches.length > 1) {
    return {
      key,
      confidence: 'assumed',
      note: `bow could be ${candidates.join(' or ')}; using ${key.split('|')[3]}`,
    }
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
