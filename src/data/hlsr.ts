/**
 * Houston Livestock Show & Rodeo archery results.
 *
 * An event is split into segments, each its own EOS tournament:
 *   nasp   — standalone NASP competition (new for 2027, Friday only)
 *   target — qualification + single-elimination brackets
 *   3d     — 3D course
 *
 * NASP was a division inside Target through 2026; for 2027 HLSR made it a
 * separate competition with its own format, rules and team trophies. Segments
 * are therefore optional per event, and a segment whose tournament exists but
 * has no entries yet is carried as empty rather than dropped — registration
 * opens months before anyone shoots.
 *
 * Static data, synced from Eyes on Score by scripts/sync-hlsr.ts.
 */
import type { EventDivision } from './events'
import hlsr2026 from './hlsr/2026.json'
import hlsr2027 from './hlsr/2027.json'

export interface HlsrSegment {
  label: string
  archers: number
  divisions: EventDivision[]
}

export type HlsrSegmentKey = 'nasp' | 'target' | '3d'

/** Tab order on the site, independent of the order segments were synced. */
export const SEGMENT_ORDER: HlsrSegmentKey[] = ['nasp', 'target', '3d']

export interface HlsrEvent {
  year: number
  name: string
  venue: string
  date: string
  segments: Partial<Record<HlsrSegmentKey, HlsrSegment>>
}

const EVENTS: HlsrEvent[] = [hlsr2027 as HlsrEvent, hlsr2026 as HlsrEvent]

export function getHlsr(year: number): HlsrEvent | null {
  return EVENTS.find((e) => e.year === year) ?? null
}

export function listHlsrYears(): number[] {
  return EVENTS.map((e) => e.year)
}

function totalArchers(event: HlsrEvent): number {
  return Object.values(event.segments).reduce((sum, s) => sum + (s?.archers ?? 0), 0)
}

/**
 * The event the site should show: the newest one that actually has entries.
 * Keeps last year's results up while the next event is still only registration,
 * and switches over on its own once scores start arriving.
 */
export function getCurrentHlsr(): HlsrEvent | null {
  const withData = EVENTS.filter((e) => totalArchers(e) > 0)
  const pool = withData.length > 0 ? withData : EVENTS
  return pool.reduce<HlsrEvent | null>((best, e) => (best === null || e.year > best.year ? e : best), null)
}

/** Segments present on an event, in display order. */
export function orderedSegments(event: HlsrEvent): { key: HlsrSegmentKey; segment: HlsrSegment }[] {
  return SEGMENT_ORDER.flatMap((key) => {
    const segment = event.segments[key]
    return segment === undefined ? [] : [{ key, segment }]
  })
}
