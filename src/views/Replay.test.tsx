// @vitest-environment jsdom
import '../test/setup'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Replay from './Replay'
import * as api from '../lib/api'
import * as queries from '../lib/queries'

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

const mockCachedReview = {
  black: {
    acpl: 15,
    accuracy: 86.4,
    classificationCounts: { best: 1, blunder: 0, brilliant: 0, excellent: 0, good: 0, inaccuracy: 0, miss: 0, mistake: 0, theoretical: 0, veryGood: 0 },
    estimatedRating: 1820,
  },
  depth: 14,
  gameId: 'game-1',
  matchId: 'match-1',
  plies: [
    { accuracy: 98, centipawns: 25, classification: 'best', moveNumber: 1, playedMove: 'e4', ply: 1, turn: 'w' as const, winProbability: 52 },
    { accuracy: 95, centipawns: 20, classification: 'best', moveNumber: 1, playedMove: 'e5', ply: 2, turn: 'b' as const, winProbability: 48 },
  ],
  white: {
    acpl: 10,
    accuracy: 94.2,
    classificationCounts: { best: 1, blunder: 0, brilliant: 0, excellent: 0, good: 0, inaccuracy: 0, miss: 0, mistake: 0, theoretical: 0, veryGood: 0 },
    estimatedRating: 2150,
  },
}

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })
}

function renderReplay(props: { matchId?: string; gameId?: string } = { gameId: 'game-1', matchId: 'match-1' }) {
  const qc = createTestQueryClient()
  return render(
    <QueryClientProvider client={qc}>
      <Replay matchId={props.matchId} gameId={props.gameId} />
    </QueryClientProvider>,
  )
}

describe('Replay View with Game Review', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(api, 'getMatch').mockResolvedValue(mockMatch)
    vi.spyOn(api, 'getGameState').mockResolvedValue(mockGameState)
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input)
      if (url.includes('/api/game/game-1/review')) {
        return new Response(JSON.stringify(mockCachedReview), {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        })
      }
      return new Response(JSON.stringify({}), { status: 404 })
    })
  })

  it('renders replay theatre with GameReviewCard and controls', async () => {
    renderReplay()

    await waitFor(() => {
      expect(screen.getByText('Game Replay Theatre')).toBeInTheDocument()
    })

    // GameReviewCard header should be present
    expect(screen.getByText(/Stockfish.js Game Review/i)).toBeInTheDocument()
  })

  it('toggles mode between tournament and streamer mode', async () => {
    renderReplay()

    await waitFor(() => {
      expect(screen.getByText('Game Replay Theatre')).toBeInTheDocument()
    })

    const toggleBtn = screen.getByRole('button', { name: /switch mode|tournament mode|streamer mode/i })
    expect(toggleBtn).toBeInTheDocument()
    fireEvent.click(toggleBtn)
    expect(screen.getByText(/Streamer Mode/i)).toBeInTheDocument()
  })

  it('loads cached review from database query when available', async () => {
    renderReplay()

    await waitFor(() => {
      expect(screen.getByText('94.2%')).toBeInTheDocument()
      expect(screen.getByText('86.4%')).toBeInTheDocument()
    })

    expect(screen.getByText('Depth 14')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /re-run review/i })).toBeInTheDocument()
  })

  it('calls saveGameReviewToDb helper correctly', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }))
    await queries.saveGameReviewToDb('game-1', mockCachedReview)

    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/game/game-1/review',
      expect.objectContaining({
        method: 'POST',
      }),
    )
  })
})

