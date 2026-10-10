/**
 * Client-side Eyes on Score access, used for one thing only: pulling an
 * archer's end-by-end scorecard when a visitor taps their name.
 *
 * Everything else on this site is baked in at build time by
 * scripts/sync-hlsr.ts. A scorecard is the exception because it is per-archer
 * detail nobody looks at until they ask — baking ~250 of them into the bundle
 * would be wasteful, and this costs one request per tap.
 *
 * The token is EOS's public read-only scoreboard token — the same one their
 * own public scoreboard ships in client code — so embedding it here is
 * expected. CORS is open on the EOS API.
 */
const API = 'https://api.eyesonscore.com/api'
const TOKEN = 'Bearer 08a42685c4d02c948fd16848e38e194bab23d2ba90d390e14b772122f631c3b0b18f8cc3170040fa'

/**
 * A failure fit to show a spectator.
 *
 * EOS does not always answer with JSON — when rate-limiting or unwell it
 * returns an HTML error page, and `res.json()` then throws a raw
 * `Unexpected token '<'`. That must never reach the screen.
 */
export class EosUnavailableError extends Error {
  constructor(message: string, detail?: unknown) {
    super(message)
    this.name = 'EosUnavailableError'
    if (detail !== undefined) console.error('[eos]', detail)
  }
}

/** EOS's shooter-detail endpoint expects a form-encoded body. */
async function postForm(path: string, body: Record<string, string>): Promise<any> {
  let res: Response
  try {
    res = await fetch(`${API}/${path}`, {
      method: 'POST',
      headers: { Authorization: TOKEN, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(body).toString(),
    })
  } catch (e) {
    throw new EosUnavailableError('Cannot reach Eyes on Score.', e)
  }

  // Read as text first: a non-JSON body is the common failure, not the rare one.
  const raw = await res.text()
  let json: any
  try {
    json = JSON.parse(raw)
  } catch {
    throw new EosUnavailableError(
      res.status === 429
        ? 'Eyes on Score is busy. Try again in a moment.'
        : 'Eyes on Score is not responding. Try again in a moment.',
      `${path} -> HTTP ${res.status}, non-JSON body: ${raw.slice(0, 120)}`,
    )
  }
  if (json.status_code !== 200) {
    throw new EosUnavailableError(
      'That scorecard is not available.',
      `${path} -> ${json.message ?? `status_code ${json.status_code}`}`,
    )
  }
  return json.data
}

function toInt(v: unknown): number {
  const n = Number(v)
  return Number.isFinite(n) ? Math.trunc(n) : 0
}

export interface EndScore {
  label: string
  /**
   * Arrow values as shot, kept as written rather than as numbers: EOS records
   * "X" for a centre ten and "M" for a miss, and an archer reads those marks,
   * not a 10 and a 0. Coercing them to numbers silently rendered every X as 0.
   */
  arrows: string[]
  /** Points scored this end. */
  score: number
  /** Cumulative total through this end, across every round. */
  running: number
}

export interface ShooterDetail {
  name: string
  total: number
  avg: string
  target: string
  ends: EndScore[]
}

function arrowsOf(end: any): string[] {
  return Object.keys(end)
    .filter((k) => /^arrow\d+$/.test(k))
    .sort((a, b) => Number(a.slice(5)) - Number(b.slice(5)))
    .map((k) => String(end[k]?.score ?? '').trim())
}

/** One archer's end-by-end, arrow-by-arrow scorecard for one tournament. */
export async function fetchShooterEnds(
  tournamentId: string,
  shooterId: string,
): Promise<ShooterDetail> {
  const d = await postForm('shooter_details_by_score', {
    shooter_id: shooterId,
    tournament_id: tournamentId,
  })

  const ends: EndScore[] = []
  // A card can span several rounds, and EOS restarts `end_total` at each one —
  // reading it straight made the running total jump backwards mid-card. Keep
  // our own cumulative instead.
  let running = 0
  for (const slot of d.slot_list ?? []) {
    for (const round of slot.round_score_list ?? []) {
      Object.keys(round)
        .filter((k) => /^end\d+$/.test(k))
        .sort((a, b) => Number(a.slice(3)) - Number(b.slice(3)))
        .forEach((k) => {
          const end = round[k]
          if (end && typeof end === 'object') {
            const score = toInt(end.per_end_total)
            running += score
            ends.push({
              label: `End ${ends.length + 1}`,
              arrows: arrowsOf(end),
              score,
              running,
            })
          }
        })
    }
  }

  return {
    name: String(d.shooter_name ?? '').trim(),
    total: toInt(d.total_score),
    avg: String(d.avg_count ?? ''),
    target: String(d.target_name_position ?? ''),
    ends,
  }
}
