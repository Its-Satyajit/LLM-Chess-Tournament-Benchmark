export interface MoveHistoryCardProps {
  legalMoves?: string[]
  moves: string[]
}

export default function MoveHistoryCard({
  legalMoves,
  moves,
}: MoveHistoryCardProps) {
  return (
    <div className="space-y-3">
      {/* Legal Moves Chip Area */}
      {legalMoves && legalMoves.length > 0 && (
        <div className="rounded-xl border border-[#242f42] bg-[#161d2a] p-3 shadow-md">
          <div className="mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
            <span>Legal Moves</span>
            <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300">
              {legalMoves.length}
            </span>
          </div>
          <div className="flex max-h-24 flex-wrap gap-1 overflow-y-auto pr-1">
            {legalMoves.map((move, i) => (
              <span
                key={`lm-${move}-${i}`}
                className="rounded border border-[#2e3c54] bg-[#111620] px-1.5 py-0.5 font-mono text-[11px] font-semibold text-slate-300"
              >
                {move}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Moves Scoresheet */}
      <div className="rounded-xl border border-[#242f42] bg-[#161d2a] p-3 shadow-md">
        <div className="mb-2 flex items-center justify-between border-b border-[#242f42] pb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
          <span>Move History</span>
          <span className="text-[11px] font-mono text-slate-400">{moves.length} plies</span>
        </div>

        {moves.length === 0 ? (
          <p className="py-4 text-center text-xs text-slate-500">No moves made yet.</p>
        ) : (
          <div className="grid max-h-48 grid-cols-2 gap-1 overflow-y-auto pr-1 font-mono text-xs">
            {moves.map((move, i) => {
              const moveNumber = Math.floor(i / 2) + 1
              const sideKey = i % 2 === 0 ? 'w' : 'b'
              return (
                <div
                  key={`m-${moveNumber}-${sideKey}-${move}`}
                  className="flex items-center gap-1.5 rounded bg-[#111620]/70 px-2 py-1 border border-transparent hover:border-[#2e3c54]"
                >
                  <span className="text-[10px] text-slate-500 min-w-[1.2rem] text-right">{moveNumber}.</span>
                  <span className="font-semibold text-slate-200">{move}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
