export interface MoveHistoryCardProps {
  legalMoves?: string[]
  moves: string[]
}

export default function MoveHistoryCard({
  legalMoves,
  moves,
}: MoveHistoryCardProps) {
  return (
    <>
      {/* Legal Moves */}
      {legalMoves && legalMoves.length > 0 && (
        <article className="card">
          <header><strong>Legal Moves ({legalMoves.length})</strong></header>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', maxHeight: '8rem', overflowY: 'auto' }}>
            {legalMoves.map((move, i) => (
              <code key={`lm-${move}-${i}`}>{move}</code>
            ))}
          </div>
        </article>
      )}

      {/* Moves History */}
      <article className="card">
        <header><strong>Moves ({moves.length})</strong></header>
        {moves.length === 0 ? (
          <p><small>No moves yet</small></p>
        ) : (
          <div className="moves-grid">
            {moves.map((move, i) => {
              const moveNumber = Math.floor(i / 2) + 1
              const sideKey = i % 2 === 0 ? 'w' : 'b'
              return (
                <div key={`m-${moveNumber}-${sideKey}-${move}`} className="move-row">
                  <small>{moveNumber}.</small> {move}
                </div>
              )
            })}
          </div>
        )}
      </article>
    </>
  )
}
