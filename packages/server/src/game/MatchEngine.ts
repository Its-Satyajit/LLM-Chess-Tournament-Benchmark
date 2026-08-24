import { ChessGame, GameState, GameResult } from '../chess/ChessGame'
import { ModelConfig } from '@llm-chess-arena/shared'
import { randomBytes } from 'crypto'

// Types
export interface MatchConfig {
  playerAModel: ModelConfig
  playerBModel: ModelConfig
  timeControl: string
  startingPosition: 'standard' | 'chess960'
  boardMode: 'pure' | 'assisted'
}

export interface Match {
  id: string
  playerAId: string
  playerBId: string
  playerAModel: ModelConfig
  playerBModel: ModelConfig
  status: 'active' | 'completed'
  timeControl: string
  startingPosition: 'standard' | 'chess960'
  boardMode: 'pure' | 'assisted'
  games: Game[]
  currentGameIndex: number
  createdAt: Date
}

export interface Game {
  id: string
  matchId: string
  gameNumber: number
  whitePlayerId: string
  blackPlayerId: string
  status: 'pending' | 'active' | 'completed'
  result: GameResult | null
  fenInitial: string
  fenFinal: string | null
  moveCount: number
  moves: string[]
  messages: Message[]
  chessGame: ChessGame
  clock: ClockManager
  drawOfferPending: string | null // player ID who offered
  drawOfferCooldown: number // moves remaining before can offer again
  createdAt: Date
  completedAt: Date | null
}

export interface Message {
  id: string
  sender: string // player ID
  content: string
  timestamp: Date
}

export interface MoveResult {
  accepted: boolean
  move?: string
  nextTurn?: 'white' | 'black'
  error?: string
  isGameOver?: boolean
  result?: GameResult
}

export interface GameStateResponse {
  fen: string
  turn: 'white' | 'black'
  legalMoves?: string[]
  history: string[]
  clock: {
    white: number
    black: number
  }
  isCheck: boolean
  isCheckmate: boolean
  isStalemate: boolean
  isDraw: boolean
  isGameOver: boolean
}

// Clock Manager
export class ClockManager {
  private whiteTime: number // seconds
  private blackTime: number // seconds
  private increment: number // seconds
  private turnStartTime: number | null = null
  private currentTurn: 'white' | 'black' | null = null

  constructor(timeControl: string) {
    const [base, inc] = timeControl.split('+').map(Number)
    this.whiteTime = base * 60
    this.blackTime = base * 60
    this.increment = inc
  }

  startTurn(color: 'white' | 'black'): void {
    this.currentTurn = color
    this.turnStartTime = Date.now()
  }

  endTurn(color: 'white' | 'black'): void {
    if (this.turnStartTime && this.currentTurn === color) {
      const elapsed = (Date.now() - this.turnStartTime) / 1000
      if (color === 'white') {
        this.whiteTime = Math.max(0, this.whiteTime - elapsed + this.increment)
      } else {
        this.blackTime = Math.max(0, this.blackTime - elapsed + this.increment)
      }
    }
    this.turnStartTime = null
    this.currentTurn = null
  }

  getWhiteTime(): number {
    return Math.ceil(this.whiteTime)
  }

  getBlackTime(): number {
    return Math.ceil(this.blackTime)
  }

  isFlagFall(color: 'white' | 'black'): boolean {
    return color === 'white' ? this.whiteTime <= 0 : this.blackTime <= 0
  }

  pause(): void {
    if (this.turnStartTime && this.currentTurn) {
      const elapsed = (Date.now() - this.turnStartTime) / 1000
      if (this.currentTurn === 'white') {
        this.whiteTime = Math.max(0, this.whiteTime - elapsed)
      } else {
        this.blackTime = Math.max(0, this.blackTime - elapsed)
      }
    }
    this.turnStartTime = null
    this.currentTurn = null
  }
}

// Match Engine
export class MatchEngine {
  private matches: Map<string, Match> = new Map()
  private games: Map<string, Game> = new Map()
  private events: Array<{
    matchId: string
    gameId: string
    eventType: string
    playerId: string
    data: Record<string, unknown>
    timestamp: Date
  }> = []

  createMatch(config: MatchConfig): Match {
    const matchId = `MATCH-${Date.now()}-${randomBytes(3).toString('hex').toUpperCase()}`
    const playerAId = `P-${randomBytes(3).toString('hex').toUpperCase()}`
    const playerBId = `P-${randomBytes(3).toString('hex').toUpperCase()}`

    const games: Game[] = []
    for (let i = 0; i < 4; i++) {
      const gameId = `GAME-${Date.now()}-${i}-${randomBytes(3).toString('hex').toUpperCase()}`
      const isChess960 = i >= 2
      const isWhiteTurn = i % 2 === 0
      
      const whitePlayerId = isWhiteTurn ? playerAId : playerBId
      const blackPlayerId = isWhiteTurn ? playerBId : playerAId
      
      let chessGame: ChessGame
      if (isChess960) {
        chessGame = ChessGame.fromChess960Seed(Date.now() + i)
      } else {
        chessGame = new ChessGame()
      }
      
      const game: Game = {
        id: gameId,
        matchId,
        gameNumber: i + 1,
        whitePlayerId,
        blackPlayerId,
        status: i === 0 ? 'active' : 'pending',
        result: null,
        fenInitial: chessGame.getGameState().fen,
        fenFinal: null,
        moveCount: 0,
        moves: [],
        messages: [],
        chessGame,
        clock: new ClockManager(config.timeControl),
        drawOfferPending: null,
        drawOfferCooldown: 0,
        createdAt: new Date(),
        completedAt: null,
      }
      
      games.push(game)
      this.games.set(gameId, game)
    }

    const match: Match = {
      id: matchId,
      playerAId,
      playerBId,
      playerAModel: config.playerAModel,
      playerBModel: config.playerBModel,
      status: 'active',
      timeControl: config.timeControl,
      startingPosition: config.startingPosition,
      boardMode: config.boardMode,
      games,
      currentGameIndex: 0,
      createdAt: new Date(),
    }

    this.matches.set(matchId, match)
    
    // Log match creation event
    this.logEvent(matchId, games[0].id, 'match_created', 'system', {
      playerAId,
      playerBId,
      timeControl: config.timeControl,
      startingPosition: config.startingPosition,
    })

    return match
  }

  getMatch(matchId: string): Match | undefined {
    return this.matches.get(matchId)
  }

  getCurrentGame(matchId: string): Game | undefined {
    const match = this.matches.get(matchId)
    if (!match) return undefined
    return match.games[match.currentGameIndex]
  }

  getGameState(matchId: string, gameId: string): GameStateResponse {
    const game = this.games.get(gameId)
    if (!game) throw new Error('Game not found')
    
    const state = game.chessGame.getGameState()
    const legalMoves = game.chessGame.getLegalMoves()
    
    return {
      fen: state.fen,
      turn: state.turn,
      legalMoves,
      history: state.history,
      clock: {
        white: game.clock.getWhiteTime(),
        black: game.clock.getBlackTime(),
      },
      isCheck: state.isCheck,
      isCheckmate: state.isCheckmate,
      isStalemate: state.isStalemate,
      isDraw: state.isDraw,
      isGameOver: state.isGameOver,
    }
  }

  makeMove(matchId: string, gameId: string, playerId: string, move: string): MoveResult {
    const match = this.matches.get(matchId)
    if (!match) return { accepted: false, error: 'MATCH_NOT_FOUND' }
    
    const game = this.games.get(gameId)
    if (!game) return { accepted: false, error: 'GAME_NOT_FOUND' }
    
    if (game.status !== 'active') return { accepted: false, error: 'GAME_NOT_ACTIVE' }
    
    // Check if it's the player's turn
    const currentTurn = game.chessGame.getGameState().turn
    const isWhiteTurn = currentTurn === 'white'
    const expectedPlayer = isWhiteTurn ? game.whitePlayerId : game.blackPlayerId
    
    if (playerId !== expectedPlayer) {
      return { accepted: false, error: 'NOT_YOUR_TURN' }
    }
    
    // Start clock
    game.clock.startTurn(currentTurn)
    
    // Make the move
    const result = game.chessGame.makeMove(move)
    
    // End clock
    game.clock.endTurn(currentTurn)
    
    if (result.accepted) {
      game.moveCount++
      game.moves.push(move)
      
      // Log move event
      this.logEvent(matchId, gameId, 'move', playerId, {
        move,
        fen: game.chessGame.getGameState().fen,
      })
      
      // Clear draw offer cooldown if moves were made
      if (game.drawOfferCooldown > 0) {
        game.drawOfferCooldown--
      }
      
      // Check if game is over
      if (result.isGameOver) {
        game.status = 'completed'
        game.result = result.result || null
        game.fenFinal = game.chessGame.getGameState().fen
        game.completedAt = new Date()
        
        // Log game over event
        this.logEvent(matchId, gameId, 'game_over', 'system', {
          result: result.result,
        })
        
        // Move to next game
        match.currentGameIndex++
        if (match.currentGameIndex >= 4) {
          match.status = 'completed'
          this.logEvent(matchId, gameId, 'match_completed', 'system', {})
        } else {
          match.games[match.currentGameIndex].status = 'active'
          // Start clock for first player of next game
          const nextGame = match.games[match.currentGameIndex]
          nextGame.clock.startTurn('white')
        }
      }
    }
    
    return result
  }

  sendMessage(matchId: string, gameId: string, playerId: string, content: string): { sent: boolean; messageId?: string } {
    const game = this.games.get(gameId)
    if (!game) return { sent: false }
    
    const messageId = `MSG-${Date.now()}-${randomBytes(3).toString('hex').toUpperCase()}`
    
    const message: Message = {
      id: messageId,
      sender: playerId,
      content,
      timestamp: new Date(),
    }
    
    game.messages.push(message)
    
    // Log message event
    this.logEvent(matchId, gameId, 'message', playerId, {
      messageId,
      content,
    })
    
    return { sent: true, messageId }
  }

  getMessages(matchId: string, gameId: string, playerId: string): Array<{ sender: string; content: string; timestamp: Date }> {
    const game = this.games.get(gameId)
    if (!game) return []
    
    return game.messages
      .filter(m => m.sender !== playerId)
      .map(m => ({
        sender: 'opponent',
        content: m.content,
        timestamp: m.timestamp,
      }))
  }

  offerDraw(matchId: string, gameId: string, playerId: string): { sent: boolean } {
    const game = this.games.get(gameId)
    if (!game) return { sent: false }
    
    if (game.drawOfferCooldown > 0) {
      return { sent: false }
    }
    
    game.drawOfferPending = playerId
    
    // Log draw offer event
    this.logEvent(matchId, gameId, 'draw_offer', playerId, {})
    
    return { sent: true }
  }

  acceptDraw(matchId: string, gameId: string, playerId: string): { accepted: boolean } {
    const game = this.games.get(gameId)
    if (!game) return { accepted: false }
    
    if (!game.drawOfferPending || game.drawOfferPending === playerId) {
      return { accepted: false }
    }
    
    // Accept the draw
    game.status = 'completed'
    game.result = { winner: null, reason: 'draw_offer' }
    game.fenFinal = game.chessGame.getGameState().fen
    game.completedAt = new Date()
    game.drawOfferPending = null
    
    // Log draw accept event
    this.logEvent(matchId, gameId, 'draw_accept', playerId, {})
    
    // Move to next game
    const match = this.matches.get(matchId)
    if (match) {
      match.currentGameIndex++
      if (match.currentGameIndex >= 4) {
        match.status = 'completed'
        this.logEvent(matchId, gameId, 'match_completed', 'system', {})
      } else {
        match.games[match.currentGameIndex].status = 'active'
        match.games[match.currentGameIndex].clock.startTurn('white')
      }
    }
    
    return { accepted: true }
  }

  resign(matchId: string, gameId: string, playerId: string): { resigned: boolean } {
    const game = this.games.get(gameId)
    if (!game) return { resigned: false }
    
    const isWhite = playerId === game.whitePlayerId
    game.status = 'completed'
    game.result = {
      winner: isWhite ? 'black' : 'white',
      reason: 'resign',
    }
    game.fenFinal = game.chessGame.getGameState().fen
    game.completedAt = new Date()
    
    // Log resign event
    this.logEvent(matchId, gameId, 'resign', playerId, {})
    
    // Move to next game
    const match = this.matches.get(matchId)
    if (match) {
      match.currentGameIndex++
      if (match.currentGameIndex >= 4) {
        match.status = 'completed'
        this.logEvent(matchId, gameId, 'match_completed', 'system', {})
      } else {
        match.games[match.currentGameIndex].status = 'active'
        match.games[match.currentGameIndex].clock.startTurn('white')
      }
    }
    
    return { resigned: true }
  }

  private logEvent(matchId: string, gameId: string, eventType: string, playerId: string, data: Record<string, unknown>): void {
    this.events.push({
      matchId,
      gameId,
      eventType,
      playerId,
      data,
      timestamp: new Date(),
    })
  }

  getEvents(matchId: string): typeof this.events {
    return this.events.filter(e => e.matchId === matchId)
  }
}
