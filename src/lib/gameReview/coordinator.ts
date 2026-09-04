import { Chess } from 'chess.js'
import {
  calculateWinProbability,
  calculateMoveAccuracy,
  calculateAggregateAccuracy,
  classifyMove,
  calculateAcpl,
  estimatePerformanceRating,
  type MoveClassificationType,
} from './metrics'
import type { StockfishClient, PositionEvaluation } from '../stockfish/StockfishClient'

export const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

export interface PlyReview {
  ply: number
  moveNumber: number
  turn: 'w' | 'b'
  playedMove: string
  bestMove: string
  centipawns: number
  winProbability: number
  accuracy: number
  classification: MoveClassificationType
  fen: string
  pv?: string[]
}

export interface PlayerReviewSummary {
  accuracy: number
  acpl: number
  estimatedRating: number
  classificationCounts: Record<MoveClassificationType, number>
}

export interface GameReviewReport {
  matchId: string
  gameId: string
  depth: number
  analyzedAt: string
  white: PlayerReviewSummary
  black: PlayerReviewSummary
  plies: PlyReview[]
}

export interface ReviewProgress {
  currentPly: number
  totalPlies: number
  percentage: number
}

export interface ReviewGameOptions {
  matchId: string
  gameId: string
  moves: string[]
  depth: number
  stockfishClient: Pick<StockfishClient, 'evaluatePosition'>
  onProgress?: (progress: ReviewProgress) => void
}

const STORAGE_PREFIX = 'review:'

const memoryStore = new Map<string, string>()

export function getReviewStorageKey(matchId: string, gameId: string): string {
  return `${STORAGE_PREFIX}${matchId}:${gameId}`
}

export function getStoredGameReview(matchId: string, gameId: string): GameReviewReport | null {
  const key = getReviewStorageKey(matchId, gameId)
  try {
    if (globalThis.window?.localStorage) {
      const raw = globalThis.window.localStorage.getItem(key)
      if (!raw) return null
      // SAFETY: Stored review was validated prior to serialization
      return JSON.parse(raw) as GameReviewReport
    }
    const memoryRaw = memoryStore.get(key)
    if (!memoryRaw) return null
    // SAFETY: Memory store holds serialized GameReviewReport instances
    return JSON.parse(memoryRaw) as GameReviewReport
  } catch {
    return null
  }
}

export function storeGameReview(report: GameReviewReport): void {
  const key = getReviewStorageKey(report.matchId, report.gameId)
  const serialized = JSON.stringify(report)
  try {
    if (globalThis.window?.localStorage) {
      globalThis.window.localStorage.setItem(key, serialized)
    }
    memoryStore.set(key, serialized)
  } catch {
    // Storage quota or disabled in incognito
    memoryStore.set(key, serialized)
  }
}

export function clearStoredGameReview(matchId: string, gameId: string): void {
  const key = getReviewStorageKey(matchId, gameId)
  try {
    if (globalThis.window?.localStorage) {
      globalThis.window.localStorage.removeItem(key)
    }
    memoryStore.delete(key)
  } catch {
    memoryStore.delete(key)
  }
}

function createEmptyClassificationCounts() {
  return {
    best: 0,
    blunder: 0,
    brilliant: 0,
    excellent: 0,
    good: 0,
    inaccuracy: 0,
    miss: 0,
    mistake: 0,
    theoretical: 0,
    veryGood: 0,
  } satisfies Record<MoveClassificationType, number>
}

// Standard theoretical opening lines detector (first 6 plies)
const BOOK_OPENINGS = new Set([
  'e4',
  'e5',
  'd4',
  'd5',
  'c4',
  'c5',
  'Nf3',
  'Nc6',
  'Nf6',
  'g3',
  'g6',
  'b3',
  'e6',
  'd6',
])

export async function reviewGame({
  matchId,
  gameId,
  moves,
  depth,
  stockfishClient,
  onProgress,
}: ReviewGameOptions): Promise<GameReviewReport> {
  if (moves.length === 0) {
    return {
      analyzedAt: new Date().toISOString(),
      black: {
        acpl: 0,
        accuracy: 100,
        classificationCounts: createEmptyClassificationCounts(),
        estimatedRating: 1500,
      },
      depth,
      gameId,
      matchId,
      plies: [],
      white: {
        acpl: 0,
        accuracy: 100,
        classificationCounts: createEmptyClassificationCounts(),
        estimatedRating: 1500,
      },
    }
  }

  const chess = new Chess()
  const totalPlies = moves.length
  const plies: PlyReview[] = []

  const whiteLosses: number[] = []
  const blackLosses: number[] = []
  const whiteAccuracies: number[] = []
  const blackAccuracies: number[] = []
  const whiteCounts = createEmptyClassificationCounts()
  const blackCounts = createEmptyClassificationCounts()

  // Evaluate initial starting position
  let previousCp = 20
  let previousBestMove = 'e2e4'
  try {
    const initialEval = await stockfishClient.evaluatePosition(START_FEN, depth)
    previousCp = initialEval.centipawns
    previousBestMove = initialEval.bestMove
  } catch {
    // Graceful default for starting position
  }

  for (let i = 0; i < moves.length; i++) {
    const moveStr = moves[i]
    const ply = i + 1
    const moveNumber = Math.floor(i / 2) + 1
    const turn: 'w' | 'b' = i % 2 === 0 ? 'w' : 'b'

    let moveObj: ReturnType<typeof chess.move> | null = null
    try {
      moveObj = chess.move(moveStr)
    } catch {
      // If move cannot be parsed by chess.js, stop analysis gracefully
      break
    }

    const currentFen = chess.fen()
    let posEval: PositionEvaluation
    try {
      posEval = await stockfishClient.evaluatePosition(currentFen, depth)
    } catch {
      posEval = {
        bestMove: previousBestMove,
        centipawns: previousCp,
        depth,
        fen: currentFen,
        score: { type: 'cp', value: previousCp },
      }
    }
    const currentCp = posEval.centipawns

    const winProb = calculateWinProbability(currentCp)
    const accuracy = calculateMoveAccuracy({
      afterCp: currentCp,
      beforeCp: previousCp,
      turn,
    })

    const cpLoss =
      turn === 'w' ? Math.max(0, previousCp - currentCp) : Math.max(0, currentCp - previousCp)

    const isBook = ply <= 4 && BOOK_OPENINGS.has(moveStr)
    const uciPlayed = moveObj ? `${moveObj.from}${moveObj.to}${moveObj.promotion ?? ''}` : moveStr

    const classification = classifyMove({
      afterCp: currentCp,
      beforeCp: previousCp,
      bestMove: previousBestMove,
      isBook,
      playedMove: uciPlayed,
      ply,
      turn,
    })

    if (turn === 'w') {
      whiteLosses.push(cpLoss)
      whiteAccuracies.push(accuracy)
      whiteCounts[classification]++
    } else {
      blackLosses.push(cpLoss)
      blackAccuracies.push(accuracy)
      blackCounts[classification]++
    }

    plies.push({
      accuracy,
      bestMove: posEval.bestMove,
      centipawns: currentCp,
      classification,
      fen: currentFen,
      moveNumber,
      playedMove: moveStr,
      ply,
      pv: posEval.pv,
      turn,
      winProbability: winProb,
    })

    previousCp = currentCp
    previousBestMove = posEval.bestMove

    if (onProgress) {
      const percentage = Math.round(((i + 1) / totalPlies) * 100)
      onProgress({
        currentPly: i + 1,
        percentage,
        totalPlies,
      })
    }
  }

  const whiteAccuracy = calculateAggregateAccuracy(whiteAccuracies)
  const blackAccuracy = calculateAggregateAccuracy(blackAccuracies)
  const whiteAcpl = calculateAcpl(whiteLosses)
  const blackAcpl = calculateAcpl(blackLosses)

  const whiteRating = estimatePerformanceRating({ acpl: whiteAcpl, accuracy: whiteAccuracy })
  const blackRating = estimatePerformanceRating({ acpl: blackAcpl, accuracy: blackAccuracy })

  const report: GameReviewReport = {
    analyzedAt: new Date().toISOString(),
    black: {
      acpl: blackAcpl,
      accuracy: blackAccuracy,
      classificationCounts: blackCounts,
      estimatedRating: blackRating,
    },
    depth,
    gameId,
    matchId,
    plies,
    white: {
      acpl: whiteAcpl,
      accuracy: whiteAccuracy,
      classificationCounts: whiteCounts,
      estimatedRating: whiteRating,
    },
  }

  storeGameReview(report)
  return report
}
