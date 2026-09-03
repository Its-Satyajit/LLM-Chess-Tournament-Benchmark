// @vitest-environment jsdom
import '../test/setup'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import Arena from './Arena'
import * as api from '../lib/api'

interface TestWsPayload {
  type: string
  gameId?: string
  gameNumber?: number
  matchId?: string
  whitePlayerId?: string
  blackPlayerId?: string
  move?: string
  player?: string
  result?: string
  reason?: string
}

// Mock WebSocket
class MockWebSocket {
  static instances: MockWebSocket[] = []
  url: string
  onopen: (() => void) | null = null
  onclose: (() => void) | null = null
  onmessage: ((ev: { data: string }) => void) | null = null
  onerror: (() => void) | null = null
  sentMessages: string[] = []

  constructor(url: string) {
    this.url = url
    MockWebSocket.instances.push(this)
    setTimeout(() => {
      this.onopen?.()
    }, 0)
  }

  send(data: string) {
    this.sentMessages.push(data)
  }

  close() {
    this.onclose?.()
  }

  emitMessage(data: TestWsPayload) {
    this.onmessage?.({ data: JSON.stringify(data) })
  }
}

describe('Arena page (modular)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    MockWebSocket.instances = []
    // @ts-expect-error Mocking WebSocket
    globalThis.WebSocket = MockWebSocket
  })

  it('renders initial empty arena state', () => {
    render(
      <Arena />
    )

    expect(screen.getByText(/Enter a Match ID to connect/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/MATCH-/i)).toBeInTheDocument()
  })

  it('connects to match and loads game state', async () => {
    const mockMatch: api.Match = {
      id: 'MATCH-TEST-1',
      status: 'active',
      currentGameIndex: 0,
      playerAId: 'model-a',
      playerBId: 'model-b',
      games: [
        {
          id: 'GAME-1',
          gameNumber: 1,
          status: 'active',
          result: null,
          moveCount: 0,
          whitePlayerId: 'model-a',
          displayPlayerAId: 'Model A (G1)',
          displayPlayerBId: 'Model B (G1)',
        },
        {
          id: 'GAME-2',
          gameNumber: 2,
          status: 'pending',
          result: null,
          moveCount: 0,
          whitePlayerId: 'model-b',
          displayPlayerAId: 'Model A (G2)',
          displayPlayerBId: 'Model B (G2)',
        },
      ],
    }

    const mockGameState: api.GameState = {
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      turn: 'white',
      legalMoves: ['e4', 'd4', 'Nf3'],
      history: [],
      clock: { white: 600, black: 600 },
      isCheck: false,
      isCheckmate: false,
      isStalemate: false,
      isDraw: false,
      isGameOver: false,
    }

    vi.spyOn(api, 'getMatch').mockResolvedValue(mockMatch)
    vi.spyOn(api, 'getGameState').mockResolvedValue(mockGameState)

    render(
      <Arena />
    )

    const input = screen.getByPlaceholderText(/MATCH-/i)
    fireEvent.change(input, { target: { value: 'MATCH-TEST-1' } })
    fireEvent.click(screen.getByRole('button', { name: /Connect/i }))

    await waitFor(() => {
      expect(api.getMatch).toHaveBeenCalledWith('MATCH-TEST-1')
      expect(api.getGameState).toHaveBeenCalledWith('MATCH-TEST-1', 'GAME-1')
    })

    expect(screen.getAllByText(/Model A \(G1\)/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Model B \(G1\)/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/LLM Prompt/i)).toBeInTheDocument()
  })

  it('transitions to next game when game_started WS event arrives', async () => {
    const mockMatchG1: api.Match = {
      id: 'MATCH-TEST-1',
      status: 'active',
      currentGameIndex: 0,
      playerAId: 'model-a',
      playerBId: 'model-b',
      games: [
        {
          id: 'GAME-1',
          gameNumber: 1,
          status: 'active',
          result: null,
          moveCount: 2,
          whitePlayerId: 'model-a',
        },
        {
          id: 'GAME-2',
          gameNumber: 2,
          status: 'pending',
          result: null,
          moveCount: 0,
          whitePlayerId: 'model-b',
        },
      ],
    }

    const mockMatchG2: api.Match = {
      ...mockMatchG1,
      currentGameIndex: 1,
      games: [
        {
          id: 'GAME-1',
          gameNumber: 1,
          status: 'completed',
          result: { winner: 'model-a', reason: 'checkmate' },
          moveCount: 20,
          whitePlayerId: 'model-a',
        },
        {
          id: 'GAME-2',
          gameNumber: 2,
          status: 'active',
          result: null,
          moveCount: 0,
          whitePlayerId: 'model-b',
        },
      ],
    }

    const mockGameStateG1: api.GameState = {
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      turn: 'white',
      legalMoves: ['e4'],
      history: [],
      clock: { white: 600, black: 600 },
      isCheck: false,
      isCheckmate: false,
      isStalemate: false,
      isDraw: false,
      isGameOver: false,
    }

    const mockGameStateG2: api.GameState = {
      fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
      turn: 'black',
      legalMoves: ['c5', 'e5'],
      history: ['e4'],
      clock: { white: 600, black: 600 },
      isCheck: false,
      isCheckmate: false,
      isStalemate: false,
      isDraw: false,
      isGameOver: false,
    }

    vi.spyOn(api, 'getMatch').mockResolvedValueOnce(mockMatchG1)
    vi.spyOn(api, 'getGameState').mockResolvedValueOnce(mockGameStateG1)

    render(
      <Arena />
    )

    const input = screen.getByPlaceholderText(/MATCH-/i)
    fireEvent.change(input, { target: { value: 'MATCH-TEST-1' } })
    fireEvent.click(screen.getByRole('button', { name: /Connect/i }))

    await waitFor(() => {
      expect(api.getGameState).toHaveBeenCalledWith('MATCH-TEST-1', 'GAME-1')
    })

    const wsInstance = MockWebSocket.instances[0]
    expect(wsInstance).toBeDefined()

    // Simulate game 1 game_over event
    vi.spyOn(api, 'getMatch').mockResolvedValueOnce(mockMatchG2)
    wsInstance.emitMessage({
      type: 'game_over',
      matchId: 'MATCH-TEST-1',
      gameId: 'GAME-1',
      result: '1-0',
      reason: 'checkmate',
    })

    await waitFor(() => {
      expect(screen.getByText(/Game Over: 1-0 \(checkmate\)/i)).toBeInTheDocument()
    })

    // Now simulate game_started event for GAME-2
    vi.mocked(api.getGameState).mockResolvedValueOnce(mockGameStateG2)
    vi.mocked(api.getMatch).mockResolvedValueOnce(mockMatchG2)
    wsInstance.emitMessage({
      type: 'game_started',
      matchId: 'MATCH-TEST-1',
      gameId: 'GAME-2',
      gameNumber: 2,
      whitePlayerId: 'model-b',
      blackPlayerId: 'model-a',
    })

    await waitFor(() => {
      // Must have fetched GAME-2 state!
      expect(api.getGameState).toHaveBeenCalledWith('MATCH-TEST-1', 'GAME-2')
    })
  })
})
