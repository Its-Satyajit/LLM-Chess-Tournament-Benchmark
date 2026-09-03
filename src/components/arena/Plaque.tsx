export interface PlaqueProps {
  glyph: string
  name: string
  clock?: number
  toMove: boolean
}

function formatClock(seconds: number | undefined): string {
  if (seconds === undefined) return '--:--'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s < 10 ? '0' : ''}${s}`
}

export default function Plaque({ glyph, name, clock, toMove }: PlaqueProps) {
  const low = toMove && clock !== undefined && clock <= 30
  const clockText = formatClock(clock)

  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-1.5 transition-all duration-200 ${
        toMove
          ? 'border-emerald-500/60 bg-[#142322] shadow-[0_0_15px_rgba(16,185,129,0.15)]'
          : 'border-[#242f42] bg-[#161d2a]'
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-sm ${
            glyph === '♙' ? 'bg-amber-100/10 text-amber-100' : 'bg-slate-800 text-slate-200'
          }`}
        >
          {glyph}
        </span>

        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className={`h-2 w-2 shrink-0 rounded-full transition-colors ${
              toMove ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
            }`}
            aria-hidden="true"
          />
          <span className="truncate text-xs font-semibold text-slate-200" title={name}>
            {name}
          </span>
        </div>
      </div>

      {clock !== undefined && (
        <div
          className={`flex items-baseline gap-1 rounded-md px-2 py-0.5 font-mono text-xs font-bold tabular-nums tracking-wider ${
            low
              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse'
              : toMove
                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                : 'bg-slate-900/60 text-slate-400 border border-slate-800'
          }`}
          aria-label={`${name} clock`}
        >
          <span>{clockText}</span>
          <span className="text-[10px] font-normal text-slate-500">{clock}s</span>
        </div>
      )}
    </div>
  )
}
