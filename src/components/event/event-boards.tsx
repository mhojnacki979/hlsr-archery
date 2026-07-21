'use client'

import { useState } from 'react'
import type { EventDivision } from '@/data/events'
import { getPlacings } from '@/data/events'
import { DivisionBracket } from './division-bracket'
import { RoundsView } from './rounds-view'

type ViewMode = 'bracket' | 'rounds' | 'qualification'

/** Medal styling for the top three; the rest render plain. */
const MEDAL_CLASS = ['is-gold', 'is-silver', 'is-bronze'] as const

function ordinal(place: number): string {
  const tens = place % 100
  if (tens >= 11 && tens <= 13) return `${place}th`
  const suffix = ['th', 'st', 'nd', 'rd'][place % 10] ?? 'th'
  return `${place}${suffix}`
}

function Placings({ division }: { division: EventDivision }) {
  const placings = getPlacings(division)
  if (placings.length === 0) return null
  return (
    <div className="podium" aria-label={`${division.name} final placings`}>
      <span className="podium-eyebrow">{division.name} · Final Placings</span>
      <ol className="placing-list">
        {placings.map((p) => (
          <li className={`placing-row ${MEDAL_CLASS[p.place - 1] ?? ''}`} key={p.name}>
            <span className="placing-place">{ordinal(p.place)}</span>
            <span className="placing-name">{p.name}</span>
            <span className="placing-score">
              {p.score}
              {p.source === 'qualification' && <span className="placing-tag">qual</span>}
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}

function QualTable({ division }: { division: EventDivision }) {
  return (
    <div className="table-wrap">
      <table className="board-table">
        <thead>
          <tr>
            <th>Seed</th>
            <th>Archer</th>
            <th className="cell-num">Arrow Avg</th>
            <th className="cell-num">Score</th>
          </tr>
        </thead>
        <tbody>
          {division.qualification.map((r) => (
            <tr key={`${r.rank}-${r.name}`}>
              <td>
                {r.rank <= 3 ? (
                  <span className={`rank-badge rank-${r.rank}`}>{r.rank}</span>
                ) : (
                  <span className="rank-rest">{r.rank}</span>
                )}
              </td>
              <td className="archer-name">{r.name}</td>
              <td className="cell-num mono">{r.avg}</td>
              <td className="cell-num">
                <span className="score-total">{r.score}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function EventBoards({ divisions }: { divisions: EventDivision[] }) {
  const [activeName, setActiveName] = useState(divisions[0]?.name ?? '')
  const active = divisions.find((d) => d.name === activeName) ?? divisions[0]
  const [view, setView] = useState<ViewMode>('bracket')

  if (active === undefined) {
    return <p className="muted">No results recorded for this event.</p>
  }

  const hasBracket = active.bracket !== null && active.bracket.rounds.length > 0
  const showBracket = view === 'bracket' && hasBracket

  return (
    <section aria-label="Event results">
      <div className="event-controls">
        <label className="segment-picker">
          <span className="segment-picker-label">Division</span>
          <select
            className="segment-select"
            value={active.name}
            onChange={(e) => setActiveName(e.target.value)}
            aria-label="Choose a division"
          >
            {divisions.map((d) => (
              <option key={d.name} value={d.name}>
                {d.name}
              </option>
            ))}
          </select>
        </label>

        {hasBracket && (
          <div className="view-toggle" role="tablist" aria-label="View">
            {(['bracket', 'rounds', 'qualification'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                role="tab"
                aria-selected={view === mode}
                className="view-toggle-btn"
                onClick={() => setView(mode)}
              >
                {mode}
              </button>
            ))}
          </div>
        )}
      </div>

      <Placings division={active} />

      {showBracket && <DivisionBracket division={active} />}
      {view === 'rounds' && hasBracket && <RoundsView division={active} />}
      {(view === 'qualification' || !hasBracket) && <QualTable division={active} />}
    </section>
  )
}
