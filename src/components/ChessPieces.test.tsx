// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import '@testing-library/jest-dom'
import {
  ChessPiece,
  WhitePawn,
  BlackPawn,
  WhiteKnight,
  BlackKnight,
  WhiteBishop,
  BlackBishop,
  WhiteRook,
  BlackRook,
  WhiteQueen,
  BlackQueen,
  WhiteKing,
  BlackKing,
  type PieceLetter,
} from './ChessPieces'

describe('ChessPieces Component using Lucide React chess icons', () => {
  it('renders Lucide chess icons with data-piece attributes for all 12 piece variants', () => {
    const cases: [FC, string, string][] = [
      [WhitePawn, 'P', 'lucide-chess-pawn'],
      [BlackPawn, 'p', 'lucide-chess-pawn'],
      [WhiteKnight, 'N', 'lucide-chess-knight'],
      [BlackKnight, 'n', 'lucide-chess-knight'],
      [WhiteBishop, 'B', 'lucide-chess-bishop'],
      [BlackBishop, 'b', 'lucide-chess-bishop'],
      [WhiteRook, 'R', 'lucide-chess-rook'],
      [BlackRook, 'r', 'lucide-chess-rook'],
      [WhiteQueen, 'Q', 'lucide-chess-queen'],
      [BlackQueen, 'q', 'lucide-chess-queen'],
      [WhiteKing, 'K', 'lucide-chess-king'],
      [BlackKing, 'k', 'lucide-chess-king'],
    ]

    for (const [Component, piece, lucideClass] of cases) {
      const { container } = render(<Component />)
      const svg = container.querySelector(`svg[data-piece="${piece}"]`)
      expect(svg).toBeInTheDocument()
      expect(svg?.classList.contains(lucideClass)).toBe(true)
    }
  })

  it('renders white pieces with white stroke and black pieces with dark stroke', () => {
    const { container: whiteCont } = render(<WhitePawn />)
    const whiteSvg = whiteCont.querySelector('svg')
    expect(whiteSvg).toHaveAttribute('stroke', '#ffffff')

    const { container: blackCont } = render(<BlackPawn />)
    const blackSvg = blackCont.querySelector('svg')
    expect(blackSvg).toHaveAttribute('stroke', '#18181b')
  })

  it('renders stroke-only without fill', () => {
    const { container } = render(<WhitePawn />)
    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('fill', 'none')
  })

  it('renders every piece letter through ChessPiece dispatcher', () => {
    const letters: PieceLetter[] = ['P', 'N', 'B', 'R', 'Q', 'K', 'p', 'n', 'b', 'r', 'q', 'k']
    for (const letter of letters) {
      const { container } = render(<ChessPiece piece={letter} />)
      const svg = container.querySelector(`svg[data-piece="${letter}"]`)
      expect(svg).toBeInTheDocument()
    }
  })
})

type FC = React.FC<{ className?: string }>
