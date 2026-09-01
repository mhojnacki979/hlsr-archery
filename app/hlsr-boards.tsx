'use client'

import { useState } from 'react'
import { EventBoards } from '@/components/event/event-boards'
import type { HlsrEvent, HlsrSegment, HlsrSegmentKey } from '@/data/hlsr'
import { orderedSegments } from '@/data/hlsr'

const SUBTITLE: Record<HlsrSegmentKey, (s: HlsrSegment) => string> = {
  nasp: (s) =>
    `${s.divisions.length} classes · ${s.archers} archers · NASP format, scored as its own competition`,
  target: (s) =>
    `${s.divisions.length} classes · ${s.archers} archers · qualification + single-elimination brackets`,
  '3d': (s) => `${s.divisions.length} classes · ${s.archers} archers · brackets only — qualification not published`,
}

export function HlsrBoards({ event }: { event: HlsrEvent }) {
  const tabs = orderedSegments(event)
  // Open on the first segment that actually has entries, so an event mid-setup
  // does not land the visitor on an empty tab.
  const firstWithData = tabs.find((t) => t.segment.archers > 0) ?? tabs[0]
  const [active, setActive] = useState<HlsrSegmentKey | undefined>(firstWithData?.key)

  if (tabs.length === 0) return <p className="muted">No competitions recorded for this event.</p>

  const current = tabs.find((t) => t.key === active) ?? tabs[0]
  if (current === undefined) return null

  return (
    <>
      {tabs.length > 1 && (
        <div className="hlsr-tabs" role="tablist" aria-label="Competition">
          {tabs.map(({ key, segment }) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={current.key === key}
              className="hlsr-tab"
              onClick={() => setActive(key)}
            >
              {segment.label}
            </button>
          ))}
        </div>
      )}

      <p className="page-subtitle">{SUBTITLE[current.key](current.segment)}</p>

      {current.segment.divisions.length === 0 ? (
        <p className="segment-pending">
          Scores for the {current.segment.label} competition will appear here once it is under way.
        </p>
      ) : (
        // Remount on tab change so the division selector resets to the new segment.
        <EventBoards
          key={current.key}
          divisions={current.segment.divisions}
          hideQualification={current.key === '3d'}
        />
      )}
    </>
  )
}
