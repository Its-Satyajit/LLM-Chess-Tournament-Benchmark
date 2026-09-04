import type { FC } from 'react'
import {
  ChessBishop,
  ChessKing,
  ChessKnight,
  ChessPawn,
  ChessQueen,
  ChessRook,
} from 'lucide-react'

export type PieceLetter = 'P' | 'N' | 'B' | 'R' | 'Q' | 'K' | 'p' | 'n' | 'b' | 'r' | 'q' | 'k'
export type PieceKey = PieceLetter

interface PieceProps {
  className?: string
}

export const WhitePawn: FC<PieceProps> = ({ className }) => (
  <ChessPawn
    className={className}
    color="#ffffff"
    strokeWidth={1.5}
    size="100%"
    data-piece="P"
    aria-hidden="true"
  />
)

export const BlackPawn: FC<PieceProps> = ({ className }) => (
  <ChessPawn
    className={className}
    color="#18181b"
    strokeWidth={1.5}
    size="100%"
    data-piece="p"
    aria-hidden="true"
  />
)

export const WhiteKnight: FC<PieceProps> = ({ className }) => (
  <ChessKnight
    className={className}
    color="#ffffff"
    strokeWidth={1.5}
    size="100%"
    data-piece="N"
    aria-hidden="true"
  />
)

export const BlackKnight: FC<PieceProps> = ({ className }) => (
  <ChessKnight
    className={className}
    color="#18181b"
    strokeWidth={1.5}
    size="100%"
    data-piece="n"
    aria-hidden="true"
  />
)

export const WhiteBishop: FC<PieceProps> = ({ className }) => (
  <ChessBishop
    className={className}
    color="#ffffff"
    strokeWidth={1.5}
    size="100%"
    data-piece="B"
    aria-hidden="true"
  />
)

export const BlackBishop: FC<PieceProps> = ({ className }) => (
  <ChessBishop
    className={className}
    color="#18181b"
    strokeWidth={1.5}
    size="100%"
    data-piece="b"
    aria-hidden="true"
  />
)

export const WhiteRook: FC<PieceProps> = ({ className }) => (
  <ChessRook
    className={className}
    color="#ffffff"
    strokeWidth={1.5}
    size="100%"
    data-piece="R"
    aria-hidden="true"
  />
)

export const BlackRook: FC<PieceProps> = ({ className }) => (
  <ChessRook
    className={className}
    color="#18181b"
    strokeWidth={1.5}
    size="100%"
    data-piece="r"
    aria-hidden="true"
  />
)

export const WhiteQueen: FC<PieceProps> = ({ className }) => (
  <ChessQueen
    className={className}
    color="#ffffff"
    strokeWidth={1.5}
    size="100%"
    data-piece="Q"
    aria-hidden="true"
  />
)

export const BlackQueen: FC<PieceProps> = ({ className }) => (
  <ChessQueen
    className={className}
    color="#18181b"
    strokeWidth={1.5}
    size="100%"
    data-piece="q"
    aria-hidden="true"
  />
)

export const WhiteKing: FC<PieceProps> = ({ className }) => (
  <ChessKing
    className={className}
    color="#ffffff"
    strokeWidth={1.5}
    size="100%"
    data-piece="K"
    aria-hidden="true"
  />
)

export const BlackKing: FC<PieceProps> = ({ className }) => (
  <ChessKing
    className={className}
    color="#18181b"
    strokeWidth={1.5}
    size="100%"
    data-piece="k"
    aria-hidden="true"
  />
)

const PIECE_COMPONENTS = {
  B: WhiteBishop,
  K: WhiteKing,
  N: WhiteKnight,
  P: WhitePawn,
  Q: WhiteQueen,
  R: WhiteRook,
  b: BlackBishop,
  k: BlackKing,
  n: BlackKnight,
  p: BlackPawn,
  q: BlackQueen,
  r: BlackRook,
} satisfies Record<PieceLetter, FC<PieceProps>>

interface ChessPieceProps {
  piece: PieceLetter
  className?: string
}

export function ChessPiece({ piece, className }: ChessPieceProps) {
  const Component = PIECE_COMPONENTS[piece]
  if (!Component) return null
  return <Component className={className} />
}
