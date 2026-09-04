// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import GameReviewCard from './GameReviewCard'
import type { GameReviewReport } from '../lib/gameReview/coordinator'

const mockReport: GameReviewReport = {
  analyzedAt: '2026-09-04T09:00:00.000Z',
  black: {
    acpl: 24.5,
    accuracy: 84.1,
    classificationCounts: {
      best: 18,
      blunder: 0,
      brilliant: 1,
      excellent: 1,
      good: 8,
      inaccuracy: 1,
      miss: 0,
      mistake: 2,
      theoretical: 2,
      veryGood: 0,
    },
    estimatedRating: 2150,
  },
  depth: 14,
  gameId: 'game-1',
  matchId: 'match-1',
  plies: [],
  white: {
    acpl: 21.2,
    accuracy: 85.0,
    classificationCounts: {
      best: 12,
      blunder: 0,
      brilliant: 0,
      excellent: 8,
      good: 6,
      inaccuracy: 3,
      miss: 0,
      mistake: 0,
      theoretical: 2,
      veryGood: 3,
    },
    estimatedRating: 2200,
  },
}

const mockProgress = { currentPly: 10, percentage: 50, totalPlies: 20 }
const noop = () => {}

describe('GameReviewCard', () => {
  it('renders start review button when no review exists', () => {
    const onStart = vi.fn()
    render(
      <GameReviewCard
        report={null}
        isAnalyzing={false}
        progress={null}
        onStartReview={onStart}
        mode="tournament"
        onToggleMode={noop}
        depth={14}
        onChangeDepth={noop}
      />,
    )

    expect(screen.getByRole('button', { name: /start review|run game review/i })).toBeInTheDocument()
  })

  it('renders progress bar while analyzing', () => {
    render(
      <GameReviewCard
        report={null}
        isAnalyzing={true}
        progress={mockProgress}
        onStartReview={noop}
        mode="tournament"
        onToggleMode={noop}
        depth={14}
        onChangeDepth={noop}
      />,
    )

    expect(screen.getByText(/50%/i)).toBeInTheDocument()
    expect(screen.getByText(/ply 10 \/ 20/i)).toBeInTheDocument()
  })

  it('renders accuracy and classification table in tournament mode', () => {
    render(
      <GameReviewCard
        report={mockReport}
        isAnalyzing={false}
        progress={null}
        onStartReview={noop}
        mode="tournament"
        onToggleMode={noop}
        depth={14}
        onChangeDepth={noop}
      />,
    )

    // Accuracy
    expect(screen.getByText('85.0%')).toBeInTheDocument()
    expect(screen.getByText('84.1%')).toBeInTheDocument()

    // Ratings
    expect(screen.getByText('2200')).toBeInTheDocument()
    expect(screen.getByText('2150')).toBeInTheDocument()

    // Tournament labels
    expect(screen.getByText(/Brilliant Move/i)).toBeInTheDocument()
    expect(screen.getByText(/Blunder/i)).toBeInTheDocument()
  })

  it('switches labels when in streamer / sigma mode', () => {
    const toggleMode = vi.fn()
    render(
      <GameReviewCard
        report={mockReport}
        isAnalyzing={false}
        progress={null}
        onStartReview={noop}
        mode="streamer"
        onToggleMode={toggleMode}
        depth={14}
        onChangeDepth={noop}
      />,
    )

    // Streamer labels
    expect(screen.getByText(/Sigma/i)).toBeInTheDocument()
    expect(screen.getByText(/Awesome/i)).toBeInTheDocument()
    expect(screen.getByText(/Clown/i)).toBeInTheDocument()
    expect(screen.getByText(/Strange/i)).toBeInTheDocument()

    const toggleBtn = screen.getByRole('button', { name: /switch mode|tournament mode|streamer mode/i })
    fireEvent.click(toggleBtn)
    expect(toggleMode).toHaveBeenCalled()
  })
})
