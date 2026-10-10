'use client'

import { useEffect, useState } from 'react'
import { EosUnavailableError, fetchShooterEnds } from '@/lib/eos'
import type { ShooterDetail } from '@/lib/eos'

export interface SelectedArcher {
  shooterId: string
  name: string
}

/** Widest end on the card — archers can shoot 3- or 6-arrow ends. */
function maxArrows(ends: ShooterDetail['ends']): number {
  return ends.reduce((n, e) => Math.max(n, e.arrows.length), 0)
}

/**
 * An archer's end-by-end scorecard, fetched when their row is tapped.
 *
 * The rest of this site is a static export; this is the one thing it asks EOS
 * for at runtime, and only on demand.
 */
export function ScorecardModal({
  tournamentId,
  selected,
  onClose,
}: {
  tournamentId: string
  selected: SelectedArcher
  onClose: () => void
}) {
  const [detail, setDetail] = useState<ShooterDetail | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    let cancelled = false
    setDetail(null)
    setError(null)
    fetchShooterEnds(tournamentId, selected.shooterId)
      .then((d) => {
        if (!cancelled) setDetail(d)
      })
      .catch((e) => {
        if (cancelled) return
        // Only EOS's own wording is fit for the screen; anything else is our bug.
        setError(
          e instanceof EosUnavailableError ? e.message : 'Could not load this scorecard.',
        )
        if (!(e instanceof EosUnavailableError)) console.error('[scorecard]', e)
      })
    return () => {
      cancelled = true
    }
  }, [tournamentId, selected.shooterId])

  const arrows = detail ? maxArrows(detail.ends) : 0

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-label={`Scorecard for ${selected.name}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
          ×
        </button>
        <span className="eyebrow">Scorecard</span>
        <h2 className="modal-name">{detail?.name !== '' ? detail?.name ?? selected.name : selected.name}</h2>
        {detail !== null && (
          <p className="modal-meta mono">
            {detail.target !== '' ? `Target ${detail.target} · ` : ''}Total {detail.total}
            {detail.avg !== '' ? ` · Avg ${detail.avg}` : ''}
          </p>
        )}

        {error !== null && <p className="muted">{error}</p>}
        {error === null && detail === null && <p className="muted">Loading scorecard…</p>}
        {detail !== null && detail.ends.length === 0 && (
          <p className="muted">No ends scored yet.</p>
        )}

        {detail !== null && detail.ends.length > 0 && (
          <div className="table-wrap">
            <table className="scorecard">
              <thead>
                <tr>
                  <th className="sc-end">End</th>
                  {Array.from({ length: arrows }, (_, i) => (
                    <th key={i} className="sc-arrow">
                      {i + 1}
                    </th>
                  ))}
                  <th className="sc-num">Score</th>
                  <th className="sc-num">Total</th>
                </tr>
              </thead>
              <tbody>
                {detail.ends.map((e, idx) => (
                  <tr key={e.label}>
                    <td className="sc-end">{idx + 1}</td>
                    {Array.from({ length: arrows }, (_, i) => (
                      <td key={i} className="sc-arrow mono">
                        {e.arrows[i] ?? ''}
                      </td>
                    ))}
                    {/* arrows are strings so "X" and "M" print as shot */}
                    <td className="sc-num mono">{e.score}</td>
                    <td className="sc-num">
                      <span className="score-total">{e.running}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
