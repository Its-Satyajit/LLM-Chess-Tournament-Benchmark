import { Elysia, t } from 'elysia'

// Store active connections by matchId
const rooms = new Map<string, Set<any>>()
// Track which rooms each WebSocket is subscribed to
const wsSubscriptions = new Map<any, Set<string>>()

export function broadcast(matchId: string, event: Record<string, unknown>) {
  const clients = rooms.get(matchId)
  if (!clients) return

  const message = JSON.stringify(event)
  for (const ws of clients) {
    try {
      ws.send(message)
    } catch {
      clients.delete(ws)
    }
  }
}

export function getClientCount(matchId: string): number {
  return rooms.get(matchId)?.size ?? 0
}

export const wsRoutes = new Elysia()
  .ws('/ws', {
    body: t.Object({
      type: t.String(),
      matchId: t.Optional(t.String()),
    }),
    open(ws) {
      wsSubscriptions.set(ws, new Set())
    },
    message(ws, body) {
      if (body.type === 'subscribe' && body.matchId) {
        const matchId = body.matchId
        const subs = wsSubscriptions.get(ws) || new Set()

        // Leave all current rooms
        for (const oldMatchId of subs) {
          rooms.get(oldMatchId)?.delete(ws)
        }
        subs.clear()

        // Join new room
        if (!rooms.has(matchId)) {
          rooms.set(matchId, new Set())
        }
        rooms.get(matchId)!.add(ws)
        subs.add(matchId)
        wsSubscriptions.set(ws, subs)

        ws.send(JSON.stringify({
          type: 'subscribed',
          matchId,
          message: `Subscribed to match ${matchId}`,
        }))
      } else if (body.type === 'unsubscribe' && body.matchId) {
        const matchId = body.matchId
        rooms.get(matchId)?.delete(ws)
        wsSubscriptions.get(ws)?.delete(matchId)

        ws.send(JSON.stringify({
          type: 'unsubscribed',
          matchId,
          message: `Unsubscribed from match ${matchId}`,
        }))
      } else {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Unknown message type. Use { type: "subscribe", matchId: "..." }',
        }))
      }
    },
    close(ws) {
      // Clean up all rooms
      const subs = wsSubscriptions.get(ws)
      if (subs) {
        for (const matchId of subs) {
          rooms.get(matchId)?.delete(ws)
        }
      }
      wsSubscriptions.delete(ws)
    },
  })

// Helper: broadcast specific event types
export function broadcastStateUpdate(matchId: string, gameId: string, state: Record<string, unknown>) {
  broadcast(matchId, {
    type: 'state_update',
    matchId,
    gameId,
    ...state,
  })
}

export function broadcastMoveMade(matchId: string, gameId: string, move: string, playerId: string, clock: { white: number; black: number }) {
  broadcast(matchId, {
    type: 'move_made',
    matchId,
    gameId,
    move,
    player: playerId,
    clock,
  })
}

export function broadcastMessageSent(matchId: string, gameId: string, sender: string, content: string) {
  broadcast(matchId, {
    type: 'message_sent',
    matchId,
    gameId,
    sender,
    content,
  })
}

export function broadcastDrawOffer(matchId: string, gameId: string, from: string) {
  broadcast(matchId, {
    type: 'draw_offer',
    matchId,
    gameId,
    from,
  })
}

export function broadcastDrawResult(matchId: string, gameId: string, accepted: boolean) {
  broadcast(matchId, {
    type: 'draw_result',
    matchId,
    gameId,
    accepted,
  })
}

export function broadcastGameOver(matchId: string, gameId: string, result: string, reason: string) {
  broadcast(matchId, {
    type: 'game_over',
    matchId,
    gameId,
    result,
    reason,
  })
}

export function broadcastMatchOver(matchId: string, result: string) {
  broadcast(matchId, {
    type: 'match_over',
    matchId,
    result,
  })
}
