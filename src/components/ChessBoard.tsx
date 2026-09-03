import { useMemo } from 'react'

interface ChessBoardProps {
  fen: string
  /** Squares the previous move touched (from / to in algebraic). */
  lastMove?: { from: string; to: string } | null
  /** True when the side to move is in check — square gets a red glow. */
  inCheck?: boolean
  /** Highlight these squares (e.g. legal-destination hint). */
  highlightedSquares?: string[]
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

// Convert algebraic square (e.g. "e4") to {row, col} where row=0 is rank 8
function squareToCoords(square: string): { row: number; col: number } | null {
  if (square.length !== 2) return null
  const file = square[0]
  const rank = square[1]
  const col = FILES.indexOf(file as (typeof FILES)[number])
  const row = 8 - Number.parseInt(rank, 10)
  if (col < 0 || Number.isNaN(row) || row < 0 || row > 7) return null
  return { col, row }
}

function kingSquareFor(board: (string | null)[][], color: 'w' | 'b'): string | null {
  const target = color === 'w' ? 'K' : 'k'
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (board[r][c] === target) return `${FILES[c]}${8 - r}`
    }
  }
  return null
}

export default function ChessBoard({
  fen,
  highlightedSquares,
  inCheck,
  lastMove,
}: ChessBoardProps) {
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

  const { from: lastFrom, to: lastTo } = useMemo(() => {
    const from = lastMove ? squareToCoords(lastMove.from) : null
    const to = lastMove ? squareToCoords(lastMove.to) : null
    return { from, to }
  }, [lastMove])

  const checkSquare = useMemo(() => {
    if (!inCheck) return null
    const turn = fen.split(' ')[1] // 'w' or 'b'
    if (turn !== 'w' && turn !== 'b') return null
    return kingSquareFor(board, turn)
  }, [board, fen, inCheck])

  const checkCoords = checkSquare ? squareToCoords(checkSquare) : null
  const highlightSet = useMemo(
    () => new Set((highlightedSquares ?? []).filter(Boolean)),
    [highlightedSquares],
  )

  return (
    <div
      className="chessboard relative"
      role="img"
      aria-label={`chess board position ${fen}`}
    >
      {board.map((row, rowIndex) =>
        row.map((piece, colIndex) => {
          const isLight = (rowIndex + colIndex) % 2 === 0
          // SAFETY: piece is a FEN piece letter, always a key of PIECE_UNICODE
          const glyph = piece ? PIECE_UNICODE[piece as PieceKey] : null
          const isWhite = piece !== null && piece === piece.toUpperCase()
          const showRank = colIndex === 0
          const showFile = rowIndex === 7
          const square = `${FILES[colIndex]}${8 - rowIndex}`

          const isLastFrom = lastFrom?.row === rowIndex && lastFrom?.col === colIndex
          const isLastTo = lastTo?.row === rowIndex && lastTo?.col === colIndex
          const isHighlighted = highlightSet.has(square)
          const isCheck = checkCoords?.row === rowIndex && checkCoords?.col === colIndex

          return (
            <div
              key={`${rowIndex}-${colIndex}`}
              role={piece ? 'img' : undefined}
              aria-label={
                piece
                  ? `${isWhite ? 'white' : 'black'} ${piece.toUpperCase()} on ${square}`
                  : `${square} empty`
              }
              className={[
                'sq relative',
                isLight ? 'light' : 'dark',
                isLastFrom ? 'sq-last-from' : '',
                isLastTo ? 'sq-last-to' : '',
                isHighlighted ? 'sq-hint' : '',
                isCheck ? 'sq-check' : '',
              ]
                .filter(Boolean)
                .join(' ')}
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
                <span
                  className={`select-none transition-transform duration-100 ${isWhite ? 'piece-w' : 'piece-b'}`}
                >
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
