// @vitest-environment jsdom
import '../test/setup'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import Replay from './Replay'
import * as api from '../lib/api'

const mockMatch: api.Match = {
  currentGameIndex: 0,
  games: [
    {
      gameNumber: 1,
      id: 'game-1',
      moveCount: 2,
      result: { reason: 'checkmate', winner: 'white' },
      status: 'completed',
    },
  ],
  id: 'match-1',
  playerAId: 'p1',
  playerBId: 'p2',
  status: 'completed',
}

const mockGameState: api.GameState = {
  clock: { black: 300, white: 280 },
  fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2',
  history: ['e4', 'e5'],
  isCheck: false,
  isCheckmate: false,
  isDraw: false,
  isGameOver: false,
  isStalemate: false,
  turn: 'white',
}

describe('Replay View with Game Review', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(api, 'getMatch').mockResolvedValue(mockMatch)
    vi.spyOn(api, 'getGameState').mockResolvedValue(mockGameState)
  })

  it('renders replay theatre with GameReviewCard and controls', async () => {
    render(<Replay matchId="match-1" gameId="game-1" />)

    await waitFor(() => {
      expect(screen.getByText('Game Replay Theatre')).toBeInTheDocument()
    })

    // GameReviewCard header should be present
    expect(screen.getByText(/Stockfish.js Game Review/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /start review/i })).toBeInTheDocument()
  })

  it('toggles mode between tournament and streamer mode', async () => {
    render(<Replay matchId="match-1" gameId="game-1" />)

    await waitFor(() => {
      expect(screen.getByText('Game Replay Theatre')).toBeInTheDocument()
    })

    const toggleBtn = screen.getByRole('button', { name: /switch mode|tournament mode|streamer mode/i })
    expect(toggleBtn).toBeInTheDocument()
    fireEvent.click(toggleBtn)
    expect(screen.getByText(/Streamer Mode/i)).toBeInTheDocument()
  })
})
