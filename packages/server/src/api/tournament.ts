import { Elysia, t } from 'elysia'
import { TournamentManager } from '../tournament'
import { engine } from './match'
import { DatabaseService } from '../services/database'

const database = new DatabaseService(),
 tournamentManager = new TournamentManager(engine),

 tournamentRoutes = new Elysia({ prefix: '/api/tournament' })
  .post('/create', ({ body }) => {
    const tournament = tournamentManager.createTournament({
      format: (body.format || 'round_robin') as 'round_robin' | 'swiss' | 'knockout',
      models: body.models,
      name: body.name,
    })
    return {
      format: tournament.format,
      id: tournament.id,
      name: tournament.name,
      pairings: tournament.pairings.length,
    }
  }, {
    body: t.Object({
      format: t.Optional(t.String()),
      models: t.Array(t.Object({
        name: t.String(),
        provider: t.String(),
        config: t.Object({
          provider: t.String(),
          name: t.String(),
          version: t.String(),
          temperature: t.Number(),
          maxOutputTokens: t.Number(),
        }),
      })),
      name: t.String(),
    })
  })
  .get('/', () => {
    const tournaments = tournamentManager.listTournaments()
    return {
      tournaments: tournaments.map(t => ({
        format: t.format,
        id: t.id,
        models: t.models.length,
        name: t.name,
        pairings: t.pairings.length,
        status: t.status,
      })),
    }
  })
  .get('/:tournamentId', ({ params }) => {
    const tournament = tournamentManager.getTournament(params.tournamentId)
    if (!tournament) {return { error: 'Tournament not found' }}

    return {
      format: tournament.format,
      id: tournament.id,
      models: tournament.models.map(m => ({
        name: m.name,
        provider: m.provider,
      })),
      name: tournament.name,
      pairings: tournament.pairings.map(p => ({
        id: p.id,
        modelA: tournament.models[p.modelAIndex].name,
        modelB: tournament.models[p.modelBIndex].name,
        status: p.status,
        result: p.result,
      })),
      status: tournament.status,
    }
  })
  .get('/:tournamentId/standings', ({ params }) => (
    { standings: tournamentManager.getStandings(params.tournamentId) }
  ))
  .post('/:tournamentId/start', ({ params }) => {
    const result = tournamentManager.startPairing(params.tournamentId)
    if (!result) {return { error: 'No pending pairings' }}
    return result
  })
  .post('/:tournamentId/complete/:pairingId', async ({ params, body }) => {
    tournamentManager.completePairing(
      params.tournamentId,
      params.pairingId,
      body.result
    )

    // Persist updated ratings
    const tournament = tournamentManager.getTournament(params.tournamentId)
    if (tournament) {
      for (const m of tournament.models) {
        await database.saveRating(m.name, m.provider, m.rating)
      }
    }

    return { success: true }
  }, {
    body: t.Object({
      result: t.Object({
        draws: t.Number(),
        modelAWins: t.Number(),
        modelBWins: t.Number(),
      }),
    })
  })

export default tournamentRoutes
