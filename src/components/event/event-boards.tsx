'use client'

import { useState } from 'react'
import type { EventDivision } from '@/data/events'
import { finalDecided, getPlacings } from '@/data/events'
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

/**
 * Whether this division has finished shooting.
 *
 * Qualification order means nothing until everyone has shot the same number of
 * arrows. Mid-round it ranks a 20/60 score against a 60/60 one and calls the
 * result a placing — during this event it publicly listed an archer averaging
 * 9.10 as "3rd" off 20 arrows, and one who had not drawn a bow as "5th".
 *
 * A bracket is its own answer, but only once its medal matches are shot —
 * before that, every archer still in it could finish 1st. And where no row
 * carries arrow data at all — older synced events — there is nothing to judge,
 * so the placings stand.
 */
function divisionComplete(division: EventDivision): boolean {
  if (division.bracket !== null && division.bracket.rounds.length > 0) return finalDecided(division)
  const measurable = division.qualification.filter(
    (r) => r.arrowsTotal !== undefined && r.arrowsTotal > 0,
  )
  if (measurable.length === 0) return true
  return measurable.every((r) => (r.arrows ?? 0) >= (r.arrowsTotal as number))
}

function Placings({
  division,
  bracketOnly,
}: {
  division: EventDivision
  /** Drop places that fall back to qualification order — see EventBoards. */
  bracketOnly?: boolean
}) {
  if (!divisionComplete(division)) return null
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

/**
 * Arrows shot out of arrows in the round — "15/60".
 *
 * The part-shot archers are the ones worth marking: their score is low because
 * they are a round behind, not because they are losing. A finished card is the
 * quiet state; an in-progress one is called out.
 */
function ArrowCount({ shot, total }: { shot?: number; total?: number }) {
  if (total === undefined || total <= 0) return <span className="muted">—</span>
  const n = shot ?? 0
  // Three states, not two. An archer on 0 has not started — saying "still
  // shooting" of them is wrong, and highlighting them would drown out the
  // genuinely part-shot archers, who are the ones whose score misleads.
  const state = n >= total ? 'done' : n === 0 ? 'waiting' : 'shooting'
  const label =
    state === 'done' ? 'round complete' : state === 'waiting' ? 'not started' : 'still shooting'
  return (
    <span
      className={`arrow-count is-${state}`}
      title={state === 'done' ? 'Round complete' : `${total - n} arrows remaining`}
    >
      {n}/{total}
      {state === 'done' && <span className="arrow-done-tick" aria-hidden="true"> ✓</span>}
      <span className="sr-only"> {label}</span>
    </span>
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
            <th className="cell-num">Arrows</th>
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
                <td className="cell-num">
                  <ArrowCount shot={r.arrows} total={r.arrowsTotal} />
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
