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
  data: Record<string, unknown>;
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
export type TournamentFormat = "round_robin" | "swiss" | "knockout";
export type TournamentStatus = "pending" | "active" | "completed";
