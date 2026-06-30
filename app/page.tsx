import { notFound } from 'next/navigation'
import { getHlsr } from '@/data/hlsr'
import { HlsrBoards } from './hlsr-boards'

export default function HomePage() {
  const event = getHlsr(2025)
  if (event === null) notFound()

  return (
    <>
      <span className="eyebrow">
        {event.venue} · {event.date}
      </span>
      <h1 className="page-title">{event.name}</h1>
      <HlsrBoards segments={event.segments} />
    </>
  )
}
