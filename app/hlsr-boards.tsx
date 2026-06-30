'use client'

import { useState } from 'react'
import { EventBoards } from '@/components/event/event-boards'
import type { HlsrSegment, HlsrSegmentKey } from '@/data/hlsr'

const TAB_ORDER: HlsrSegmentKey[] = ['target', '3d']

const SUBTITLE: Record<HlsrSegmentKey, (s: HlsrSegment) => string> = {
  target: (s) =>
    `${s.divisions.length} classes · ${s.archers} archers · qualification + single-elimination brackets`,
  '3d': (s) => `${s.divisions.length} classes · ${s.archers} archers · 3D qualification standings`,
}

export function HlsrBoards({ segments }: { segments: Record<HlsrSegmentKey, HlsrSegment> }) {
  const [active, setActive] = useState<HlsrSegmentKey>('target')
  const segment = segments[active]

  return (
    <>
      <div className="hlsr-tabs" role="tablist" aria-label="Competition">
        {TAB_ORDER.map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={active === key}
            className="hlsr-tab"
            onClick={() => setActive(key)}
          >
            {segments[key].label}
          </button>
        ))}
      </div>

      <p className="page-subtitle">{SUBTITLE[active](segment)}</p>

      {/* Remount on tab change so the division selector resets to the new segment. */}
      <EventBoards key={active} divisions={segment.divisions} />
    </>
  )
}
