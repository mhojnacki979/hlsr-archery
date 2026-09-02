import { notFound } from 'next/navigation'
import { getHlsr } from '@/data/hlsr'
import { HlsrBoards } from './hlsr-boards'

const ACTIVE_YEAR = 2027

export default function HomePage() {
  // The event the site is fronting. Registration for 2027 is open, so the site
  // advertises it now; segments fill in as scores arrive.
  const event = getHlsr(ACTIVE_YEAR)
  if (event === null) notFound()

  return (
    <>
      <span className="eyebrow">
        {event.venue} · {event.date}
      </span>
      <h1 className="page-title">{event.name}</h1>
      <HlsrBoards event={event} />
    </>
  )
}
