import { describe, it, expect, vi } from 'vitest'
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

  it('throws TypeError on init when constructed without workerFactory outside browser environment', async () => {
    const client = new StockfishClient()
    await expect(client.init()).rejects.toThrow('Web Workers are only supported in browser environments')
  })

  it('calling init multiple times is idempotent and reuses current worker', async () => {
    const mock = new MockWorker()
    let factoryCalls = 0
    const client = new StockfishClient({
      workerFactory: () => {
        factoryCalls++
        return mock
      },
    })

    await client.init()
    expect(factoryCalls).toBe(1)
    expect(client.isReady()).toBe(true)

    // Second call should return early without creating a new worker
    await client.init()
    expect(factoryCalls).toBe(1)
    expect(client.isReady()).toBe(true)

    client.terminate()
    expect(client.isReady()).toBe(false)
  })

  it('ignores arbitrary engine banners and options during uci handshake', async () => {
    const mock = new MockWorker()
    mock.postMessage = (msg: string) => {
      mock.sentCommands.push(msg)
      if (msg === 'uci') {
        setTimeout(() => {
          mock.onmessage?.({ data: 'Stockfish 16 by the Stockfish developers' })
          mock.onmessage?.({ data: 'id name Stockfish 16' })
          mock.onmessage?.({ data: 'id author the Stockfish developers' })
          mock.onmessage?.({ data: 'option name Threads type spin default 1 min 1 max 1024' })
          mock.onmessage?.({ data: 'uciok' })
        }, 5)
      } else if (msg === 'isready') {
        setTimeout(() => {
          mock.onmessage?.({ data: 'readyok' })
        }, 5)
      }
    }

    const client = new StockfishClient({ workerFactory: () => mock })
    await client.init()
    expect(client.isReady()).toBe(true)
    client.terminate()
  })

  it('rejects init if handshake times out', async () => {
    const mock = new MockWorker()
    // Mock worker that ignores messages and never responds
    mock.postMessage = (msg: string) => {
      mock.sentCommands.push(msg)
    }

    const client = new StockfishClient({ workerFactory: () => mock })

    vi.useFakeTimers()
    const initPromise = client.init()
    const expectation = expect(initPromise).rejects.toThrow('Stockfish initialization timed out')
    await vi.advanceTimersByTimeAsync(10500)
    await expectation

    vi.useRealTimers()
    client.terminate()
  })

  it('auto-initializes engine when evaluatePosition is called without prior init', async () => {
    const mock = new MockWorker()
    const client = new StockfishClient({ workerFactory: () => mock })

    expect(client.isReady()).toBe(false)

    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    const evalResult = await client.evaluatePosition(fen, 10)

    expect(client.isReady()).toBe(true)
    expect(mock.sentCommands).toContain('uci')
    expect(mock.sentCommands).toContain('isready')
    expect(mock.sentCommands).toContain(`position fen ${fen}`)
    expect(evalResult.bestMove).toBe('e2e4')

    client.terminate()
  })

  it('evaluates multiple positions sequentially on the same worker', async () => {
    const mock = new MockWorker()
    let evalCount = 0
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
      } else if (msg.startsWith('go depth')) {
        evalCount++
        const current = evalCount
        setTimeout(() => {
          if (current === 1) {
            mock.onmessage?.({ data: 'info depth 12 score cp 40 nodes 2000 pv e2e4 e7e5' })
            mock.onmessage?.({ data: 'bestmove e2e4' })
          } else {
            mock.onmessage?.({ data: 'info depth 12 score cp -50 nodes 3000 pv d7d5 c2c4' })
            mock.onmessage?.({ data: 'bestmove d7d5' })
          }
        }, 5)
      }
    }

    const client = new StockfishClient({ workerFactory: () => mock })
    await client.init()

    const fen1 = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    const eval1 = await client.evaluatePosition(fen1, 12)
    expect(eval1.bestMove).toBe('e2e4')
    expect(eval1.centipawns).toBe(40)

    const fen2 = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2'
    const eval2 = await client.evaluatePosition(fen2, 12)
    expect(eval2.bestMove).toBe('d7d5')
    expect(eval2.centipawns).toBe(-50)

    client.terminate()
  })

  it('evaluates position resulting in a mate score correctly', async () => {
    const mock = new MockWorker()
    mock.postMessage = (msg: string) => {
      mock.sentCommands.push(msg)
      if (msg === 'uci') {
        setTimeout(() => mock.onmessage?.({ data: 'uciok' }), 5)
      } else if (msg === 'isready') {
        setTimeout(() => mock.onmessage?.({ data: 'readyok' }), 5)
      } else if (msg.startsWith('go depth')) {
        setTimeout(() => {
          mock.onmessage?.({ data: 'info depth 14 score mate 1 nodes 1200 pv f7f8q' })
          mock.onmessage?.({ data: 'bestmove f7f8q' })
        }, 5)
      }
    }

    const client = new StockfishClient({ workerFactory: () => mock })
    await client.init()

    const mateFen = '7k/5Q2/6K1/8/8/8/8/8 w - - 0 1'
    const evalResult = await client.evaluatePosition(mateFen, 14)

    expect(evalResult.score).toEqual({ type: 'mate', value: 1 })
    expect(evalResult.centipawns).toBe(10000)
    expect(evalResult.bestMove).toBe('f7f8q')

    client.terminate()
  })

  it('handles evaluation with no pv in info line', async () => {
    const mock = new MockWorker()
    mock.postMessage = (msg: string) => {
      mock.sentCommands.push(msg)
      if (msg === 'uci') {
        setTimeout(() => mock.onmessage?.({ data: 'uciok' }), 5)
      } else if (msg === 'isready') {
        setTimeout(() => mock.onmessage?.({ data: 'readyok' }), 5)
      } else if (msg.startsWith('go depth')) {
        setTimeout(() => {
          mock.onmessage?.({ data: 'info depth 10 score cp 15 nodes 500' })
          mock.onmessage?.({ data: 'bestmove g1f3' })
        }, 5)
      }
    }

    const client = new StockfishClient({ workerFactory: () => mock })
    await client.init()

    const evalResult = await client.evaluatePosition('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 10)
    expect(evalResult.bestMove).toBe('g1f3')
    expect(evalResult.pv).toBeUndefined()
    expect(evalResult.centipawns).toBe(15)

    client.terminate()
  })

  it('falls back to latestInfo when hard timeout fires on hanging worker', async () => {
    const mock = new MockWorker()
    mock.postMessage = (msg: string) => {
      mock.sentCommands.push(msg)
      if (msg === 'uci') {
        setTimeout(() => mock.onmessage?.({ data: 'uciok' }), 5)
      } else if (msg === 'isready') {
        setTimeout(() => mock.onmessage?.({ data: 'readyok' }), 5)
      } else if (msg.startsWith('go depth')) {
        // Send intermediate info line, but never send bestmove
        setTimeout(() => {
          mock.onmessage?.({ data: 'info depth 6 score cp 55 nodes 1000 pv d2d4 d7d5' })
        }, 5)
      }
    }

    const client = new StockfishClient({ workerFactory: () => mock })
    await client.init()

    vi.useFakeTimers()
    const evalPromise = client.evaluatePosition('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 12, 100)

    // Advance past soft timeout and hard timeout (100ms + 2000ms = 2100ms)
    await vi.advanceTimersByTimeAsync(2200)

    const result = await evalPromise
    expect(result.depth).toBe(6)
    expect(result.centipawns).toBe(55)
    expect(result.bestMove).toBe('d2d4')

    vi.useRealTimers()
    client.terminate()
  })

  it('rejects evaluation when hard timeout fires and no info was ever received', async () => {
    const mock = new MockWorker()
    mock.postMessage = (msg: string) => {
      mock.sentCommands.push(msg)
      if (msg === 'uci') {
        setTimeout(() => mock.onmessage?.({ data: 'uciok' }), 5)
      } else if (msg === 'isready') {
        setTimeout(() => mock.onmessage?.({ data: 'readyok' }), 5)
      }
      // Completely hang on go depth, sending neither info nor bestmove
    }

    const client = new StockfishClient({ workerFactory: () => mock })
    await client.init()

    vi.useFakeTimers()
    const evalPromise = client.evaluatePosition('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 10, 100)
    const expectation = expect(evalPromise).rejects.toThrow('Stockfish evaluation timed out after 100ms')

    await vi.advanceTimersByTimeAsync(2200)
    await expectation

    vi.useRealTimers()
    client.terminate()
  })

  it('safe to call terminate before initialization or multiple times', () => {
    const mock = new MockWorker()
    const client = new StockfishClient({ workerFactory: () => mock })

    expect(() => client.terminate()).not.toThrow()
    expect(client.isReady()).toBe(false)

    expect(() => client.terminate()).not.toThrow()
  })
})
