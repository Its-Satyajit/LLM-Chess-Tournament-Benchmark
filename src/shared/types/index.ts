export interface Match {
  id: string;
  playerAId: string;
  playerBId: string;
  playerAModel: ModelConfig;
  playerBModel: ModelConfig;
  status: MatchStatus;
  timeControl: string;
  startingPosition: "standard" | "chess960";
  chess960Seed: number | null;
  boardMode: "pure" | "assisted";
  createdAt: Date;
  completedAt: Date | null;
}

export interface Game {
  id: string;
  matchId: string;
  gameNumber: number;
  whitePlayerId: string;
  blackPlayerId: string;
  // Story 33: Fresh IDs per game for prompt display
  displayPlayerAId?: string;
  displayPlayerBId?: string;
  status: GameStatus;
  result: GameResult | null;
  resultReason: string | null;
  fenInitial: string;
  fenFinal: string | null;
  moveCount: number;
  createdAt: Date;
  completedAt: Date | null;
}

export interface Event {
  id: number;
  gameId: string;
  eventType: EventType;
  playerId: string;
  data: EventData;
  timestamp: Date;
  gameMove: number | null;
  clockWhite: number | null;
  clockBlack: number | null;
}

export interface Player {
  id: string;
  color: "white" | "black";
  model: ModelConfig;
}

export interface ModelConfig {
  provider: string;
  name: string;
  version: string;
  temperature: number;
  maxOutputTokens: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}

export interface Rating {
  modelName: string;
  provider: string;
  glickoRating: number;
  glickoRd: number;
  glickoVolatility: number;
  gamesPlayed: number;
  lastUpdated: Date;
}

export interface Tournament {
  id: string;
  name: string;
  format: TournamentFormat;
  status: TournamentStatus;
  createdAt: Date;
  completedAt: Date | null;
}

export interface TournamentEntry {
  id: number;
  tournamentId: string;
  modelName: string;
  provider: string;
  finalRating: number;
  wins: number;
  draws: number;
  losses: number;
  points: number;
}

export interface MatchManifest {
  manifestVersion: string;
  benchmarkVersion: string;
  matchId: string;
  players: {
    a: { playerId: string; modelConfig: ModelConfig };
    b: { playerId: string; modelConfig: ModelConfig };
  };
  parameters: {
    timeControl: string;
    startingPosition: string;
    chess960Seed: number | null;
    boardMode: string;
  };
  prompt: {
    version: string;
    templateHash: string;
  };
  rules: {
    version: string;
    drawRules: string;
    errorHandling: string;
    communication: string;
    deceptionAllowed: boolean;
  };
  seeds: {
    matchSeed: number;
    chess960Seed: number | null;
  };
  environment: {
    serverVersion: string;
    timestamp: string;
  };
}

export type MatchStatus = "pending" | "active" | "completed";
export type GameStatus = "pending" | "active" | "completed";
export type GameResult = "white_win" | "black_win" | "draw" | "white_forfeit" | "black_forfeit";
export type EventType =
  | "move"
  | "message"
  | "state_read"
  | "draw_offer"
  | "draw_accept"
  | "draw_reject"
  | "resign"
  | "illegal_move"
  | "error";

export interface EventData {
  accepted?: boolean
  clock?: { white: number; black: number }
  content?: string
  detail?: string
  error?: string
  fen?: string
  from?: string
  gameId?: string
  gameNumber?: number
  whitePlayerId?: string
  blackPlayerId?: string
  insufficientMaterial?: boolean
  loser?: string
  matchId?: string
  move?: string
  messageId?: string
  // Per-move metrics (move + illegal_move events)
  thinkTimeSeconds?: number
  tokensUsed?: number
  apiCalls?: number
  moveNumber?: number
  captured?: string
  promotion?: string
  isCapture?: boolean
  isPromotion?: boolean
  isCastle?: boolean
  givesCheck?: boolean
  player?: string
  playerAId?: string
  playerBId?: string
  reason?: string
  result?: string
  sender?: string
  startingPosition?: string
  timeControl?: string
  turn?: string
  type?: string
  winner?: string
}

export type TournamentFormat = "round_robin" | "swiss" | "knockout";
export type TournamentStatus = "pending" | "active" | "completed";

// ---------------------------------------------------------------------------
// User-owned benchmarks
// ---------------------------------------------------------------------------

export type BenchmarkMatchType = "llm_vs_llm" | "llm_vs_user";

export type BenchmarkStatus =
  | "created"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export interface BenchmarkConfig {
  timeControl: string;
  boardMode: "pure" | "assisted";
  startingPosition: "standard" | "chess960";
  isPrivate: boolean;
}

export interface BenchmarkModelParticipant {
  kind: "model";
  modelId: string;
  model: ModelConfig;
}

export interface BenchmarkUserParticipant {
  kind: "user";
  userId: string;
  publicName: string;
}

export type BenchmarkParticipant =
  | BenchmarkModelParticipant
  | BenchmarkUserParticipant;

export interface BenchmarkParticipants {
  playerA: BenchmarkParticipant;
  playerB: BenchmarkParticipant;
}

export interface BenchmarkResult {
  games: number;
  playerAWins: number;
  playerBWins: number;
  draws: number;
}

export interface BenchmarkSummary {
  id: string;
  matchType: BenchmarkMatchType;
  status: BenchmarkStatus;
  title: string | null;
  isPrivate: boolean;
  config: BenchmarkConfig;
  participants: BenchmarkParticipants;
  matchId: string | null;
  result: BenchmarkResult | null;
  error: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}
