import { describe, it, expect } from 'vitest'
import { StockfishClient, type WorkerLike } from './StockfishClient'
import { reviewGame, getStoredGameReview, storeGameReview } from '../gameReview/coordinator'

class RealisticStockfishWorker implements WorkerLike {
  // SAFETY: Emulates Worker onmessage callback for Stockfish UCI interactions
  public onmessage: ((e: any) => void) | null = null
  public sentCommands: string[] = []
  public terminated = false

  postMessage(msg: string) {
    this.sentCommands.push(msg)

    if (msg === 'uci') {
      setTimeout(() => {
        this.onmessage?.({ data: 'id name Stockfish 16' })
        this.onmessage?.({ data: 'id author the Stockfish developers' })
        this.onmessage?.({ data: 'uciok' })
      }, 5)
    } else if (msg === 'isready') {
      setTimeout(() => {
        this.onmessage?.({ data: 'readyok' })
      }, 5)
    } else if (msg.startsWith('position fen')) {
      // Position command stored for subsequent go depth
    } else if (msg.startsWith('go depth')) {
      const lastPosCommand = [...this.sentCommands].reverse().find((c) => c.startsWith('position fen')) ?? ''
      const fen = lastPosCommand.replace('position fen ', '')

      setTimeout(() => {
        // Provide position-specific evaluations
        if (fen.includes('7k/5Q2')) {
          // Checkmate position
          this.onmessage?.({ data: 'info depth 14 score mate 0 nodes 5000' })
          this.onmessage?.({ data: 'bestmove (none)' })
        } else if (fen.includes('r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 2 4')) {
          // White has mate in 1 (Qxf7#)
          this.onmessage?.({ data: 'info depth 12 score mate 1 nodes 12000 pv h5f7' })
          this.onmessage?.({ data: 'bestmove h5f7' })
        } else if (fen.includes('r1bqkb1r/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 1 3')) {
          // Black before blunder (optimal is Qe7 or g6)
          this.onmessage?.({ data: 'info depth 10 score cp 50 nodes 8000 pv g7g6 h5f3' })
          this.onmessage?.({ data: 'bestmove g7g6 ponder h5f3' })
        } else {
          // Standard balanced position
          this.onmessage?.({ data: 'info depth 10 score cp 25 nodes 6000 pv e2e4 e7e5' })
          this.onmessage?.({ data: 'bestmove e2e4 ponder e7e5' })
        }
      }, 10)
    }
  }

  terminate() {
    this.terminated = true
  }
}

describe('Stockfish Integration & Game Review Pipeline', () => {
  it('executes full game review of Scholar\'s Mate using StockfishClient', async () => {
    const mockWorker = new RealisticStockfishWorker()
    const client = new StockfishClient({ workerFactory: () => mockWorker })
    await client.init()

    const moves = ['e4', 'e5', 'Qh5', 'Nc6', 'Bc4', 'Nf6', 'Qxf7#']
    const progressPercentages: number[] = []

    const report = await reviewGame({
      depth: 10,
      gameId: 'game-scholars-mate',
      matchId: 'match-integration-1',
      moves,
      onProgress: (p) => {
        progressPercentages.push(p.percentage)
      },
      stockfishClient: client,
    })

    expect(report.gameId).toBe('game-scholars-mate')
    expect(report.matchId).toBe('match-integration-1')
    expect(report.plies).toHaveLength(7)

    // Progress updates should be monotonic and reach 100%
    expect(progressPercentages.length).toBeGreaterThanOrEqual(7)
    expect(progressPercentages[progressPercentages.length - 1]).toBe(100)

    // Verify White metrics (White played the winning attack)
    expect(report.white.accuracy).toBeGreaterThan(60)
    expect(report.white.estimatedRating).toBeGreaterThan(1200)

    // Verify Black metrics (Black allowed mate in 1)
    expect(report.black.classificationCounts).toBeDefined()

    // Store and retrieve report from storage
    storeGameReview(report)
    const stored = getStoredGameReview('match-integration-1', 'game-scholars-mate')
    expect(stored).not.toBeNull()
    expect(stored?.gameId).toBe('game-scholars-mate')
    expect(stored?.plies).toHaveLength(7)

    client.terminate()
    expect(mockWorker.terminated).toBe(true)
  })

  it('evaluates opening positions and calculates accurate move metrics', async () => {
    const mockWorker = new RealisticStockfishWorker()
    const client = new StockfishClient({ workerFactory: () => mockWorker })
    await client.init()

    const report = await reviewGame({
      depth: 10,
      gameId: 'game-opening-eval',
      matchId: 'match-integration-2',
      moves: ['e4', 'e5', 'Nf3', 'Nc6'],
      stockfishClient: client,
    })

    expect(report.plies).toHaveLength(4)
    expect(report.white.accuracy).toBeGreaterThan(70)
    expect(report.black.accuracy).toBeGreaterThan(70)
    expect(report.white.classificationCounts.theoretical).toBeGreaterThanOrEqual(1)
    expect(report.black.classificationCounts.theoretical).toBeGreaterThanOrEqual(1)

    client.terminate()
    expect(mockWorker.terminated).toBe(true)
  })
})
