// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import ChessBoard from './ChessBoard'

const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
const TEST_LAST_MOVE = { from: 'd8', to: 'h4' }
const TEST_HINTS = ['e2', 'e7']

describe('ChessBoard Component', () => {

  it('renders a chess board with 64 squares', () => {
    const { container } = render(<ChessBoard fen={STARTING_FEN} />)
    const board = screen.getByRole('img', { name: /chess board position/i })
    expect(board).toBeInTheDocument()
    const squares = container.querySelectorAll('.sq')
    expect(squares).toHaveLength(64)
  })

  it('renders vector SVG pieces instead of raw text glyphs', () => {
    const { container } = render(<ChessBoard fen={STARTING_FEN} />)
    const svgs = container.querySelectorAll('.chessboard svg')
    // 32 pieces in starting position
    expect(svgs).toHaveLength(32)

    // Verify SVG elements have appropriate piece identifiers
    const whitePawns = container.querySelectorAll('.chessboard svg[data-piece="P"]')
    expect(whitePawns).toHaveLength(8)

    const blackPawns = container.querySelectorAll('.chessboard svg[data-piece="p"]')
    expect(blackPawns).toHaveLength(8)

    const whiteKing = container.querySelector('.chessboard svg[data-piece="K"]')
    expect(whiteKing).toBeInTheDocument()

    const blackKing = container.querySelector('.chessboard svg[data-piece="k"]')
    expect(blackKing).toBeInTheDocument()
  })

  it('renders highlight classes for last move, check, and hints', () => {
    const checkFen = 'rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3'
    const { container } = render(
      <ChessBoard
        fen={checkFen}
        inCheck={true}
        lastMove={TEST_LAST_MOVE}
        highlightedSquares={TEST_HINTS}
      />,
    )

    const checkSquare = container.querySelector('.sq-check')
    expect(checkSquare).toBeInTheDocument()

    const lastFrom = container.querySelector('.sq-last-from')
    const lastTo = container.querySelector('.sq-last-to')
    expect(lastFrom).toBeInTheDocument()
    expect(lastTo).toBeInTheDocument()

    const hints = container.querySelectorAll('.sq-hint')
    expect(hints).toHaveLength(2)
  })
})
