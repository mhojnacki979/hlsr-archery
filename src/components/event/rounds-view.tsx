import type { BracketMatch, BracketShooter, EventDivision } from '@/data/events'

/**
 * Round-by-round head-to-head view. Each elimination round is its own section
 * listing every match as a face-off (seed · name · score on each side), winner
 * highlighted. Complements the bracket tree with an explicit per-round layout.
 */

function Side({ shooter, align }: { shooter: BracketShooter | null; align: 'left' | 'right' }) {
  if (shooter === null) {
    return <div className={`vs-side vs-${align} is-bye`}>Bye</div>
  }
  return (
    <div className={`vs-side vs-${align}${shooter.winner ? ' is-winner' : ''}`}>
      <span className="vs-seed">{shooter.seed}</span>
      <span className="vs-name">{shooter.name}</span>
      <span className="vs-score">{shooter.score}</span>
    </div>
  )
}

function Faceoff({ match, caption }: { match: BracketMatch; caption?: string }) {
  return (
    <div className="vs-wrap">
      {caption !== undefined && <span className="vs-caption">{caption}</span>}
      <div className="vs-match">
        <Side shooter={match.a} align="left" />
        <span className="vs-divider">vs</span>
        <Side shooter={match.b} align="right" />
      </div>
    </div>
  )
}

/** In the final round, label the gold and bronze (3rd-place) games. */
const FINAL_CAPTIONS = ['Championship', '3rd Place Match'] as const

export function RoundsView({ division }: { division: EventDivision }) {
  const rounds = division.bracket?.rounds ?? []
  if (rounds.length === 0) {
    return <p className="muted">No rounds recorded for this division.</p>
  }
  const lastIndex = rounds.length - 1

  return (
    <div className="rounds-view">
      {rounds.map((round, i) => {
        const isFinal = i === lastIndex
        const note = i === lastIndex - 1 ? 'winners → Championship · losers → 3rd Place Match' : null
        return (
          <section className="round-block" key={`${round.name}-${i}`}>
            <h3 className="round-block-title">
              {round.name}
              <span className="round-block-count">
                {round.matches.length} {round.matches.length === 1 ? 'match' : 'matches'}
              </span>
            </h3>
            {note !== null && <p className="round-block-note">{note}</p>}
            <div className="round-block-matches">
              {round.matches.map((m, j) => (
                <Faceoff
                  match={m}
                  caption={isFinal ? FINAL_CAPTIONS[j] : undefined}
                  key={`${m.a.name}-${m.b?.name ?? 'bye'}-${j}`}
                />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
