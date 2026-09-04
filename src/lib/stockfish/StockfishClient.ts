import { parseUciInfoLine, parseBestMoveLine, scoreToCentipawns, type UciScore, type UciInfo } from './uciParser'

export interface WorkerLike {
  postMessage: (msg: string) => void
  // SAFETY: Compatible with both DOM Worker MessageEvent and test runner mock events
  onmessage: ((e: any) => void) | null
  terminate: () => void
}

export interface PositionEvaluation {
  fen: string
  depth: number
  score: UciScore
  centipawns: number
  bestMove: string
  pv?: string[]
}

export interface StockfishClientOptions {
  workerFactory?: () => WorkerLike
  workerPath?: string
}

export class StockfishClient {
  private worker: WorkerLike | null = null
  private ready = false
  private workerFactory: () => WorkerLike

  constructor(options?: StockfishClientOptions) {
    if (options?.workerFactory) {
      this.workerFactory = options.workerFactory
    } else {
      const path = options?.workerPath ?? '/stockfish/stockfish.js'
      this.workerFactory = () => {
        if (globalThis.window === undefined || globalThis.Worker === undefined) {
          throw new TypeError('Web Workers are only supported in browser environments')
        }
        return new Worker(path)
      }
    }
  }

  public isReady(): boolean {
    return this.ready
  }

  public async init(): Promise<void> {
    if (this.ready) return

    this.worker = this.workerFactory()

    return new Promise((resolve, reject) => {
      let isUciOk = false
      const timeout = setTimeout(() => {
        reject(new Error('Stockfish initialization timed out'))
      }, 10000)

      const handleMessage = (e: { data: unknown }) => {
        const line = String(e.data)

        if (line.includes('uciok')) {
          isUciOk = true
          this.worker?.postMessage('isready')
        } else if (isUciOk && line.includes('readyok')) {
          clearTimeout(timeout)
          this.ready = true
          if (this.worker) {
            this.worker.onmessage = null
          }
          resolve()
        }
      }

      if (this.worker) {
        this.worker.onmessage = handleMessage
        this.worker.postMessage('uci')
      }
    })
  }

  public async evaluatePosition(
    fen: string,
    depth: number,
    timeoutMs = Math.max(25000, depth * 2000),
  ): Promise<PositionEvaluation> {
    if (!this.ready || !this.worker) {
      await this.init()
    }

    const worker = this.worker
    if (!worker) {
      throw new Error('Stockfish worker is unavailable')
    }

    return new Promise((resolve, reject) => {
      let latestInfo: UciInfo | null = null
      let isStopping = false

      const softTimeoutMs = Math.max(20, Math.floor(timeoutMs * 0.8))
      const hardTimeoutMs = timeoutMs + 2000

      const cleanup = () => {
        clearTimeout(softTimer)
        clearTimeout(hardTimer)
        worker.onmessage = null
      }

      // Soft timeout: send 'stop' to instruct Stockfish to conclude its search
      // and output bestmove from the deepest depth reached so far
      const softTimer = setTimeout(() => {
        if (!isStopping && worker) {
          isStopping = true
          try {
            worker.postMessage('stop')
          } catch {
            // Worker may have been terminated
          }
        }
      }, softTimeoutMs)

      // Hard timeout: safety ceiling in case worker process hangs entirely
      const hardTimer = setTimeout(() => {
        cleanup()
        if (latestInfo) {
          const score = latestInfo.score ?? { type: 'cp', value: 0 }
          resolve({
            bestMove: latestInfo.pv?.[0] ?? 'e2e4',
            centipawns: scoreToCentipawns(score),
            depth: latestInfo.depth,
            fen,
            pv: latestInfo.pv,
            score,
          })
          return
        }
        reject(new Error(`Stockfish evaluation timed out after ${timeoutMs}ms for position: ${fen}`))
      }, hardTimeoutMs)

      worker.onmessage = (e: { data: unknown }) => {
        const line = String(e.data)

        const info = parseUciInfoLine(line)
        if (info && info.score) {
          latestInfo = info
        }

        const bestMoveMatch = parseBestMoveLine(line)
        if (bestMoveMatch) {
          cleanup()
          const score = latestInfo?.score ?? { type: 'cp', value: 0 }
          const centipawns = scoreToCentipawns(score)

          resolve({
            bestMove: bestMoveMatch.bestMove,
            centipawns,
            depth: latestInfo?.depth ?? depth,
            fen,
            pv: latestInfo?.pv,
            score,
          })
        }
      }

      worker.postMessage(`position fen ${fen}`)
      worker.postMessage(`go depth ${depth}`)
    })
  }

  public terminate(): void {
    if (this.worker) {
      this.worker.terminate()
      this.worker = null
    }
    this.ready = false
  }
}
