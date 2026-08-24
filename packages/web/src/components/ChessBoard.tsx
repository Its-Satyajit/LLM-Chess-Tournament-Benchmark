// @ts-expect-error lint requires React import
import React from "react"
import { useMemo } from 'react'

interface ChessBoardProps {
  fen: string
  size?: number
}

const PIECE_UNICODE = {
  'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘', 'P': '♙',
  'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟',
} satisfies Record<string, string>

export default function ChessBoard({ fen, size = 400 }: ChessBoardProps) {
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

  const squareSize = size / 8

  // SAFETY: piece is always a valid chess piece character from FEN parsing
  const getPieceUnicode = (piece: string) => PIECE_UNICODE[piece as keyof typeof PIECE_UNICODE]

  return (
    <div 
      className="border-2 border-gray-600 inline-block"
      style={{ width: size, height: size }}
    >
      {board.map((row, rowIndex) => (
        <div key={rowIndex} className="flex">
          {row.map((piece, colIndex) => {
            const isLight = (rowIndex + colIndex) % 2 === 0
            return (
              <div
                key={colIndex}
                className={`flex items-center justify-center ${isLight ? 'bg-amber-200' : 'bg-amber-800'}`}
                style={{ width: squareSize, height: squareSize }}
              >
                {piece && (
                  <span 
                    className={`${piece === piece.toUpperCase() ? 'text-white' : 'text-gray-900'}`}
                    style={{ fontSize: squareSize * 0.8 }}
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
