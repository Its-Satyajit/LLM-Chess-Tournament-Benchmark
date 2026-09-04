// @vitest-environment jsdom
import '../test/setup'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Benchmark from './Benchmark'

const mockBenchmarkData = {
  evaluatedGames: 12,
  lastUpdated: '2026-09-04T12:00:00Z',
  models: [
    {
      avgAccuracy: 92.4,
      avgThinkTimeSeconds: 2.1,
      avgTokensPerMove: 210,
      blunderRate: 1.8,
      classifications: {
        best: 45,
        blunder: 2,
        brilliant: 5,
        excellent: 30,
        good: 15,
        inaccuracy: 8,
        miss: 1,
        mistake: 4,
      },
      draws: 2,
      evaluatedGamesCount: 6,
      gamesPlayed: 10,
      losses: 1,
      model: 'gpt-4o',
      points: 8,
      provider: 'openai',
      rating: 2150,
      rd: 65,
      totalTokensUsed: 25200,
      winRate: 70,
      wins: 7,
    },
    {
      avgAccuracy: 89.1,
      avgThinkTimeSeconds: 3.4,
      avgTokensPerMove: 320,
      blunderRate: 3.2,
      classifications: {
        best: 38,
        blunder: 5,
        brilliant: 2,
        excellent: 25,
        good: 20,
        inaccuracy: 12,
        miss: 3,
        mistake: 7,
      },
      draws: 2,
      evaluatedGamesCount: 6,
      gamesPlayed: 10,
      losses: 5,
      model: 'claude-3-5-sonnet',
      points: 4,
      provider: 'anthropic',
      rating: 1980,
      rd: 75,
      totalTokensUsed: 35840,
      winRate: 30,
      wins: 3,
    },
  ],
  totalGames: 20,
  totalMatches: 5,
}

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })
}

function renderBenchmark() {
  const qc = createTestQueryClient()
  return render(
    <QueryClientProvider client={qc}>
      <Benchmark />
    </QueryClientProvider>,
  )
}

describe('Benchmark View', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input)
      if (url.includes('/api/benchmark')) {
        return new Response(JSON.stringify(mockBenchmarkData), {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        })
      }
      return new Response(JSON.stringify({}), { status: 404 })
    })
  })

  it('renders benchmark dashboard header and stat cards', async () => {
    renderBenchmark()

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /Benchmark Analytics Matrix/i })).toBeInTheDocument()
    })

    expect(screen.getByText(/5 Matches/i)).toBeInTheDocument()
    expect(screen.getByText(/20 Games/i)).toBeInTheDocument()
    expect(screen.getByText(/12 Evaluated/i)).toBeInTheDocument()
  })

  it('renders the 4 visual chart sections', async () => {
    renderBenchmark()

    await waitFor(() => {
      expect(screen.getByText(/Elo vs Move Accuracy/i)).toBeInTheDocument()
      expect(screen.getByText(/Move Classification Distribution/i)).toBeInTheDocument()
      expect(screen.getByText(/Think Time vs Blunder Rate/i)).toBeInTheDocument()
      expect(screen.getByText(/Token Efficiency & Consumption/i)).toBeInTheDocument()
    })
  })

  it('renders benchmark matrix table and filters by search query', async () => {
    renderBenchmark()

    await waitFor(() => {
      expect(screen.getAllByText(/gpt-4o/).length).toBeGreaterThan(0)
      expect(screen.getAllByText(/claude-3-5-sonnet/).length).toBeGreaterThan(0)
    })

    const searchInput = screen.getByPlaceholderText(/search model or provider/i)
    fireEvent.change(searchInput, { target: { value: 'gpt' } })

    expect(screen.getAllByText(/gpt-4o/).length).toBeGreaterThan(0)
    expect(screen.queryAllByText(/claude-3-5-sonnet/).length).toBe(0)
  })

  it('filters by provider selector', async () => {
    renderBenchmark()

    await waitFor(() => {
      expect(screen.getAllByText(/gpt-4o/).length).toBeGreaterThan(0)
    })

    const providerSelect = screen.getByRole('combobox', { name: /filter provider/i })
    fireEvent.change(providerSelect, { target: { value: 'anthropic' } })

    expect(screen.queryAllByText(/gpt-4o/).length).toBe(0)
    expect(screen.getAllByText(/claude-3-5-sonnet/).length).toBeGreaterThan(0)
  })
})
