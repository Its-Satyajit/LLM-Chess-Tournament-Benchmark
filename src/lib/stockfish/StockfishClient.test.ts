import { describe, it, expect } from 'vitest'
import { StockfishClient, type WorkerLike } from './StockfishClient'

class MockWorker implements WorkerLike {
  // SAFETY: Mocking Worker onmessage signature
  public onmessage: ((e: any) => void) | null = null
  public sentCommands: string[] = []
  public terminated = false

  postMessage(msg: string) {
    this.sentCommands.push(msg)

    if (msg === 'uci') {
      setTimeout(() => {
        this.onmessage?.({ data: 'id name Stockfish 10' })
        this.onmessage?.({ data: 'uciok' })
      }, 5)
    } else if (msg === 'isready') {
      setTimeout(() => {
        this.onmessage?.({ data: 'readyok' })
      }, 5)
    } else if (msg.startsWith('go depth')) {
      setTimeout(() => {
        this.onmessage?.({ data: 'info depth 10 score cp 35 nodes 1500 pv e2e4 e7e5' })
        this.onmessage?.({ data: 'bestmove e2e4 ponder e7e5' })
      }, 10)
    }
  }

  terminate() {
    this.terminated = true
  }
}

describe('StockfishClient', () => {
  it('initializes engine and completes uci handshake', async () => {
    const mock = new MockWorker()
    const client = new StockfishClient({ workerFactory: () => mock })

    await client.init()

    expect(mock.sentCommands).toContain('uci')
    expect(mock.sentCommands).toContain('isready')
    expect(client.isReady()).toBe(true)

    client.terminate()
    expect(mock.terminated).toBe(true)
  })

  it('evaluates position and returns parsed evaluation and best move', async () => {
    const mock = new MockWorker()
    const client = new StockfishClient({ workerFactory: () => mock })
    await client.init()

    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    const evalResult = await client.evaluatePosition(fen, 10)

    expect(mock.sentCommands).toContain(`position fen ${fen}`)
    expect(mock.sentCommands).toContain('go depth 10')
    expect(evalResult).toEqual({
      bestMove: 'e2e4',
      centipawns: 35,
      depth: 10,
      fen,
      pv: ['e2e4', 'e7e5'],
      score: {
        type: 'cp',
        value: 35,
      },
    })

    client.terminate()
  })

  it('handles soft timeout by sending stop and resolving with best move found', async () => {
    const mock = new MockWorker()
    mock.postMessage = (msg: string) => {
      mock.sentCommands.push(msg)
      if (msg === 'uci') {
        setTimeout(() => {
          mock.onmessage?.({ data: 'uciok' })
        }, 5)
      } else if (msg === 'isready') {
        setTimeout(() => {
          mock.onmessage?.({ data: 'readyok' })
        }, 5)
      } else if (msg === 'stop') {
        setTimeout(() => {
          mock.onmessage?.({ data: 'info depth 8 score cp 20 nodes 800 pv c7c6' })
          mock.onmessage?.({ data: 'bestmove c7c6 ponder g1f3' })
        }, 5)
      }
    }

    const client = new StockfishClient({ workerFactory: () => mock })
    await client.init()

    const fen = 'rnbqkbnr/pppp1ppp/8/4p3/2B1P3/8/PPPP1PPP/RNBQK1NR b KQkq - 1 2'
    const evalResult = await client.evaluatePosition(fen, 14, 50)

    expect(mock.sentCommands).toContain('stop')
    expect(evalResult.bestMove).toBe('c7c6')
    expect(evalResult.depth).toBe(8)
    expect(evalResult.centipawns).toBe(20)

    client.terminate()
  })
})
