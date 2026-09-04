import { Elysia, t, status } from 'elysia'
import { database } from '../services/database'

const plySchema = t.Object(
  {
    accuracy: t.Optional(t.Number()),
    bestMove: t.Optional(t.String()),
    centipawns: t.Optional(t.Number()),
    classification: t.Optional(t.String()),
    fen: t.Optional(t.String()),
    move: t.Optional(t.String()),
    moveNumber: t.Optional(t.Number()),
    playedMove: t.Optional(t.String()),
    ply: t.Number(),
    pv: t.Optional(t.Array(t.String())),
    turn: t.Optional(t.String()),
    winProbability: t.Optional(t.Number()),
  },
  { additionalProperties: true },
)

export const benchmarkRoutes = new Elysia()
  .get('/api/benchmark', async () => {
    return database.getBenchmarkMetrics()
  })
  .get('/api/game/:gameId/review', async ({ params }) => {
    const review = await database.getGameReview(params.gameId)
    if (!review) {
      return status(404, { error: 'Game review not found' })
    }
    return {
      ...review,
      black: {
        acpl: 0,
        accuracy: review.blackAccuracy,
        classificationCounts: review.classificationCounts?.black ?? {},
        estimatedRating: review.blackRating ?? 1500,
      },
      white: {
        acpl: 0,
        accuracy: review.whiteAccuracy,
        classificationCounts: review.classificationCounts?.white ?? {},
        estimatedRating: review.whiteRating ?? 1500,
      },
    }
  })
  .post(
    '/api/game/:gameId/review',
    async ({ body, params }) => {
      const id = body.id ?? `rev-${params.gameId}`
      await database.saveGameReview({
        blackAccuracy: body.blackAccuracy,
        blackRating: body.blackRating ?? null,
        classificationCounts: body.classificationCounts,
        depth: body.depth ?? 16,
        gameId: params.gameId,
        id,
        matchId: body.matchId,
        plies: body.plies,
        whiteAccuracy: body.whiteAccuracy,
        whiteRating: body.whiteRating ?? null,
      })
      return { id, saved: true }
    },
    {
      body: t.Object({
        blackAccuracy: t.Number(),
        blackRating: t.Optional(t.Nullable(t.Number())),
        classificationCounts: t.Object({
          black: t.Record(t.String(), t.Number()),
          white: t.Record(t.String(), t.Number()),
        }),
        depth: t.Optional(t.Number()),
        id: t.Optional(t.String()),
        matchId: t.String(),
        plies: t.Array(plySchema),
        whiteAccuracy: t.Number(),
        whiteRating: t.Optional(t.Nullable(t.Number())),
      }),
    },
  )

export default benchmarkRoutes
