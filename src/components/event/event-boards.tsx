'use client'

import { useState } from 'react'
import type { EventDivision } from '@/data/events'
import { getPodium } from '@/data/events'
import { DivisionBracket } from './division-bracket'
import { RoundsView } from './rounds-view'

type ViewMode = 'bracket' | 'rounds' | 'qualification'

const PLACES = [
  { key: 'first', label: '1st', cls: 'is-gold' },
  { key: 'second', label: '2nd', cls: 'is-silver' },
  { key: 'third', label: '3rd', cls: 'is-bronze' },
] as const

function Podium({ division }: { division: EventDivision }) {
  const podium = getPodium(division)
  const places = PLACES.filter((p) => podium[p.key] !== null)
  if (places.length === 0) return null
  return (
    <div className="podium" aria-label={`${division.name} podium`}>
      <span className="podium-eyebrow">{division.name} · Final Placings</span>
      <div className="podium-rows">
        {places.map((p) => (
          <div className={`podium-row ${p.cls}`} key={p.key}>
            <span className="podium-place">{p.label}</span>
            <span className="podium-name">{podium[p.key]}</span>
          </div>
        ))}
      </div>
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

      <Podium division={active} />

      {showBracket && <DivisionBracket division={active} />}
      {view === 'rounds' && hasBracket && <RoundsView division={active} />}
      {(view === 'qualification' || !hasBracket) && <QualTable division={active} />}
    </section>
  )
}
