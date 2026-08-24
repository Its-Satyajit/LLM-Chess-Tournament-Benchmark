import { useMemo } from 'react'

interface ChessBoardProps {
  fen: string
}

const PIECE_UNICODE = {
  K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙',
  k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟',
} as const

type PieceKey = keyof typeof PIECE_UNICODE

export default function ChessBoard({ fen }: ChessBoardProps) {
  const board = useMemo(() => {
    const rows = fen.split(' ')[0].split('/')
    const grid: (string | null)[][] = []

    for (const row of rows) {
      const boardRow: (string | null)[] = []
      for (const char of row) {
        if (char >= '1' && char <= '8') {
          for (let i = 0; i < parseInt(char); i++) {
            boardRow.push(null)
          }
        } else {
          boardRow.push(char)
        }
      }
      grid.push(boardRow)
    }
    return grid
  }, [fen])

  return (
    <div className="chessboard">
      {board.map((row, rowIndex) =>
        row.map((piece, colIndex) => {
          const isLight = (rowIndex + colIndex) % 2 === 0
          // SAFETY: piece is a FEN piece letter, always a key of PIECE_UNICODE
          const glyph = piece ? PIECE_UNICODE[piece as PieceKey] : null
          const isWhite = piece !== null && piece === piece.toUpperCase()
          return (
            <div
              key={`${rowIndex}-${colIndex}`}
              role={piece ? 'img' : undefined}
              aria-label={
                piece
                  ? `${isWhite ? 'white' : 'black'} ${piece.toUpperCase()}`
                  : undefined
              }
              className={`sq ${isLight ? 'light' : 'dark'}`}
            >
              {glyph && (
                <span className={isWhite ? 'piece-w' : 'piece-b'}>{glyph}</span>
              )}
            </div>
          )
        }),
      )}
    </div>
  )
}
