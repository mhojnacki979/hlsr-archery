/**
 * Houston Livestock Show & Rodeo archery results — a standalone event that
 * shares the Texas Ringer look and feel but nothing else. Two segments:
 *   target — qualification + single-elimination brackets
 *   3d     — qualification standings only (no brackets)
 *
 * Static data, synced from Eyes on Score by scripts/sync-hlsr.ts.
 */
import type { EventDivision } from './events'
import hlsr2025 from './hlsr/2025.json'

export interface HlsrSegment {
  label: string
  archers: number
  divisions: EventDivision[]
}

export type HlsrSegmentKey = 'target' | '3d'

export interface HlsrEvent {
  year: number
  name: string
  venue: string
  date: string
  segments: Record<HlsrSegmentKey, HlsrSegment>
}

const EVENTS: Record<number, HlsrEvent> = {
  2025: hlsr2025 as HlsrEvent,
}

export function getHlsr(year: number): HlsrEvent | null {
  return EVENTS[year] ?? null
}
