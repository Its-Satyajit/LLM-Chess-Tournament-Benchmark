import { useMemo } from 'react'

interface ChessBoardProps {
  fen: string
}

const PIECE_UNICODE = {
  'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘', 'P': '♙',
  'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟',
} satisfies Record<string, string>

export default function ChessBoard({ fen }: ChessBoardProps) {
  const board = useMemo(() => {
    const rows = fen.split(' ')[0].split('/')
    const grid: string[][] = []

    for (const row of rows) {
      const boardRow: string[] = []
      for (const char of row) {
        if (char >= '1' && char <= '8') {
          for (let i = 0; i < parseInt(char); i++) {
            boardRow.push('')
          }
        } else {
          boardRow.push(char)
        }
      }
      grid.push(boardRow)
    }
    return grid
  }, [fen])

  // SAFETY: piece is always a valid chess piece character from FEN parsing
  const getPieceUnicode = (piece: string) => PIECE_UNICODE[piece as keyof typeof PIECE_UNICODE]

  return (
    <div className="border-2 border-gray-600 inline-block w-full max-w-lg aspect-square">
      {board.map((row, rowIndex) => (
        <div key={rowIndex} className="flex h-[12.5%]">
          {row.map((piece, colIndex) => {
            const isLight = (rowIndex + colIndex) % 2 === 0
            return (
              <div
                key={colIndex}
                role="img"
                aria-label={piece ? `${piece === piece.toUpperCase() ? 'white' : 'black'} ${piece}` : undefined}
                className={`flex items-center justify-center w-[12.5%] ${isLight ? 'bg-amber-200' : 'bg-amber-800'}`}
              >
                {piece && (
                  <span
                    className={`${piece === piece.toUpperCase() ? 'text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]' : 'text-gray-900'} text-[min(6vw,2.5rem)] leading-none select-none`}
                  >
                    {getPieceUnicode(piece)}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
