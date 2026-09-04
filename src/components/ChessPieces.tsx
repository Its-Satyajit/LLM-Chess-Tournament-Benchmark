import type { FC } from 'react'

export type PieceLetter = 'P' | 'N' | 'B' | 'R' | 'Q' | 'K' | 'p' | 'n' | 'b' | 'r' | 'q' | 'k'
export type PieceKey = PieceLetter

interface PieceProps {
  className?: string
}

export const WhitePawn: FC<PieceProps> = ({ className }) => (
  <svg viewBox="0 0 45 45" className={className} data-piece="P" aria-hidden="true">
    <path
      d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z"
      fill="#ffffff"
      stroke="#12100e"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

export const BlackPawn: FC<PieceProps> = ({ className }) => (
  <svg viewBox="0 0 45 45" className={className} data-piece="p" aria-hidden="true">
    <path
      d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z"
      fill="#222222"
      stroke="#12100e"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M12 37.5c4-1 17-1 21 0"
      fill="none"
      stroke="#ffffff"
      strokeWidth="1.2"
      strokeLinecap="round"
    />
  </svg>
)

export const WhiteKnight: FC<PieceProps> = ({ className }) => (
  <svg viewBox="0 0 45 45" className={className} data-piece="N" aria-hidden="true">
    <g fill="none" fillRule="evenodd" clipRule="evenodd" stroke="#12100e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path
        d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21"
        fill="#ffffff"
      />
      <path
        d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.042-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4.003 1-4-4 0-2 6-12 6-12s1.89-1.9 2-3.5c-.73-.994-.5-2-.5-3 1-1 3 2.5 3 2.5h2s.78-1.992 2.5-3c1 0 1 3 1 3"
        fill="#ffffff"
      />
      <circle cx="9.5" cy="25.5" r="1" fill="#12100e" />
      <path d="M15 15.5c.5.5 1.5.5 2 0" />
    </g>
  </svg>
)

export const BlackKnight: FC<PieceProps> = ({ className }) => (
  <svg viewBox="0 0 45 45" className={className} data-piece="n" aria-hidden="true">
    <g fill="none" fillRule="evenodd" clipRule="evenodd" stroke="#12100e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path
        d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21"
        fill="#222222"
      />
      <path
        d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.042-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4.003 1-4-4 0-2 6-12 6-12s1.89-1.9 2-3.5c-.73-.994-.5-2-.5-3 1-1 3 2.5 3 2.5h2s.78-1.992 2.5-3c1 0 1 3 1 3"
        fill="#222222"
      />
      <circle cx="9.5" cy="25.5" r="1" fill="#ffffff" />
      <path d="M15 15.5c.5.5 1.5.5 2 0" stroke="#ffffff" />
      <path d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4" stroke="#ffffff" strokeWidth="1" />
    </g>
  </svg>
)

export const WhiteBishop: FC<PieceProps> = ({ className }) => (
  <svg viewBox="0 0 45 45" className={className} data-piece="B" aria-hidden="true">
    <g fill="none" fillRule="evenodd" clipRule="evenodd" stroke="#12100e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <g fill="#ffffff" stroke="#12100e">
        <path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.354.49-2.323.47-3-.5 1.354-1.94 3-2 3-2zM15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2zM25 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 1 1 5 0z" />
        <path d="M17.5 26h10M15 30h15" />
      </g>
      <path d="M22.5 15.5v5M20 18h5" stroke="#12100e" strokeLinejoin="miter" />
    </g>
  </svg>
)

export const BlackBishop: FC<PieceProps> = ({ className }) => (
  <svg viewBox="0 0 45 45" className={className} data-piece="b" aria-hidden="true">
    <g fill="none" fillRule="evenodd" clipRule="evenodd" stroke="#12100e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <g fill="#222222" stroke="#12100e">
        <path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.354.49-2.323.47-3-.5 1.354-1.94 3-2 3-2zM15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2zM25 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 1 1 5 0z" />
      </g>
      <path d="M17.5 26h10M15 30h15" stroke="#ffffff" strokeWidth="1.2" />
      <path d="M22.5 15.5v5M20 18h5" stroke="#ffffff" strokeWidth="1.2" strokeLinejoin="miter" />
    </g>
  </svg>
)

export const WhiteRook: FC<PieceProps> = ({ className }) => (
  <svg viewBox="0 0 45 45" className={className} data-piece="R" aria-hidden="true">
    <g fill="#ffffff" fillRule="evenodd" clipRule="evenodd" stroke="#12100e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 39h27v-3H9v3zM12 36v-4h21v4H12zM11 14V9h4v2h5V9h5v2h5V9h4v5" />
      <path d="M34 14l-3 3H14l-3-3" />
      <path d="M31 17v12.5H14V17" />
      <path d="M31 29.5l1.5 2.5h-20l1.5-2.5" />
      <path d="M11 14h23" fill="none" />
    </g>
  </svg>
)

export const BlackRook: FC<PieceProps> = ({ className }) => (
  <svg viewBox="0 0 45 45" className={className} data-piece="r" aria-hidden="true">
    <g fill="#222222" fillRule="evenodd" clipRule="evenodd" stroke="#12100e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 39h27v-3H9v3zM12 36v-4h21v4H12zM11 14V9h4v2h5V9h5v2h5V9h4v5" />
      <path d="M34 14l-3 3H14l-3-3" />
      <path d="M31 17v12.5H14V17" />
      <path d="M31 29.5l1.5 2.5h-20l1.5-2.5" />
      <path d="M12 35.5h21" fill="none" stroke="#ffffff" strokeWidth="1.2" />
      <path d="M14 29.5h17" fill="none" stroke="#ffffff" strokeWidth="1.2" />
      <path d="M14 17h17" fill="none" stroke="#ffffff" strokeWidth="1.2" />
      <path d="M11 14h23" fill="none" stroke="#ffffff" strokeWidth="1.2" />
    </g>
  </svg>
)

export const WhiteQueen: FC<PieceProps> = ({ className }) => (
  <svg viewBox="0 0 45 45" className={className} data-piece="Q" aria-hidden="true">
    <g fill="#ffffff" fillRule="evenodd" clipRule="evenodd" stroke="#12100e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 12a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM24.5 7.5a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM41 12a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM16 8.5a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM33 8.5a2 2 0 1 1-4 0 2 2 0 1 1 4 0z" />
      <path d="M9 26c8.5-1.5 21-1.5 27 0l2-12-7 11V11l-5.5 13.5-3-15-3 15-5.5-13.5V25l-7-11 2 12z" />
      <path d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5-1.5 1.5.5 2.5.5 2.5 6.5 1 16.5 1 23 0 0 0 2-1 .5-2.5 0 0 0-1.5-1.5-2.5-.5-2.5 0-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z" />
      <path d="M11.5 30c3.5-1 18.5-1 22 0M12 33.5c6-1 15-1 21 0" fill="none" />
    </g>
  </svg>
)

export const BlackQueen: FC<PieceProps> = ({ className }) => (
  <svg viewBox="0 0 45 45" className={className} data-piece="q" aria-hidden="true">
    <g fill="#222222" fillRule="evenodd" clipRule="evenodd" stroke="#12100e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 12a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM24.5 7.5a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM41 12a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM16 8.5a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM33 8.5a2 2 0 1 1-4 0 2 2 0 1 1 4 0z" fill="#ffffff" stroke="#12100e" />
      <path d="M9 26c8.5-1.5 21-1.5 27 0l2-12-7 11V11l-5.5 13.5-3-15-3 15-5.5-13.5V25l-7-11 2 12z" />
      <path d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5-1.5 1.5.5 2.5.5 2.5 6.5 1 16.5 1 23 0 0 0 2-1 .5-2.5 0 0 0-1.5-1.5-2.5-.5-2.5 0-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z" />
      <path d="M11.5 30c3.5-1 18.5-1 22 0M12 33.5c6-1 15-1 21 0" fill="none" stroke="#ffffff" strokeWidth="1.2" />
    </g>
  </svg>
)

export const WhiteKing: FC<PieceProps> = ({ className }) => (
  <svg viewBox="0 0 45 45" className={className} data-piece="K" aria-hidden="true">
    <g fill="none" fillRule="evenodd" clipRule="evenodd" stroke="#12100e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22.5 11.63V6M20 8h5" strokeLinejoin="miter" />
      <path
        d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5"
        fill="#ffffff"
        stroke="#12100e"
      />
      <path
        d="M11.5 37c5.5 3.5 15.5 3.5 21 0v-7s9-4.5 6-10.5c-4-1-6.5 6-6.5 6-2.5-2-6.5-1-6.5-1-1.5-2-1.5-3.5-1.5-3.5s0 1.5-1.5 3.5c0 0-4-1-6.5 1 0 0-2.5-7-6.5-6-3 6 6 10.5 6 10.5v7z"
        fill="#ffffff"
        stroke="#12100e"
      />
      <path d="M11.5 30c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0" />
    </g>
  </svg>
)

export const BlackKing: FC<PieceProps> = ({ className }) => (
  <svg viewBox="0 0 45 45" className={className} data-piece="k" aria-hidden="true">
    <g fill="none" fillRule="evenodd" clipRule="evenodd" stroke="#12100e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22.5 11.63V6M20 8h5" stroke="#ffffff" strokeWidth="1.5" strokeLinejoin="miter" />
      <path
        d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5"
        fill="#222222"
        stroke="#12100e"
      />
      <path
        d="M11.5 37c5.5 3.5 15.5 3.5 21 0v-7s9-4.5 6-10.5c-4-1-6.5 6-6.5 6-2.5-2-6.5-1-6.5-1-1.5-2-1.5-3.5-1.5-3.5s0 1.5-1.5 3.5c0 0-4-1-6.5 1 0 0-2.5-7-6.5-6-3 6 6 10.5 6 10.5v7z"
        fill="#222222"
        stroke="#12100e"
      />
      <path d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5" stroke="#ffffff" strokeWidth="1" />
      <path d="M11.5 30c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0" stroke="#ffffff" strokeWidth="1.2" />
    </g>
  </svg>
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
