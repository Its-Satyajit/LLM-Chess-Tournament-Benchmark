import { BENCHMARK_VERSION, MANIFEST_VERSION, PROMPT_VERSION, RULES_VERSION } from '@llm-chess-arena/shared'
import { Elysia } from 'elysia'
import { engine } from './match'
import { getPromptHash } from '../prompt'

const manifestRoutes = new Elysia({ prefix: '/api/match' })
  .get('/:matchId/manifest', ({ params }) => {
    const match = engine.getMatch(params.matchId)
    if (!match) { return { error: 'Match not found' } }

    const { boardMode, playerAModel, playerAId, playerBModel, playerBId, startingPosition, timeControl } = match

    return {
      benchmarkVersion: BENCHMARK_VERSION,
      environment: {
        nodeVersion: process.version,
        serverVersion: BENCHMARK_VERSION,
        timestamp: new Date().toISOString(),
      },
      manifestVersion: MANIFEST_VERSION,
      matchId: match.id,
      parameters: {
        boardMode,
        chess960Seed: match.chess960Seed,
        startingPosition,
        timeControl,
      },
      players: {
        playerA: { modelConfig: playerAModel, playerId: playerAId },
        playerB: { modelConfig: playerBModel, playerId: playerBId },
      },
      prompt: {
        templateHash: getPromptHash(),
        version: PROMPT_VERSION,
      },
      rules: {
        communication: 'optional',
        deceptionAllowed: true,
        drawRules: 'mutual_agreement',
        errorHandling: 'retry_within_time',
        version: RULES_VERSION,
      },
      seeds: {
        chess960Seed: match.chess960Seed,
        matchSeed: Date.now(),
      },
    }
  })

export default manifestRoutes
