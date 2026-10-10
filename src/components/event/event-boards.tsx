'use client'

import { useState } from 'react'
import type { EventDivision } from '@/data/events'
import { getPlacings } from '@/data/events'
import { DivisionBracket } from './division-bracket'
import { RoundsView } from './rounds-view'
import { ScorecardModal } from './scorecard-modal'
import type { SelectedArcher } from './scorecard-modal'

type ViewMode = 'bracket' | 'rounds' | 'qualification'

/** Medal styling for the top three; the rest render plain. */
const MEDAL_CLASS = ['is-gold', 'is-silver', 'is-bronze'] as const

function ordinal(place: number): string {
  const tens = place % 100
  if (tens >= 11 && tens <= 13) return `${place}th`
  const suffix = ['th', 'st', 'nd', 'rd'][place % 10] ?? 'th'
  return `${place}${suffix}`
}

function Placings({
  division,
  bracketOnly,
}: {
  division: EventDivision
  /** Drop places that fall back to qualification order — see EventBoards. */
  bracketOnly?: boolean
}) {
  const all = getPlacings(division)
  const placings = bracketOnly === true ? all.filter((p) => p.source === 'bracket') : all
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

function QualTable({
  division,
  onPick,
}: {
  division: EventDivision
  /** Absent when no scorecard can be fetched — rows then stay plain text. */
  onPick?: (archer: SelectedArcher) => void
}) {
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
          {division.qualification.map((r) => {
            // Only offer a scorecard where there is one to show: the archer
            // needs an EOS id, and needs to have actually shot.
            const pickable =
              onPick !== undefined && r.shooterId !== undefined && r.shooterId !== '' && r.score > 0
            return (
              <tr key={`${r.rank}-${r.name}`}>
                <td>
                  {r.rank <= 3 ? (
                    <span className={`rank-badge rank-${r.rank}`}>{r.rank}</span>
                  ) : (
                    <span className="rank-rest">{r.rank}</span>
                  )}
                </td>
                <td className="archer-name">
                  {pickable ? (
                    <button
                      type="button"
                      className="archer-link"
                      onClick={() => onPick({ shooterId: r.shooterId as string, name: r.name })}
                    >
                      {r.name}
                    </button>
                  ) : (
                    r.name
                  )}
                </td>
                <td className="cell-num mono">{r.avg}</td>
                <td className="cell-num">
                  <span className="score-total">{r.score}</span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export function EventBoards({
  divisions,
  hideQualification,
  tournamentId,
}: {
  divisions: EventDivision[]
  /**
   * Suppress every view of qualification scores. HLSR asked that 3D
   * qualification not be published — only the Sunday brackets. The scores are
   * already withheld from the synced data; this keeps the UI from offering a
   * qualification tab or leaking the order through fallback placings.
   */
  hideQualification?: boolean
  /** EOS tournament id. Without it, no scorecard can be fetched. */
  tournamentId?: string | null
}) {
  const [activeName, setActiveName] = useState(divisions[0]?.name ?? '')
  const active = divisions.find((d) => d.name === activeName) ?? divisions[0]
  const [view, setView] = useState<ViewMode>('bracket')
  const [picked, setPicked] = useState<SelectedArcher | null>(null)

  if (active === undefined) {
    return <p className="muted">No results recorded for this event.</p>
  }

  const hasBracket = active.bracket !== null && active.bracket.rounds.length > 0
  const hideQuals = hideQualification === true
  const showBracket = (view === 'bracket' || hideQuals) && hasBracket
  const modes: ViewMode[] = hideQuals ? ['bracket', 'rounds'] : ['bracket', 'rounds', 'qualification']
  // Scorecards need an EOS id to query, and are never offered where the whole
  // qualification round is withheld.
  const canScorecard =
    !hideQuals && typeof tournamentId === 'string' && tournamentId !== ''

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
            {modes.map((mode) => (
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

      <Placings division={active} bracketOnly={hideQuals} />

      {showBracket && <DivisionBracket division={active} />}
      {view === 'rounds' && hasBracket && !showBracket && <RoundsView division={active} />}
      {!hasBracket && hideQuals && (
        <p className="segment-pending">
          Qualification scores for this competition are not published. Results appear here once
          bracket shooting begins.
        </p>
      )}
      {!hideQuals && (view === 'qualification' || !hasBracket) && (
        <QualTable
          division={active}
          {...(canScorecard ? { onPick: setPicked } : {})}
        />
      )}

      {canScorecard && picked !== null && (
        <ScorecardModal
          tournamentId={tournamentId as string}
          selected={picked}
          onClose={() => setPicked(null)}
        />
      )}
    </section>
  )
}
