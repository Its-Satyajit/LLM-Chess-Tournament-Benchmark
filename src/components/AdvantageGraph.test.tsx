// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import AdvantageGraph from './AdvantageGraph'
import type { PlyReview } from '../lib/gameReview/coordinator'

const mockPlies: PlyReview[] = [
  {
    accuracy: 100,
    bestMove: 'e2e4',
    centipawns: 20,
    classification: 'theoretical',
    fen: 'fen-1',
    moveNumber: 1,
    playedMove: 'e4',
    ply: 1,
    turn: 'w',
    winProbability: 51,
  },
  {
    accuracy: 98,
    bestMove: 'e7e5',
    centipawns: 15,
    classification: 'theoretical',
    fen: 'fen-2',
    moveNumber: 1,
    playedMove: 'e5',
    ply: 2,
    turn: 'b',
    winProbability: 50.5,
  },
  {
    accuracy: 80,
    bestMove: 'g1f3',
    centipawns: 120,
    classification: 'inaccuracy',
    fen: 'fen-3',
    moveNumber: 2,
    playedMove: 'd3',
    ply: 3,
    turn: 'w',
    winProbability: 58,
  },
]

describe('AdvantageGraph', () => {
  it('renders SVG advantage chart with points for plies', () => {
    render(<AdvantageGraph plies={mockPlies} currentPly={2} onSelectPly={vi.fn()} />)
    expect(screen.getByTestId('advantage-graph-svg')).toBeInTheDocument()
  })

  it('triggers onSelectPly when a ply point is clicked', () => {
    const onSelect = vi.fn()
    render(<AdvantageGraph plies={mockPlies} currentPly={1} onSelectPly={onSelect} />)

    const point = screen.getByTestId('ply-point-3')
    fireEvent.click(point)
    expect(onSelect).toHaveBeenCalledWith(3)
  })
})
