import type { WsEvent } from '../../hooks/useArenaMatch'

export interface WsEventsCardProps {
  events: WsEvent[]
}

export default function WsEventsCard({ events }: WsEventsCardProps) {
  if (events.length === 0) return null

  return (
    <article className="card">
      <header><strong>Live Events ({events.length})</strong></header>
      <div className="scroll-y" style={{ maxHeight: '8rem' }}>
        {events.slice(-10).map((ev) => (
          <div key={ev.id}>
            <code>{ev.type}</code>{' '}
            {ev.move && <code>{ev.move}</code>}{' '}
            {ev.content && <em>"{ev.content}"</em>}{' '}
            {ev.result && <del>{ev.result}</del>}
          </div>
        ))}
      </div>
    </article>
  )
}
