import type { WsEvent } from '../../hooks/useArenaMatch'

export interface WsEventsCardProps {
  events: WsEvent[]
}

export default function WsEventsCard({ events }: WsEventsCardProps) {
  if (events.length === 0) return null

  return (
    <div className="rounded-xl border border-[#242f42] bg-[#161d2a] p-3 shadow-md">
      <div className="mb-2 flex items-center justify-between border-b border-[#242f42] pb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 live-indicator" />
          Live WebSocket Ticker
        </span>
        <span className="font-mono text-[10px] text-slate-500">{events.length} events</span>
      </div>

      <div className="max-h-32 space-y-1 overflow-y-auto pr-1 font-mono text-[11px]">
        {events.slice(-10).map((ev) => (
          <div
            key={ev.id}
            className="flex items-baseline gap-1.5 rounded bg-[#0f141d] px-2 py-0.5 text-slate-300"
          >
            <span
              className={`rounded px-1 text-[9px] font-bold uppercase ${
                ev.type === 'move'
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : ev.type === 'game_over'
                    ? 'bg-rose-500/20 text-rose-300'
                    : ev.type === 'message'
                      ? 'bg-sky-500/20 text-sky-300'
                      : 'bg-slate-800 text-slate-400'
              }`}
            >
              {ev.type}
            </span>
            {ev.move && <span className="font-bold text-white">{ev.move}</span>}
            {ev.content && <span className="italic text-slate-400">&quot;{ev.content}&quot;</span>}
            {ev.result && <span className="text-amber-300 font-bold">[{ev.result}]</span>}
          </div>
        ))}
      </div>
    </div>
  )
}
