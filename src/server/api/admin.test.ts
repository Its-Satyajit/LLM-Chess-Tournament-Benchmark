import { describe, expect, it } from 'vitest'
import { Elysia } from 'elysia'
import adminRoutes from './admin'
import { database } from '../services/database'
import type { MatchConfig } from '../game/MatchEngine'

const app = new Elysia().use(adminRoutes)

interface AdminModel {
  id: string
  name: string
  provider: string
}

interface AdminModelsResponse {
  models: AdminModel[]
}

interface DeleteResponse {
  success: boolean
}

describe('Admin Endpoints & Model Deletion Policy', () => {
  it('DELETE /api/admin/models/:modelId deletes model from available models roster while preserving match history', async () => {
    // 1. Add model via API
    const postRes = await app.handle(
      new Request('http://localhost/api/admin/models', {
        body: JSON.stringify({
          maxOutputTokens: 2048,
          name: 'retirable-chess-bot',
          provider: 'local',
          temperature: 0.7,
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      }),
    )
    expect(postRes.status).toBe(200)
    // SAFETY: Response is JSON produced by POST /api/admin/models
    const added = (await postRes.json()) as AdminModel
    expect(added.id).toBeDefined()
    expect(added.name).toBe('retirable-chess-bot')

    // 2. Create an active match using this model
    const engine = database.getEngine()
    const config: MatchConfig = {
      boardMode: 'assisted',
      playerAModel: { maxOutputTokens: 2048, name: 'retirable-chess-bot', provider: 'local', temperature: 0.7, version: '1.0' },
      playerBModel: { maxOutputTokens: 4096, name: 'gpt-4o', provider: 'openai', temperature: 0.7, version: 'latest' },
      startingPosition: 'standard',
      timeControl: '10+5',
    }
    const match = engine.createMatch(config)
    await database.saveMatch(match)

    // 3. Delete the model via DELETE endpoint
    const deleteRes = await app.handle(
      new Request(`http://localhost/api/admin/models/${added.id}`, {
        method: 'DELETE',
      }),
    )
    expect(deleteRes.status).toBe(200)
    // SAFETY: Response is JSON produced by DELETE /api/admin/models/:id
    const deleteBody = (await deleteRes.json()) as DeleteResponse
    expect(deleteBody.success).toBe(true)

    // 4. Verify model is removed from available models list
    const getRes = await app.handle(new Request('http://localhost/api/admin/models'))
    expect(getRes.status).toBe(200)
    // SAFETY: Response is JSON produced by GET /api/admin/models
    const getBody = (await getRes.json()) as AdminModelsResponse
    expect(getBody.models.some((m) => m.id === added.id)).toBe(false)

    // 5. Verify match history remains intact
    const allMatches = await database.listMatchesWithGames()
    const found = allMatches.find((m) => m.match.id === match.id)
    expect(found).toBeDefined()
    expect(found?.match.playerAModel.name).toBe('retirable-chess-bot')
  })
})
