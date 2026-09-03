import { useMemo } from 'react'

interface ChessBoardProps {
  fen: string
}

const PIECE_UNICODE = {
  B: '♗',
  K: '♔',
  N: '♘',
  P: '♙',
  Q: '♕',
  R: '♖',
  b: '♝',
  k: '♚',
  n: '♞',
  p: '♟',
  q: '♛',
  r: '♜',
} as const

type PieceKey = keyof typeof PIECE_UNICODE

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const

export default function ChessBoard({ fen }: ChessBoardProps) {
  const board = useMemo(() => {
    const rows = fen.split(' ')[0].split('/')
    const grid: (string | null)[][] = []

    for (const row of rows) {
      const boardRow: (string | null)[] = []
      for (const char of row) {
        if (char >= '1' && char <= '8') {
          for (let i = 0; i < Number.parseInt(char, 10); i++) {
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
    <div className="chessboard relative">
      {board.map((row, rowIndex) =>
        row.map((piece, colIndex) => {
          const isLight = (rowIndex + colIndex) % 2 === 0
          // SAFETY: piece is a FEN piece letter, always a key of PIECE_UNICODE
          const glyph = piece ? PIECE_UNICODE[piece as PieceKey] : null
          const isWhite = piece !== null && piece === piece.toUpperCase()
          const showRank = colIndex === 0
          const showFile = rowIndex === 7

          return (
            <div
              key={`${rowIndex}-${colIndex}`}
              role={piece ? 'img' : undefined}
              aria-label={
                piece
                  ? `${isWhite ? 'white' : 'black'} ${piece.toUpperCase()}`
                  : undefined
              }
              className={`sq relative ${isLight ? 'light' : 'dark'}`}
            >
              {/* Rank coordinate */}
              {showRank && (
                <span
                  className={`pointer-events-none absolute left-0.5 top-0.5 text-[9px] font-bold leading-none ${
                    isLight ? 'text-[#8b6b4a]' : 'text-[#ede0c8]'
                  }`}
                  aria-hidden="true"
                >
                  {8 - rowIndex}
                </span>
              )}

              {/* Piece glyph */}
              {glyph && (
                <span className={`select-none transition-transform duration-100 ${isWhite ? 'piece-w' : 'piece-b'}`}>
                  {glyph}
                </span>
              )}

              {/* File coordinate */}
              {showFile && (
                <span
                  className={`pointer-events-none absolute bottom-0.5 right-0.5 text-[9px] font-bold leading-none ${
                    isLight ? 'text-[#8b6b4a]' : 'text-[#ede0c8]'
                  }`}
                  aria-hidden="true"
                >
                  {FILES[colIndex]}
                </span>
              )}
            </div>
          )
        }),
      )}
    </div>
  )
}
