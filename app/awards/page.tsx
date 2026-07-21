import type { Metadata } from 'next'
import { buildAwards } from '@/data/awards'
import { getHlsr } from '@/data/hlsr'
import { asset } from '@/lib/asset'
import { PrintButton } from './print-button'

export const metadata: Metadata = {
  title: 'Awards & Prizes — HLSR Archery Competition',
  robots: { index: false, follow: false },
}

export default function AwardsPage() {
  const event = getHlsr(2026)
  const segments = buildAwards(2026)
  const flagged = segments
    .flatMap((s) => s.classes)
    .filter((c) => c.confidence !== 'exact')

  return (
    <div className="awards">
      <div className="awards-toolbar">
        <PrintButton />
        <span className="awards-hint">
          Prints one class per block. Use your browser&rsquo;s &ldquo;Save as PDF&rdquo;.
        </span>
      </div>

      <header className="awards-head">
        <img src={asset('/brand/hlsr-archery-badge.png')} alt="" className="awards-badge" />
        <div>
          <h1 className="awards-title">Houston Livestock Show &amp; Rodeo</h1>
          <p className="awards-sub">
            Archery Competition · Awards &amp; Prizes
            {event !== null && ` · ${event.date}`}
          </p>
        </div>
      </header>

      <section className="awards-notice">
        <strong>Before awarding:</strong> classes shot as a bracket are final —
        every bracketed placing was checked against the committee sheet and matched.
        Classes marked <em>provisional</em> have no bracket, so they are ordered by
        qualification score only; the committee settles those placings at the venue.
        {flagged.length > 0 && (
          <ul>
            {flagged.map((c) => (
              <li key={c.name}>
                <em>{c.name}</em> —{' '}
                {c.confidence === 'assumed' ? 'assumed prize match' : 'no prizes assigned'}
                {c.note !== undefined && `: ${c.note}`}
              </li>
            ))}
          </ul>
        )}
      </section>

      {segments.map((segment) => (
        <section key={segment.key}>
          <h2 className="awards-segment">{segment.label}</h2>
          {segment.classes.map((cls) => (
            <section className="awards-class" key={cls.name}>
              <h3 className="awards-class-name">
                {cls.name}
                {cls.confidence !== 'exact' && (
                  <span className="awards-flag">
                    {cls.confidence === 'assumed' ? 'assumed prize match' : 'no prize match'}
                  </span>
                )}
                {cls.provisional && (
                  <span className="awards-flag">provisional — qualification order</span>
                )}
              </h3>
              <table className="awards-table">
                <thead>
                  <tr>
                    <th className="awards-col-place">Place</th>
                    <th>Archer</th>
                    <th>Prize</th>
                  </tr>
                </thead>
                <tbody>
                  {cls.rows.map((row) => (
                    <tr key={`${row.place}-${row.name}`}>
                      <td className="awards-col-place">{row.place}</td>
                      <td className="awards-name">{row.name}</td>
                      <td className="awards-prize">{row.award || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ))}
        </section>
      ))}
    </div>
  )
}
