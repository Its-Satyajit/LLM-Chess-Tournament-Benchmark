import { Elysia } from 'elysia'
import { node } from '@elysiajs/node'
import crosswsNode from 'crossws/adapters/node'
import type { EventData } from '@llm-chess-arena/shared'

// SAFETY: WebSocket connections are managed by ElysiaJS / crossws handler
export interface WsConnection {
  send: (data: string) => void
}

// SAFETY: Global augmentation preserves WebSocket room connections across server module contexts
const globalForWs = globalThis as typeof globalThis & {
  __llm_chess_rooms__?: Map<string, Set<WsConnection>>
  __llm_chess_subscriptions__?: Map<WsConnection, Set<string>>
}

// Store active connections by matchId
export const rooms = globalForWs.__llm_chess_rooms__ ?? new Map<string, Set<WsConnection>>()
globalForWs.__llm_chess_rooms__ = rooms

// Track which rooms each WebSocket is subscribed to
export const wsSubscriptions = globalForWs.__llm_chess_subscriptions__ ?? new Map<WsConnection, Set<string>>()
globalForWs.__llm_chess_subscriptions__ = wsSubscriptions

export function broadcast(matchId: string, event: EventData & { type: string }) {
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

export function handleWsOpen(ws: WsConnection) {
  wsSubscriptions.set(ws, new Set())
}

export interface WsClientMessage {
  matchId?: string
  type?: string
}

export function handleWsMessage(ws: WsConnection, raw: string) {
  let body: WsClientMessage = {}
  try {
    // SAFETY: clients send stringified JSON per the documented protocol
    body = JSON.parse(raw) as WsClientMessage
  } catch {
    ws.send(JSON.stringify({ message: "Invalid JSON", type: "error" }))
    return
  }

  if (body.type === "subscribe" && body.matchId) {
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
      matchId,
      message: `Subscribed to match ${matchId}`,
      type: 'subscribed',
    }))
  } else if (body.type === "unsubscribe" && body.matchId) {
    const matchId = body.matchId
    rooms.get(matchId)?.delete(ws)
    wsSubscriptions.get(ws)?.delete(matchId)

    ws.send(JSON.stringify({
      matchId,
      message: `Unsubscribed from match ${matchId}`,
      type: 'unsubscribed',
    }))
  } else {
    ws.send(JSON.stringify({
      message: 'Unknown message type. Use { type: "subscribe", matchId: "..." }',
      type: 'error',
    }))
  }
}

export function handleWsClose(ws: WsConnection) {
  // Clean up all rooms
  const subs = wsSubscriptions.get(ws)
  if (subs) {
    for (const matchId of subs) {
      rooms.get(matchId)?.delete(ws)
    }
  }
  wsSubscriptions.delete(ws)
}

// Standalone crossws adapter for custom HTTP server upgrade
export const wsHandler = crosswsNode({
  hooks: {
    close(peer) {
      handleWsClose(peer)
    },
    message(peer, message) {
      handleWsMessage(peer, message.text())
    },
    open(peer) {
      handleWsOpen(peer)
    },
  },
})

// The node adapter instance must be SHARED with the root app — a child
// Elysia mounted with its own adapter instance silently drops .ws() routes.
export const nodeAdapter = node()

export const wsRoutes = new Elysia({ adapter: nodeAdapter })
  .ws("/ws", {
    close(ws) {
      handleWsClose(ws)
    },
    message(ws, raw) {
      handleWsMessage(ws, String(raw))
    },
    open(ws) {
      handleWsOpen(ws)
    },
  })

// Helper: broadcast specific event types
export function broadcastStateUpdate(matchId: string, gameId: string, state: EventData) {
  broadcast(matchId, {
    gameId,
    matchId,
    type: 'state_update',
    ...state,
  })
}

export function broadcastMoveMade(matchId: string, gameId: string, move: string, playerId: string, clock: { black: number; white: number }) {
  broadcast(matchId, {
    clock,
    gameId,
    matchId,
    move,
    player: playerId,
    type: 'move_made',
  })
}

export function broadcastMessageSent(matchId: string, gameId: string, sender: string, content: string) {
  broadcast(matchId, {
    content,
    gameId,
    matchId,
    sender,
    type: 'message_sent',
  })
}

export function broadcastDrawOffer(matchId: string, gameId: string, from: string) {
  broadcast(matchId, {
    from,
    gameId,
    matchId,
    type: 'draw_offer',
  })
}

export function broadcastDrawResult(matchId: string, gameId: string, accepted: boolean) {
  broadcast(matchId, {
    accepted,
    gameId,
    matchId,
    type: 'draw_result',
  })
}

export function broadcastGameOver(matchId: string, gameId: string, result: string, reason: string) {
  broadcast(matchId, {
    gameId,
    matchId,
    reason,
    result,
    type: 'game_over',
  })
}

export function broadcastMatchOver(matchId: string, result: string) {
  broadcast(matchId, {
    matchId,
    result,
    type: 'match_over',
  })
}

export function broadcastGameStarted(matchId: string, gameId: string, gameNumber: number, whitePlayerId: string, blackPlayerId: string) {
  broadcast(matchId, {
    blackPlayerId,
    gameId,
    gameNumber,
    matchId,
    type: 'game_started',
    whitePlayerId,
  })
}

export interface EngineWithEvents {
  onEvent: (listener: (event: { data: EventData; eventType: string; gameId: string; matchId: string; playerId: string }) => void) => void
}

export function wireEngineEvents(engine: EngineWithEvents) {
  engine.onEvent((event) => {
    switch (event.eventType) {
      case 'move': {
        // SAFETY: event.data.clock is set by makeMove which always passes { white, black }
        const clock = event.data.clock as { black: number; white: number } | undefined
        // SAFETY: move string is validated by makeMove schema
        const move = (event.data.move as string) || ''
        broadcastMoveMade(
          event.matchId,
          event.gameId,
          move,
          event.playerId,
          clock || { black: 0, white: 0 },
        )
        break
      }
      case 'message': {
        // SAFETY: content string is validated by sendMessage schema
        const content = (event.data.content as string) || ''
        broadcastMessageSent(event.matchId, event.gameId, event.playerId, content)
        break
      }
      case 'draw_offer':
        broadcastDrawOffer(event.matchId, event.gameId, event.playerId)
        break
      case 'draw_accept':
        broadcastDrawResult(event.matchId, event.gameId, true)
        break
      case 'draw_reject':
        broadcastDrawResult(event.matchId, event.gameId, false)
        break
      case 'game_over': {
        // SAFETY: result is generated by chess engine
        const result = (event.data.result as string) || ''
        // SAFETY: reason is generated by chess engine
        const reason = (event.data.reason as string) || ''
        broadcastGameOver(event.matchId, event.gameId, result, reason)
        break
      }
      case 'game_started': {
        // SAFETY: gameNumber is populated by MatchEngine
        const gameNumber = (event.data.gameNumber as number) || 1
        // SAFETY: whitePlayerId is populated by MatchEngine
        const whitePlayerId = (event.data.whitePlayerId as string) || ''
        // SAFETY: blackPlayerId is populated by MatchEngine
        const blackPlayerId = (event.data.blackPlayerId as string) || ''
        broadcastGameStarted(
          event.matchId,
          event.gameId,
          gameNumber,
          whitePlayerId,
          blackPlayerId,
        )
        break
      }
      case 'match_completed': {
        // SAFETY: result is populated by MatchEngine
        const result = (event.data.result as string) || 'Match Finished'
        broadcastMatchOver(event.matchId, result)
        break
      }
    }
  })
}

