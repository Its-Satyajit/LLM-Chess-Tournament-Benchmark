export interface UciScore {
  type: 'cp' | 'mate'
  value: number
}

export interface UciInfo {
  depth: number
  score?: UciScore
  nodes?: number
  time?: number
  pv?: string[]
}

export interface UciBestMove {
  bestMove: string
  ponder?: string
}

export function scoreToCentipawns(score: UciScore): number {
  if (score.type === 'cp') {
    return score.value
  }

  // Mate score conversion: mate in N plies
  // value > 0 means engine is mating (win)
  // value < 0 means engine is being mated (loss)
  if (score.value > 0) {
    return Math.max(1000, 10000 - (score.value - 1) * 100)
  }
  return Math.min(-1000, -10000 - (score.value + 1) * 100)
}

export function parseUciInfoLine(line: string): UciInfo | null {
  const trimmed = line.trim()
  if (!trimmed.startsWith('info ')) {
    return null
  }

  const tokens = trimmed.split(/\s+/)
  const info: UciInfo = { depth: 0 }

  for (let i = 1; i < tokens.length; i++) {
    const token = tokens[i]

    if (token === 'depth' && tokens[i + 1] !== undefined) {
      info.depth = Number.parseInt(tokens[++i], 10)
    } else if (token === 'nodes' && tokens[i + 1] !== undefined) {
      info.nodes = Number.parseInt(tokens[++i], 10)
    } else if (token === 'time' && tokens[i + 1] !== undefined) {
      info.time = Number.parseInt(tokens[++i], 10)
    } else if (token === 'score') {
      const type = tokens[++i]
      const valueStr = tokens[++i]
      if ((type === 'cp' || type === 'mate') && valueStr !== undefined) {
        info.score = {
          type,
          value: Number.parseInt(valueStr, 10),
        }
      }
    } else if (token === 'pv') {
      info.pv = tokens.slice(i + 1)
      break
    }
  }

  return info
}

export function parseBestMoveLine(line: string): UciBestMove | null {
  const trimmed = line.trim()
  if (!trimmed.startsWith('bestmove ')) {
    return null
  }

  const tokens = trimmed.split(/\s+/)
  const bestMove = tokens[1]
  if (!bestMove) return null

  let ponder: string | undefined
  const ponderIndex = tokens.indexOf('ponder')
  if (ponderIndex !== -1 && tokens[ponderIndex + 1]) {
    ponder = tokens[ponderIndex + 1]
  }

  return { bestMove, ponder }
}
