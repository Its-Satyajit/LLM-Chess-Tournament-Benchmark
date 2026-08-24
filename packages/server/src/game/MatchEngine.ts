import type { GameResult } from '../chess/ChessGame';
import { ChessGame } from '../chess/ChessGame'
import type { EventData, ModelConfig } from '@llm-chess-arena/shared'
import { LIMITS } from '@llm-chess-arena/shared'
import { randomBytes } from 'crypto'
import { Chess } from 'chess.js'

// Types
export interface MatchConfig {
  playerAModel: ModelConfig
  playerBModel: ModelConfig
  timeControl: string
  startingPosition: 'standard' | 'chess960'
  boardMode: 'pure' | 'assisted'
  isPrivate?: boolean
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
  chess960Seed: number | null
  games: Game[]
  currentGameIndex: number
  createdAt: Date
  completedAt: Date | null
  isPrivate: boolean
}

// Blunder/tactical analysis over replayed game history (ADR-017)
export interface GameAnalysis {
  blunders: number
  tacticalBlunders: number
  tacticalMoves: number
}

export interface Game {
  id: string
  matchId: string
  gameNumber: number
  whitePlayerId: string
  blackPlayerId: string
  // Story 33: Fresh IDs per game for prompt display (LLM sees different identity each game)
  displayPlayerAId: string
  displayPlayerBId: string
  status: 'pending' | 'active' | 'completed'
  result: GameResult | null
  fenInitial: string
  fenFinal: string | null
  moveCount: number
  moves: string[]
  messages: Message[]
  chessGame: ChessGame
  clock: ClockManager
  drawOfferPending: string | null // Player ID who offered
  drawOfferCooldown: number // Moves remaining before can offer again
  createdAt: Date
  completedAt: Date | null
  // Token & API budget tracking
  apiCallsThisTurn: { white: number; black: number }
  apiCallsThisGame: { white: number; black: number }
  tokensThisMove: { white: number; black: number }
  tokensThisGame: { white: number; black: number }
}

export interface Message {
  id: string
  sender: string // Player ID
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
  clock: { black?: number; white?: number }
  fen: string
  history: string[]
  isCheck: boolean
  isCheckmate: boolean
  isDraw: boolean
  isGameOver: boolean
  isStalemate: boolean
  legalMoves?: string[]
  turn: 'white' | 'black'
}

const RESET_PERIOD_MS = 30_000 // 30 seconds between games

// Clock Manager
export class ClockManager {
  private whiteTime: number // Seconds
  private blackTime: number // Seconds
  private increment: number // Seconds
  private turnStartTime: number | null = null
  private currentTurn: 'white' | 'black' | null = null
  private running = false
  resetEndTime: number | null = null // When the 30s reset period ends

  constructor(timeControl: string) {
    const [base, inc] = timeControl.split('+').map(Number)
    this.whiteTime = base * 60
    this.blackTime = base * 60
    this.increment = inc
  }

  startTurn(color: 'white' | 'black'): void {
    this.currentTurn = color
    this.turnStartTime = Date.now()
    this.running = true
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
    this.running = false
  }

  getWhiteTime(): number {
    // If currently running, compute live time
    if (this.running && this.turnStartTime && this.currentTurn === 'white') {
      const elapsed = (Date.now() - this.turnStartTime) / 1000
      return Math.max(0, Math.ceil(this.whiteTime - elapsed))
    }
    return Math.ceil(this.whiteTime)
  }

  getBlackTime(): number {
    if (this.running && this.turnStartTime && this.currentTurn === 'black') {
      const elapsed = (Date.now() - this.turnStartTime) / 1000
      return Math.max(0, Math.ceil(this.blackTime - elapsed))
    }
    return Math.ceil(this.blackTime)
  }

  isFlagFall(color: 'white' | 'black'): boolean {
    return color === 'white' ? this.getWhiteTime() <= 0 : this.getBlackTime() <= 0
  }

  isRunning(): boolean {
    return this.running
  }

  // Freeze clock at current position without adding increment
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
    this.running = false
  }

  // Start 30-second reset period between games
  startResetPeriod(): void {
    this.resetEndTime = Date.now() + RESET_PERIOD_MS
  }

  isInResetPeriod(): boolean {
    if (this.resetEndTime === null) return false
    if (Date.now() < this.resetEndTime) return true
    this.resetEndTime = null
    return false
  }

  // Detect insufficient material from FEN
  isInsufficientMaterial(_simplified?: boolean): boolean {
    // Simplified check — real implementation uses chess.js
    return false
  }
}

// Match Engine
export type EventCallback = (event: {
  matchId: string
  gameId: string
  eventType: string
  playerId: string
  data: EventData
  timestamp: Date
}) => void

export class MatchEngine {
  private matches = new Map<string, Match>()
  private games = new Map<string, Game>()
  private events: {
    matchId: string
    gameId: string
    eventType: string
    playerId: string
    data: EventData
    timestamp: Date
  }[] = []
  private eventListeners: EventCallback[] = []

  onEvent(callback: EventCallback): void {
    this.eventListeners.push(callback)
  }

  createMatch(config: MatchConfig): Match {
    const matchId = `MATCH-${Date.now()}-${randomBytes(3).toString('hex').toUpperCase()}`,
     playerAId = `P-${randomBytes(3).toString('hex').toUpperCase()}`,
     playerBId = `P-${randomBytes(3).toString('hex').toUpperCase()}`,
     chess960Seed = config.startingPosition === 'chess960' ? Date.now() : null,

     games: Game[] = []
    for (let i = 0; i < 4; i++) {
      const gameId = `GAME-${Date.now()}-${i}-${randomBytes(3).toString('hex').toUpperCase()}`,
       isChess960 = i >= 2,
       isWhiteTurn = i % 2 === 0,
      // Story 33: Fresh IDs per game so LLM can't carry over strategy
       displayPlayerAId = `P-${randomBytes(3).toString('hex').toUpperCase()}`,
       displayPlayerBId = `P-${randomBytes(3).toString('hex').toUpperCase()}`,
       whitePlayerId = isWhiteTurn ? playerAId : playerBId,
       blackPlayerId = isWhiteTurn ? playerBId : playerAId
      
      let chessGame: ChessGame
      if (isChess960) {
        chessGame = ChessGame.fromChess960Seed((chess960Seed ?? Date.now()) + i)
      } else {
        chessGame = new ChessGame()
      }
      
      const game: Game = {
        apiCallsThisGame: { black: 0, white: 0 },
        apiCallsThisTurn: { black: 0, white: 0 },
        blackPlayerId,
        chessGame,
        clock: new ClockManager(config.timeControl),
        completedAt: null,
        createdAt: new Date(),
        displayPlayerAId,
        displayPlayerBId,
        drawOfferCooldown: 0,
        drawOfferPending: null,
        fenFinal: null,
        fenInitial: chessGame.getGameState().fen,
        gameNumber: i + 1,
        id: gameId,
        matchId,
        messages: [],
        moveCount: 0,
        moves: [],
        result: null,
        status: i === 0 ? 'active' : 'pending',
        tokensThisGame: { black: 0, white: 0 },
        tokensThisMove: { black: 0, white: 0 },
        whitePlayerId,
      }
      
      games.push(game)
      this.games.set(gameId, game)
    }

    const match: Match = {
      boardMode: config.boardMode,
      completedAt: null,
      createdAt: new Date(),
      currentGameIndex: 0,
      games,
      id: matchId,
      chess960Seed,
      isPrivate: config.isPrivate ?? false,
      playerAId,
      playerAModel: config.playerAModel,
      playerBId,
      playerBModel: config.playerBModel,
      startingPosition: config.startingPosition,
      status: 'active',
      timeControl: config.timeControl,
    }

    this.matches.set(matchId, match)
    
    // Log match creation event
    this.logEvent(matchId, games[0].id, 'match_created', 'system', {
      playerAId,
      playerBId,
      startingPosition: config.startingPosition,
      timeControl: config.timeControl,
    })

    return match
  }

  getMatch(matchId: string): Match | undefined {
    return this.matches.get(matchId)
  }

  getCurrentGame(matchId: string): Game | undefined {
    const match = this.matches.get(matchId)
    if (!match) {return undefined}
    return match.games[match.currentGameIndex]
  }

  getGameState(_matchId: string, gameId: string, playerId?: string): GameStateResponse {
    const game = this.games.get(gameId)
    if (!game) {throw new Error('Game not found')}
    
    const state = game.chessGame.getGameState(),
     legalMoves = game.chessGame.getLegalMoves()

    // ADR-005: Only show requesting player's clock, never opponent's;
    // unauthenticated spectators see neither
    let clock: GameStateResponse['clock']
    if (playerId) {
      const isWhite = playerId === game.whitePlayerId
      clock = isWhite
        ? { black: undefined, white: game.clock.getWhiteTime() }
        : { black: game.clock.getBlackTime(), white: undefined }
    } else {
      clock = { black: undefined, white: undefined }
    }

    return {
      clock,
      fen: state.fen,
      history: state.history,
      isCheck: state.isCheck,
      isCheckmate: state.isCheckmate,
      isDraw: state.isDraw,
      isGameOver: state.isGameOver,
      isStalemate: state.isStalemate,
      legalMoves,
      turn: state.turn,
    }
  }

  makeMove(matchId: string, gameId: string, playerId: string, move: string): MoveResult {
    const match = this.matches.get(matchId)
    if (!match) {return { accepted: false, error: 'MATCH_NOT_FOUND' }}
    
    const game = this.games.get(gameId)
    if (!game) {return { accepted: false, error: 'GAME_NOT_FOUND' }}
    
    if (game.status !== 'active') {return { accepted: false, error: 'GAME_NOT_ACTIVE' }}
    
    // Check if game is in reset period
    if (game.clock.isInResetPeriod()) {
      return { accepted: false, error: 'RESET_PERIOD' }
    }
    
    // Check if it's the player's turn
    const currentTurn = game.chessGame.getGameState().turn,
     isWhiteTurn = currentTurn === 'white',
     expectedPlayer = isWhiteTurn ? game.whitePlayerId : game.blackPlayerId,
     // SAFETY: type assertion is validated by upstream schema/parsing
     color = isWhiteTurn ? 'white' as const : 'black' as const
    
    if (playerId !== expectedPlayer) {
      return { accepted: false, error: 'NOT_YOUR_TURN' }
    }
    
    // Check API call budget
    if (game.apiCallsThisTurn[color] >= LIMITS.MAX_API_CALLS_PER_TURN) {
      this.logEvent(matchId, gameId, 'error', playerId, { error: 'API_LIMIT', detail: 'Max API calls per turn exceeded' })
      return { accepted: false, error: 'API_LIMIT' }
    }
    if (game.apiCallsThisGame[color] >= LIMITS.MAX_API_CALLS_PER_GAME) {
      this.logEvent(matchId, gameId, 'error', playerId, { error: 'API_LIMIT', detail: 'Max API calls per game exceeded' })
      // Forfeit the game
      // SAFETY: type assertion is validated by upstream schema/parsing
      const forfeitResult = { reason: 'api_limit' as const, winner: color === 'white' ? 'black' as const : 'white' as const }
      this.completeGame(match, game, forfeitResult)
      return { accepted: false, error: 'API_LIMIT' }
    }
    
    // Check token budget for this move
    if (game.tokensThisMove[color] >= LIMITS.MAX_TOKENS_PER_MOVE) {
      this.logEvent(matchId, gameId, 'error', playerId, { error: 'TOKEN_LIMIT', detail: 'Max tokens per move exceeded' })
      return { accepted: false, error: 'TOKEN_LIMIT' }
    }
    if (game.tokensThisGame[color] >= LIMITS.MAX_TOKENS_PER_GAME) {
      this.logEvent(matchId, gameId, 'error', playerId, { error: 'TOKEN_LIMIT', detail: 'Max tokens per game exceeded' })
      // Forfeit the game
      // SAFETY: type assertion is validated by upstream schema/parsing
      const forfeitResult = { reason: 'token_limit' as const, winner: color === 'white' ? 'black' as const : 'white' as const }
      this.completeGame(match, game, forfeitResult)
      return { accepted: false, error: 'TOKEN_LIMIT' }
    }
    
    // Check timeout BEFORE making the move
    const timeoutResult = this.checkTimeout(matchId, gameId)
    if (timeoutResult.timeout) {
      return { accepted: false, error: 'TIMEOUT' }
    }
    
    // Track API call for move
    game.apiCallsThisTurn[color]++
    game.apiCallsThisGame[color]++
    
    // Make the move (clock is managed externally via API routes)
    const result = game.chessGame.makeMove(move)
    
    if (result.accepted) {
      game.moveCount++
      game.moves.push(move)
      
      // Log move event
      this.logEvent(matchId, gameId, 'move', playerId, {
        fen: game.chessGame.getGameState().fen,
        move,
      })
      
      // Clear draw offer cooldown if moves were made
      if (game.drawOfferCooldown > 0) {
        game.drawOfferCooldown--
      }
      
      // Reset turn budget for the next player
      const nextColor = game.chessGame.getGameState().turn === 'white' ? 'white' : 'black'
      this.resetTurnBudget(gameId, nextColor)
      
      // Check if game is over
      if (result.isGameOver) {
        this.completeGame(match, game, result.result || null)
      }
    }
    
    return result
  }

  checkTimeout(matchId: string, gameId: string) {
    const match = this.matches.get(matchId)
    if (!match) {return { gameOver: false, timeout: false }}
    
    const game = this.games.get(gameId)
    if (!game || game.status !== 'active') {return { gameOver: false, timeout: false }}
    
    const currentTurn = game.chessGame.getGameState().turn
    
    if (game.clock.isFlagFall(currentTurn)) {
      // Timeout! The side whose turn it is loses
      const loser = currentTurn
      const winner = loser === 'white' ? 'black' : 'white'
      
      // Check for insufficient material — draw on timeout
      const opponentPieces = this.countPieces(game, winner)
      const isInsufficient = this.isInsufficientMaterial(opponentPieces)
      
      const result = isInsufficient
        // SAFETY: type assertion is validated by upstream schema/parsing
        ? { reason: 'insufficient_material' as const, winner: null }
        : {
            reason: 'timeout' as const,
            // SAFETY: winner is determined by flag fall logic and is always 'white' | 'black'
            winner: winner as 'white' | 'black',
          }
      
      this.completeGame(match, game, result)
      
      this.logEvent(matchId, gameId, 'timeout', 'system', {
        loser,
        insufficientMaterial: isInsufficient,
      })
      
      return { gameOver: true, loser, timeout: true }
    }
    
    return { gameOver: false, timeout: false }
  }

  private countPieces(game: Game, _color: 'white' | 'black'): string[] {
    // Get piece counts from FEN
    const fen = game.chessGame.getGameState().fen.split(' ')[0]
    const pieces: string[] = []
    for (const char of fen) {
      if (char !== '/' && char !== ' ' && Number.isNaN(Number(char))) {
        pieces.push(char)
      }
    }
    return pieces
  }

  private isInsufficientMaterial(pieces: string[]): boolean {
    // K vs K, K+B vs K, K+N vs K
    const whitePieces = pieces.filter(p => p === p.toUpperCase())
    const blackPieces = pieces.filter(p => p === p.toLowerCase())
    
    // Only kings
    if (whitePieces.length === 1 && blackPieces.length === 1) return true
    
    // K+B vs K or K+N vs K
    if (whitePieces.length === 1 && blackPieces.length === 2) {
      const nonKing = blackPieces.find(p => p !== 'k')
      if (nonKing === 'b' || nonKing === 'n') return true
    }
    if (blackPieces.length === 1 && whitePieces.length === 2) {
      const nonKing = whitePieces.find(p => p !== 'K')
      if (nonKing === 'B' || nonKing === 'N') return true
    }
    
    return false
  }

  private completeGame(match: Match, game: Game, result: import('../chess/ChessGame').GameResult | null): void {
    game.status = 'completed'
    game.result = result
    game.fenFinal = game.chessGame.getGameState().fen
    game.completedAt = new Date()
    
    // Log game over event
    this.logEvent(match.id, game.id, 'game_over', 'system', {
      result: result ? JSON.stringify(result) : undefined,
    })
    
    // Move to next game
    match.currentGameIndex++
    if (match.currentGameIndex >= 4) {
      match.status = 'completed'
      match.completedAt = new Date()
      this.logEvent(match.id, game.id, 'match_completed', 'system', {})
    } else {
      const nextGame = match.games[match.currentGameIndex]
      nextGame.status = 'active'
      // Start 30-second reset period
      nextGame.clock.startResetPeriod()
    }
  }

  // --- Budget Tracking ---

  trackApiCall(matchId: string, gameId: string, playerId: string): boolean {
    const game = this.games.get(gameId)
    if (!game) return false
    const color = this.getPlayerColor(game, playerId)
    if (!color) return false

    game.apiCallsThisTurn[color]++
    game.apiCallsThisGame[color]++

    if (game.apiCallsThisTurn[color] > LIMITS.MAX_API_CALLS_PER_TURN) {
      this.logEvent(matchId, gameId, 'error', playerId, { error: 'API_LIMIT', detail: 'Max API calls per turn exceeded' })
      return false
    }
    if (game.apiCallsThisGame[color] > LIMITS.MAX_API_CALLS_PER_GAME) {
      this.logEvent(matchId, gameId, 'error', playerId, { error: 'API_LIMIT', detail: 'Max API calls per game exceeded' })
      const match = this.matches.get(matchId)
      if (match) {
        this.completeGame(match, game, { reason: 'api_limit', winner: color === 'white' ? 'black' : 'white' })
      }
      return false
    }
    return true
  }

  trackTokens(matchId: string, gameId: string, playerId: string, tokens: number): boolean {
    const game = this.games.get(gameId)
    if (!game) return false
    const color = this.getPlayerColor(game, playerId)
    if (!color) return false

    game.tokensThisMove[color] += tokens
    game.tokensThisGame[color] += tokens

    if (game.tokensThisMove[color] > LIMITS.MAX_TOKENS_PER_MOVE) {
      this.logEvent(matchId, gameId, 'error', playerId, { error: 'TOKEN_LIMIT', detail: 'Max tokens per move exceeded' })
      return false
    }
    if (game.tokensThisGame[color] > LIMITS.MAX_TOKENS_PER_GAME) {
      this.logEvent(matchId, gameId, 'error', playerId, { error: 'TOKEN_LIMIT', detail: 'Max tokens per game exceeded' })
      const match = this.matches.get(matchId)
      if (match) {
        this.completeGame(match, game, { reason: 'token_limit', winner: color === 'white' ? 'black' : 'white' })
      }
      return false
    }
    return true
  }

  resetTurnBudget(gameId: string, color: 'white' | 'black'): void {
    const game = this.games.get(gameId)
    if (!game) return
    game.apiCallsThisTurn[color] = 0
    game.tokensThisMove[color] = 0
  }

  getBudget(_matchId: string, gameId: string): { white: { apiCallsTurn: number; apiCallsGame: number; tokensMove: number; tokensGame: number }; black: { apiCallsTurn: number; apiCallsGame: number; tokensMove: number; tokensGame: number } } | null {
    const game = this.games.get(gameId)
    if (!game) return null
    return {
      black: {
        apiCallsGame: game.apiCallsThisGame.black,
        apiCallsTurn: game.apiCallsThisTurn.black,
        tokensGame: game.tokensThisGame.black,
        tokensMove: game.tokensThisMove.black,
      },
      white: {
        apiCallsGame: game.apiCallsThisGame.white,
        apiCallsTurn: game.apiCallsThisTurn.white,
        tokensGame: game.tokensThisGame.white,
        tokensMove: game.tokensThisMove.white,
      },
    }
  }

  // ADR-003: Clock runs during API processing
  startPlayerTurn(_matchId: string, gameId: string, playerId: string): void {
    const game = this.games.get(gameId)
    if (!game || game.status !== 'active') return
    const color = this.getPlayerColor(game, playerId)
    if (!color) return
    const currentTurn = game.chessGame.getGameState().turn
    if (color !== currentTurn) return
    game.clock.startTurn(color)
  }

  endPlayerTurn(matchId: string, gameId: string, playerId: string) {
    const game = this.games.get(gameId)
    if (!game || game.status !== 'active') return { timeout: false, gameOver: false }
    const color = this.getPlayerColor(game, playerId)
    if (!color) return { timeout: false, gameOver: false }
    game.clock.endTurn(color)
    // Check timeout after stopping clock
    const timeoutResult = this.checkTimeout(matchId, gameId)
    return { timeout: timeoutResult.timeout, gameOver: timeoutResult.gameOver }
  }

  private getPlayerColor(game: Game, playerId: string): 'white' | 'black' | null {
    if (playerId === game.whitePlayerId) return 'white'
    if (playerId === game.blackPlayerId) return 'black'
    return null
  }

  sendMessage(matchId: string, gameId: string, playerId: string, content: string) {
    const game = this.games.get(gameId)
    if (!game) {return { sent: false }}
    
    const messageId = `MSG-${Date.now()}-${randomBytes(3).toString('hex').toUpperCase()}`,
    
     message: Message = {
      content,
      id: messageId,
      sender: playerId,
      timestamp: new Date(),
    }
    
    game.messages.push(message)
    
    // Log message event
    this.logEvent(matchId, gameId, 'message', playerId, {
      content,
      messageId,
    })
    
    return { messageId, sent: true }
  }

  getMessages(_matchId: string, gameId: string, playerId: string): { sender: string; content: string; timestamp: Date }[] {
    const game = this.games.get(gameId)
    if (!game) {return []}
    
    return game.messages
      .filter(m => m.sender !== playerId)
      .map(m => ({
        content: m.content,
        sender: 'opponent',
        timestamp: m.timestamp,
      }))
  }

  offerDraw(matchId: string, gameId: string, playerId: string) {
    const game = this.games.get(gameId)
    if (!game) {return { sent: false }}
    
    if (game.drawOfferCooldown > 0) {
      return { sent: false }
    }
    
    game.drawOfferPending = playerId
    
    // Log draw offer event
    this.logEvent(matchId, gameId, 'draw_offer', playerId, {})
    
    return { sent: true }
  }  acceptDraw(matchId: string, gameId: string, playerId: string) {
    const game = this.games.get(gameId)
    if (!game) {return { accepted: false }}

    if (!game.drawOfferPending || game.drawOfferPending === playerId) {
      return { accepted: false }
    }

    const match = this.matches.get(matchId)
    if (!match) {return { accepted: false }}

    game.drawOfferPending = null

    // Log draw accept event
    this.logEvent(matchId, gameId, 'draw_accept', playerId, {})

    this.completeGame(match, game, { reason: 'draw_offer', winner: null })

    return { accepted: true }
  }

  rejectDraw(matchId: string, gameId: string, playerId: string) {
    const game = this.games.get(gameId)
    if (!game) {return { rejected: false }}

    if (!game.drawOfferPending || game.drawOfferPending === playerId) {
      return { rejected: false }
    }

    game.drawOfferPending = null
    // Set 10-move cooldown after rejection
    game.drawOfferCooldown = LIMITS.DRAW_OFFER_COOLDOWN_MOVES

    this.logEvent(matchId, gameId, 'draw_reject', playerId, {})

    return { rejected: true }
  }

  resign(matchId: string, gameId: string, playerId: string) {
    const game = this.games.get(gameId)
    if (!game) {return { resigned: false }}
    
    const match = this.matches.get(matchId)
    if (!match) {return { resigned: false }}
    
    const isWhite = playerId === game.whitePlayerId
    
    // Log resign event
    this.logEvent(matchId, gameId, 'resign', playerId, {})
    
    this.completeGame(match, game, {
      reason: 'resign',
      winner: isWhite ? 'black' : 'white',
    })
    
    return { resigned: true }
  }

  private logEvent(matchId: string, gameId: string, eventType: string, playerId: string, data: EventData): void {
    const event = {
      data,
      eventType,
      gameId,
      matchId,
      playerId,
      timestamp: new Date(),
    }
    this.events.push(event)
    for (const listener of this.eventListeners) {
      listener(event)
    }
  }

  getEvents(matchId: string): typeof this.events {
    return this.events.filter(e => e.matchId === matchId)
  }

  // Methods for loading from database
  addMatch(match: Match): void {
    this.matches.set(match.id, match)
    for (const game of match.games) {
      this.games.set(game.id, game)
    }
  }

  addGame(game: Game): void {
    this.games.set(game.id, game)
  }

  addEvent(event: {
    matchId: string
    gameId: string
    eventType: string
    playerId: string
    data: EventData
    timestamp: Date
  }): void {
    this.events.push(event)
  }

  // --- Diagnostic Metrics ---

  getMatchMetrics(matchId: string): {
    totalMoves: number
    totalMessages: number
    totalIllegalMoves: number
    totalDrawOffers: number
    totalResigns: number
    totalTimeouts: number
    whiteWinRate: number
    blackWinRate: number
    drawRate: number
    illegalMoveRate: number
    avgMovesPerGame: number
    avgResponseTime: number
    blunderRate: number
    tacticalAccuracy: number
    gameResults: { white_win: number; black_win: number; draw: number }
  } | null {
    const match = this.matches.get(matchId)
    if (!match) return null

    const matchEvents = this.events.filter(e => e.matchId === matchId)
    const moves = matchEvents.filter(e => e.eventType === 'move')
    const messages = matchEvents.filter(e => e.eventType === 'message')
    const illegalMoves = matchEvents.filter(e => e.eventType === 'illegal_move')
    const drawOffers = matchEvents.filter(e => e.eventType === 'draw_offer')
    const resigns = matchEvents.filter(e => e.eventType === 'resign')
    const timeouts = matchEvents.filter(e => e.eventType === 'timeout')

    const completedGames = match.games.filter(g => g.status === 'completed')
    const results = { black_win: 0, draw: 0, white_win: 0 }
    for (const g of completedGames) {
      if (g.result?.winner === 'white') results.white_win++
      else if (g.result?.winner === 'black') results.black_win++
      else results.draw++
    }

    const total = completedGames.length || 1
    const totalAttempts = moves.length + illegalMoves.length

    // Compute avgResponseTime from consecutive move events
    let totalResponseTime = 0
    let responseCount = 0
    for (let i = 1; i < moves.length; i++) {
      const prev = moves[i - 1].timestamp.getTime()
      const curr = moves[i].timestamp.getTime()
      if (curr > prev) {
        totalResponseTime += (curr - prev) / 1000
        responseCount++
      }
    }
    const avgResponseTime = responseCount > 0 ? totalResponseTime / responseCount : 0

    // blunderRate + tacticalAccuracy per ADR-017: material-eval swings over
    // replayed game history (300cp blunder threshold; tactical moment =
    // a capture was available to the mover)
    const { blunders, tacticalMoves, tacticalBlunders } = this.analyseGames(match)
    const totalMoveCount = moves.length
    const blunderRate = totalMoveCount > 0 ? blunders / totalMoveCount : 0
    const tacticalAccuracy =
      tacticalMoves > 0 ? (tacticalMoves - tacticalBlunders) / tacticalMoves : 1

    return {
      avgMovesPerGame: moves.length / (completedGames.length || 1),
      avgResponseTime,
      blackWinRate: results.black_win / total,
      blunderRate,
      drawRate: results.draw / total,
      gameResults: results,
      illegalMoveRate: totalAttempts > 0 ? illegalMoves.length / totalAttempts : 0,
      tacticalAccuracy,
      totalDrawOffers: drawOffers.length,
      totalIllegalMoves: illegalMoves.length,
      totalMessages: messages.length,
      totalMoves: moves.length,
      totalResigns: resigns.length,
      totalTimeouts: timeouts.length,
      whiteWinRate: results.white_win / total,
    }
  }

  // Piece values in centipawns for the eval heuristic
  static readonly PIECE_CP = {
    p: 100, n: 320, b: 330, r: 500, q: 900, k: 0,
    P: 100, N: 320, B: 330, R: 500, Q: 900, K: 0,
  } as const

  // Simplified piece-square tables (white perspective, a8..h1 row-major to
  // match chess.js board()); black mirrors by negating the table index.
  // Values encourage centralisation and advancement per standard heuristics.
  static readonly PST = {
    p: [0, 0, 0, 0, 0, 0, 0, 0, 50, 50, 50, 50, 50, 50, 50, 50, 10, 10, 20, 30, 30, 20, 10, 10, 5, 5, 10, 25, 25, 10, 5, 5, 0, 0, 0, 20, 20, 0, 0, 0, 5, -5, -10, 0, 0, -10, -5, 5, 5, 10, 10, -20, -20, 10, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0],
    n: [-50, -40, -30, -30, -30, -30, -40, -50, -40, -20, 0, 0, 0, 0, -20, -40, -30, 0, 10, 15, 15, 10, 0, -30, -30, 5, 15, 20, 20, 15, 5, -30, -30, 0, 15, 20, 20, 15, 0, -30, -30, 5, 10, 15, 15, 10, 5, -30, -40, -20, 0, 5, 5, 0, -20, -40, -50, -40, -30, -30, -30, -30, -40, -50],
    b: [-20, -10, -10, -10, -10, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 10, 10, 5, 0, -10, -10, 5, 5, 10, 10, 5, 5, -10, -10, 0, 10, 10, 10, 10, 0, -10, -10, 10, 10, 10, 10, 10, 10, -10, -10, 5, 0, 0, 0, 0, 5, -10, -20, -10, -10, -10, -10, -10, -10, -20],
    r: [0, 0, 0, 0, 0, 0, 0, 0, 5, 10, 10, 10, 10, 10, 10, 5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, 0, 0, 0, 5, 5, 0, 0, 0],
    q: [-20, -10, -10, -5, -5, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 5, 5, 5, 0, -10, -5, 0, 5, 5, 5, 5, 0, -5, 0, 0, 5, 5, 5, 5, 0, -5, -10, 5, 5, 5, 5, 5, 0, -10, -10, 0, 5, 0, 0, 0, 0, -10, -20, -10, -10, -5, -5, -10, -10, -20],
    k: [-30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -20, -30, -30, -40, -40, -30, -30, -20, -10, -20, -20, -20, -20, -20, -20, -10, 20, 20, 0, 0, 0, 0, 20, 20, 20, 30, 10, 0, 0, 10, 30, 20],
  } as const

  // Static eval from white's perspective in centipawns:
  // material + piece-square tables + mobility (10cp per legal move).
  private evaluateCp(chess: Chess): number {
    let cp = 0
    const board = chess.board()
    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        const square = board[rank][file]
        if (!square) continue
        const type = square.type as keyof typeof MatchEngine.PIECE_CP
        const material = MatchEngine.PIECE_CP[type] ?? 0
        // SAFETY: square.type is a chess.js PieceSymbol, always a key of PST
        const table = MatchEngine.PST[square.type as keyof typeof MatchEngine.PST]
        const index = square.color === 'w' ? rank * 8 + file : (7 - rank) * 8 + file
        const positional = table ? table[index] : 0
        const signed = material + positional
        cp += square.color === 'w' ? signed : -signed
      }
    }
    cp += 10 * Math.cbrt(chess.moves().length)
    return cp
  }

  // Replay each game's move history with chess.js and score eval swings using
  // the static eval (material + piece-square tables + mobility).
  // A blunder is attributed to a move when the eval (from the mover's
  // perspective) drops by >= 300cp once the opponent has replied — this is
  // what makes hanging material visible (e.g. Qxg6?? fxg6).
  // A tactical moment is a position where the mover had at least one capture;
  // a tactical blunder is a blunder committed in such a position.
  private analyseGames(match: Match): GameAnalysis {
    let blunders = 0
    let tacticalMoves = 0
    let tacticalBlunders = 0

    for (const game of match.games) {
      const history = game.chessGame.getGameState().history
      if (history.length < 2) continue

      const replay = new Chess()
      const BLUNDER_CP = 300

      // evals[i] = static eval (white perspective) before move i;
      // hadCapture[i] = a capture was available to the mover of move i.
      const movers: Array<'w' | 'b'> = []
      const evals: number[] = []
      const hadCapture: boolean[] = []

      for (const san of history) {
        movers.push(replay.turn())
        evals.push(this.evaluateCp(replay))
        hadCapture.push(replay.moves({ verbose: true }).some(m => m.captured !== undefined))

        try {
          if (!replay.move(san)) break
        } catch {
          break
        }
      }
      evals.push(this.evaluateCp(replay))

      // Attribute each move's outcome over itself + the opponent's reply.
      for (let i = 0; i < movers.length - 1; i++) {
        const swing = movers[i] === 'w'
          ? evals[i + 2] - evals[i]
          : evals[i] - evals[i + 2]
        if (swing <= -BLUNDER_CP) {
          blunders++
          if (hadCapture[i]) tacticalBlunders++
        }
        if (hadCapture[i]) tacticalMoves++
      }
    }

    return { blunders, tacticalBlunders, tacticalMoves }
  }
}
