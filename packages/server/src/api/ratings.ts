import { Elysia } from 'elysia'
import { TournamentManager } from '../tournament'
import { engine } from './match'

const tournamentManager = new TournamentManager(engine),

 ratingsRoutes = new Elysia({ prefix: '/api/ratings' })
  .get('/', () => {
    const tournaments = tournamentManager.listTournaments(),
     modelRatings = new Map<string, {
      model: string
      provider: string
      rating: number
      rd: number
      wins: number
      draws: number
      losses: number
      points: number
    }>()

    for (const tournament of tournaments) {
      const standings = tournamentManager.getStandings(tournament.id)
      for (const standing of standings) {
        const key = `${standing.provider}/${standing.model}`,
         existing = modelRatings.get(key)
        if (!existing) {
          modelRatings.set(key, { ...standing })
        } else {
          existing.rating = Math.max(existing.rating, standing.rating)
          existing.wins += standing.wins
          existing.draws += standing.draws
          existing.losses += standing.losses
          existing.points += standing.points
        }
      }
    }

    return { ratings: [...modelRatings.values()].sort((a, b) => b.points - a.points) }
  })
  .get('/:model', ({ params }) => {
    const tournaments = tournamentManager.listTournaments()
    for (const tournament of tournaments) {
      const standings = tournamentManager.getStandings(tournament.id),
       found = standings.find(s => s.model === params.model)
      if (found) {return found}
    }
    return { error: 'Model not found' }
  })

export default ratingsRoutes
