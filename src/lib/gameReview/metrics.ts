export type MoveClassificationType =
  | 'brilliant'
  | 'veryGood'
  | 'best'
  | 'excellent'
  | 'good'
  | 'theoretical'
  | 'inaccuracy'
  | 'mistake'
  | 'miss'
  | 'blunder'

export interface ClassificationMeta {
  tournament: string
  streamer: string
  color: string
  badgeBg: string
  badgeText: string
  description: string
}

export const MOVE_CLASSIFICATIONS = {
  best: {
    badgeBg: 'bg-emerald-500/20 border-emerald-500/40',
    badgeText: 'text-emerald-400',
    color: '#10b981',
    description: 'The engine top move or equivalent',
    streamer: 'Best',
    tournament: 'Best Move',
  },
  blunder: {
    badgeBg: 'bg-rose-500/25 border-rose-500/50',
    badgeText: 'text-rose-400',
    color: '#f43f5e',
    description: 'A major blunder compromising the game',
    streamer: 'Clown',
    tournament: 'Blunder',
  },
  brilliant: {
    badgeBg: 'bg-cyan-500/20 border-cyan-500/40',
    badgeText: 'text-cyan-400',
    color: '#06b6d4',
    description: 'A decisive sacrifice or sole winning tactic',
    streamer: 'Sigma',
    tournament: 'Brilliant Move',
  },
  excellent: {
    badgeBg: 'bg-teal-500/20 border-teal-500/40',
    badgeText: 'text-teal-300',
    color: '#14b8a6',
    description: 'A strong move maintaining the position',
    streamer: 'Nice',
    tournament: 'Excellent Move',
  },
  good: {
    badgeBg: 'bg-blue-500/20 border-blue-500/40',
    badgeText: 'text-blue-300',
    color: '#3b82f6',
    description: 'A solid, playable move',
    streamer: 'Ok',
    tournament: 'Good Move',
  },
  inaccuracy: {
    badgeBg: 'bg-amber-500/20 border-amber-500/40',
    badgeText: 'text-amber-300',
    color: '#f59e0b',
    description: 'A small slip allowing opponent chances',
    streamer: 'Strange',
    tournament: 'Inaccuracy',
  },
  miss: {
    badgeBg: 'bg-orange-500/25 border-orange-500/50',
    badgeText: 'text-orange-400',
    color: '#f97316',
    description: 'Missed a winning tactical opportunity',
    streamer: 'Miss',
    tournament: 'Miss',
  },
  mistake: {
    badgeBg: 'bg-red-500/20 border-red-500/40',
    badgeText: 'text-red-400',
    color: '#ef4444',
    description: 'A noticeable mistake damaging advantage',
    streamer: 'Bad',
    tournament: 'Mistake',
  },
  theoretical: {
    badgeBg: 'bg-violet-500/20 border-violet-500/40',
    badgeText: 'text-violet-300',
    color: '#8b5cf6',
    description: 'Standard opening book theory',
    streamer: 'Theoretical',
    tournament: 'Theoretical Move',
  },
  veryGood: {
    badgeBg: 'bg-lime-500/20 border-lime-500/40',
    badgeText: 'text-lime-300',
    color: '#84cc16',
    description: 'An awesome alternative to the best move',
    streamer: 'Awesome',
    tournament: 'Very Good Move',
  },
} satisfies Record<MoveClassificationType, ClassificationMeta>

export function getClassificationLabel(
  classification: MoveClassificationType,
  mode: 'tournament' | 'streamer',
): string {
  const meta = MOVE_CLASSIFICATIONS[classification]
  return mode === 'streamer' ? meta.streamer : meta.tournament
}

export function calculateWinProbability(cp: number): number {
  // Lichess / Chess.com standard sigmoid curve
  return 50 + 50 * Math.tanh(0.00368208 * cp)
}

export interface MoveAccuracyInput {
  beforeCp: number
  afterCp: number
  turn: 'w' | 'b'
}

export function calculateMoveAccuracy({ beforeCp, afterCp, turn }: MoveAccuracyInput): number {
  const winBeforeWhite = calculateWinProbability(beforeCp)
  const winAfterWhite = calculateWinProbability(afterCp)

  const winBefore = turn === 'w' ? winBeforeWhite : 100 - winBeforeWhite
  const winAfter = turn === 'w' ? winAfterWhite : 100 - winAfterWhite

  const winLoss = Math.max(0, winBefore - winAfter)

  if (winLoss <= 0) {
    return 100
  }

  // CAPS accuracy model
  const rawAcc = 103.1668 * Math.exp(-0.04354 * winLoss) - 3.1669
  return Math.max(0, Math.min(100, Math.round(rawAcc * 10) / 10))
}

export function calculateAggregateAccuracy(accuracies: number[]): number {
  if (accuracies.length === 0) return 100

  // Harmonic mean penalizes blunder spikes realistically
  let reciprocalSum = 0
  for (const acc of accuracies) {
    reciprocalSum += 1 / Math.max(1, acc)
  }

  const harmonic = accuracies.length / reciprocalSum
  return Math.max(0, Math.min(100, Math.round(harmonic * 10) / 10))
}

export interface ClassifyMoveInput {
  beforeCp: number
  afterCp: number
  turn: 'w' | 'b'
  bestMove: string
  playedMove: string
  ply: number
  isBook?: boolean
  isSacrifice?: boolean
}

export function classifyMove({
  beforeCp,
  afterCp,
  turn,
  bestMove,
  playedMove,
  isBook,
  isSacrifice,
}: ClassifyMoveInput): MoveClassificationType {
  if (isBook) {
    return 'theoretical'
  }

  const cpLoss = turn === 'w' ? Math.max(0, beforeCp - afterCp) : Math.max(0, afterCp - beforeCp)

  const winBeforeWhite = calculateWinProbability(beforeCp)
  const winAfterWhite = calculateWinProbability(afterCp)

  const winBefore = turn === 'w' ? winBeforeWhite : 100 - winBeforeWhite
  const winAfter = turn === 'w' ? winAfterWhite : 100 - winAfterWhite
  const winLoss = Math.max(0, winBefore - winAfter)

  // Brilliant move: material sacrifice that maintains winning advantage
  if (isSacrifice && winAfter >= 60 && cpLoss <= 30) {
    return 'brilliant'
  }

  // Exact match with top recommended move
  if (playedMove && bestMove && playedMove === bestMove) {
    return 'best'
  }

  // Miss: missed a clearly winning opportunity
  if (winBefore >= 75 && winLoss >= 25 && cpLoss >= 150) {
    return 'miss'
  }

  // Blunder
  if (cpLoss > 300 || winLoss >= 35) {
    return 'blunder'
  }

  // Mistake
  if (cpLoss > 175 || winLoss >= 20) {
    return 'mistake'
  }

  // Inaccuracy
  if (cpLoss > 90 || winLoss >= 10) {
    return 'inaccuracy'
  }

  // Good move
  if (cpLoss > 50) {
    return 'good'
  }

  // Excellent move
  if (cpLoss > 25) {
    return 'excellent'
  }

  // Very Good move
  if (cpLoss >= 10) {
    return 'veryGood'
  }

  // Best move (< 10 cp loss or matches top move)
  return 'best'
}

export function calculateAcpl(centipawnLosses: number[]): number {
  if (centipawnLosses.length === 0) return 0
  const sum = centipawnLosses.reduce((acc, val) => acc + val, 0)
  return Math.round((sum / centipawnLosses.length) * 10) / 10
}

export interface PerformanceRatingInput {
  accuracy: number
  acpl: number
}

export function estimatePerformanceRating({ accuracy, acpl }: PerformanceRatingInput): number {
  // Empirical rating estimator mapping accuracy and ACPL to performance ELO (600–2900+)
  const base = 400 + accuracy * 24 - acpl * 4
  return Math.max(600, Math.min(2950, Math.round(base / 10) * 10))
}
