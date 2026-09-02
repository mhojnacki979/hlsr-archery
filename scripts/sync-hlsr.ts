/**
 * Pull the Houston Livestock Show & Rodeo archery results from Eyes on Score
 * into the static JSON the HLSR page reads (src/data/hlsr/<year>.json).
 *
 *   pnpm sync:hlsr
 *
 * HLSR is two EOS tournaments: a Target competition (qualification + single-
 * elimination brackets) and a 3D competition (qualification only, no brackets).
 * They become the two segments — "Target" and "3D" — of one HLSR event.
 *
 * Mirrors scripts/sync-events.ts. Falls back to EOS's public read-only
 * scoreboard token (the same one shipped in src/lib/eos.ts) when EOS_API_TOKEN
 * is not set, so it runs without a .env.
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'

const TOKEN =
  process.env.EOS_API_TOKEN && process.env.EOS_API_TOKEN !== ''
    ? process.env.EOS_API_TOKEN
    : '08a42685c4d02c948fd16848e38e194bab23d2ba90d390e14b772122f631c3b0b18f8cc3170040fa'

const API = 'https://api.eyesonscore.com/api'
const HEADERS = { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' }

// EOS names these by the rodeo season, so the 2026 event was shot in October
// 2025 and the 2027 event is shot October 9-11, 2026.
//
// NASP became a STANDALONE competition for 2027 (Friday only, NASP format and
// rules, its own team trophies) and is no longer a division inside Target. Its
// EOS tournament does not exist yet — leave `id` null and the segment is written
// out empty, so the site can show the tab without inventing results.
interface SegmentConfig {
  key: string
  label: string
  id: string | null
  /**
   * Whether this segment's qualification scores may be published.
   *
   * HLSR asked that 3D qualification NOT be made public — only the Sunday
   * brackets. Scores are dropped here, at sync time, so they never reach the
   * static bundle. Hiding them in the UI alone would still ship them in the page
   * payload for anyone reading the network tab. The gated awards site keeps its
   * own full copy for scoring.
   */
  publishQualification?: boolean
}

interface EventConfig {
  year: number
  name: string
  venue: string
  /**
   * Published competition dates. EOS derives a date from shooters' session
   * strings, which does not exist until entries are loaded — so an upcoming
   * event needs its dates stated here.
   */
  dates?: string
  segments: SegmentConfig[]
}

const EVENTS: EventConfig[] = [
  {
    year: 2027,
    name: '2027 Houston Livestock Show and Rodeo Archery Competition',
    venue: 'Reliant Center, Hall A',
    dates: 'October 9-11, 2026',
    segments: [
      { key: 'nasp', label: 'NASP', id: null },
      { key: 'target', label: 'Target', id: 'MWNOdFN5WnJ4VFZmQThEUk9jNUVadz09' },
      {
        key: '3d',
        label: '3D',
        id: 'UWcxL0RMaWx4RllZczhQU09yeVlTZz09',
        publishQualification: false,
      },
    ],
  },
  {
    year: 2026,
    name: '2026 Houston Livestock Show and Rodeo Archery Competition',
    venue: 'Houston Livestock Show & Rodeo',
    segments: [
      { key: 'target', label: 'Target', id: 'dnlSWGkxeXhiTXNZSHk4RFpZVVBVZz09' },
      {
        key: '3d',
        label: '3D',
        id: 'US9oSlFJNmU5QkU0M0VxMy8wQVdqdz09',
        publishQualification: false,
      },
    ],
  },
]

async function post(url: string): Promise<any> {
  const res = await fetch(url, { method: 'POST', headers: HEADERS })
  const json = await res.json()
  if (json.status_code !== 200) throw new Error(`${url.slice(0, 90)} -> ${json.message ?? res.status}`)
  return json.data
}

function toInt(v: unknown): number {
  const n = Number(v)
  return Number.isFinite(n) ? Math.trunc(n) : 0
}

function won(s: any): boolean {
  return String(s?.winner ?? '') === '1'
}

function shooterCard(s: any) {
  return {
    name: String(s?.name ?? '').trim(),
    seed: toInt(s?.rank),
    score: toInt(s?.score),
    winner: won(s),
  }
}

/** Chunk a round's bracket-ordered shooter list into head-to-head matches. */
function toMatches(shooters: any[]) {
  const matches: { a: ReturnType<typeof shooterCard>; b: ReturnType<typeof shooterCard> | null }[] = []
  for (let i = 0; i < shooters.length; i += 2) {
    matches.push({
      a: shooterCard(shooters[i]),
      b: shooters[i + 1] ? shooterCard(shooters[i + 1]) : null,
    })
  }
  return matches
}

function sessionDate(rows: any[]): string {
  for (const r of rows) {
    const m = /(\d{2})-(\d{2})-(\d{4})/.exec(String(r.session ?? ''))
    if (m) return `${m[3]}-${m[1]}-${m[2]}`
  }
  return ''
}

async function syncSegment(id: string) {
  const qual = await post(`${API}/tournament_score_list?is_private=false&id=${id}&for_fav=true`)
  const qualSorting = qual.sortingResult ?? {}

  const divisions: any[] = []
  let archers = 0
  let date = ''

  for (const group of Object.keys(qualSorting)) {
    // The group object mixes shooter rows with metadata keys — keep only shooters.
    const rows = (Object.values(qualSorting[group] ?? {}) as any[]).filter(
      (v) => typeof v === 'object' && v !== null && 'name' in v,
    )
    if (rows.length === 0) continue
    archers += rows.length
    if (date === '') date = sessionDate(rows)

    const qualification = rows.map((r) => ({
      rank: toInt(r.rank),
      name: String(r.name ?? '').trim(),
      avg: String(r.avg_count ?? ''),
      score: toInt(r.total_score),
    }))

    const shooterId = String(rows[0].shooter_id ?? '')
    let bracket: { rounds: { name: string; matches: any[] }[] } | null = null
    let champion: string | null = null

    if (shooterId !== '') {
      const layout = await post(
        `${API}/tournament_group_bracket_layout?id=${id}&shooter_id=${encodeURIComponent(shooterId)}`,
      ).catch(() => null)
      const result = layout?.result
      if (result && Object.keys(result).length > 0) {
        const rounds = Object.entries(result)
          .map(([name, shooters]) => ({ name, matches: toMatches(shooters as any[]) }))
          .filter((r) => r.matches.length > 0)
        if (rounds.length > 0) {
          bracket = { rounds }
          const finalRound = rounds[rounds.length - 1]
          const goldMatch = finalRound?.matches[0]
          champion = goldMatch?.a.winner
            ? goldMatch.a.name
            : goldMatch?.b?.winner
              ? goldMatch.b.name
              : null
        }
      }
    }

    // No bracket (qual-only division, e.g. 3D): champion is the top qualifier.
    if (champion === null && bracket === null) {
      champion = qualification.find((q) => q.rank === 1)?.name ?? null
    }

    divisions.push({ name: group, champion, qualification, bracket })
  }

  return { divisions, archers, date }
}

/**
 * Sync one event. Segments whose tournament does not exist yet (id null) are
 * written out empty so the site can render the tab with a "not yet" state
 * rather than omitting it.
 */
async function syncEvent(event: EventConfig): Promise<void> {
  const segments: Record<string, unknown> = {}
  let date = ''
  for (const seg of event.segments) {
    if (seg.id === null) {
      segments[seg.key] = { label: seg.label, archers: 0, divisions: [] }
      console.log(`${seg.label}: not yet created in EOS — written empty`)
      continue
    }
    const { divisions, archers, date: segDate } = await syncSegment(seg.id)
    if (date === '' && segDate !== '') date = segDate
    // Withhold qualification scores where the committee asked us not to publish
    // them. The archer count is kept — it drives the 24+ finalists rule.
    // Also clear the champion where it was only inferred from the top
    // qualifier (no bracket) — publishing that would disclose the very
    // standings we are withholding. A champion won in a bracket is kept.
    const published =
      seg.publishQualification === false
        ? divisions.map((d) => ({
            ...d,
            qualification: [],
            champion: d.bracket === null ? null : d.champion,
          }))
        : divisions
    segments[seg.key] = { label: seg.label, archers, divisions: published }
    console.log(
      `${seg.label}: ${divisions.length} classes, ${archers} archers, ` +
        `${divisions.filter((d) => d.bracket).length} with brackets`,
    )
  }

  const out = {
    year: event.year,
    name: event.name,
    venue: event.venue,
    date: event.dates ?? date ?? String(event.year),
    segments,
  }
  const dir = path.join(process.cwd(), 'src', 'data', 'hlsr')
  mkdirSync(dir, { recursive: true })
  const file = path.join(dir, `${event.year}.json`)
  writeFileSync(file, JSON.stringify(out, null, 1))
  console.log(`-> ${path.relative(process.cwd(), file)}\n`)
}

async function main(): Promise<void> {
  const wanted = process.argv[2]
  const events = wanted === undefined ? EVENTS : EVENTS.filter((e) => String(e.year) === wanted)
  if (events.length === 0) {
    console.error(`no event configured for ${wanted}`)
    process.exit(1)
  }
  for (const event of events) {
    console.log(`=== ${event.year} ===`)
    await syncEvent(event)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
