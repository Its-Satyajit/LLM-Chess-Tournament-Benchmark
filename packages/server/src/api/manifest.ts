import { Elysia } from 'elysia'
import { engine } from './match'
import { getPromptHash } from '../prompt'
import { BENCHMARK_VERSION, MANIFEST_VERSION, PROMPT_VERSION, RULES_VERSION } from '@llm-chess-arena/shared'

const manifestRoutes = new Elysia({ prefix: '/api/match' })
  .get('/:matchId/manifest', ({ params }) => {
    const match = engine.getMatch(params.matchId)
    if (!match) {return { error: 'Match not found' }}

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
        boardMode: match.boardMode,
        chess960Seed: null,
        startingPosition: match.startingPosition,
        timeControl: match.timeControl,
      },
      players: {
        a: { modelConfig: match.playerAModel, playerId: match.playerAId },
        b: { modelConfig: match.playerBModel, playerId: match.playerBId },
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
        chess960Seed: null,
        matchSeed: Date.now(),
      },
    }
  })

export default manifestRoutes
