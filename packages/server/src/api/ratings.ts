import { Elysia } from 'elysia'
import { database } from '../services/database'

const ratingsRoutes = new Elysia({ prefix: '/api/ratings' })
  .get('/', async () => {
    // Read from SQLite database per spec Story 56
    const dbRatings = await database.getAllRatings()
    const ratings = dbRatings.map(r => ({
      draws: 0,
      losses: 0,
      model: r.model,
      points: r.gamesPlayed,
      provider: r.provider,
      rating: r.rating,
      wins: 0,
    }))
    return { ratings: ratings.sort((a, b) => b.rating - a.rating) }
  })
  .get('/:model', async ({ params }) => {
    const dbRatings = await database.getAllRatings()
    const found = dbRatings.find(r => r.model === params.model)
    if (found) {
      return { draws: 0, losses: 0, model: found.model, points: found.gamesPlayed, provider: found.provider, rating: found.rating, wins: 0 }
    }
    return { error: 'Model not found' }
  })

export default ratingsRoutes
