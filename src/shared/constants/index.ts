export const ERROR_CODES = {
  API_LIMIT: "API_LIMIT",
  FORBIDDEN: "FORBIDDEN",
  ILLEGAL_MOVE: "ILLEGAL_MOVE",
  INVALID_FORMAT: "INVALID_FORMAT",
  NOT_FOUND: "NOT_FOUND",
  NOT_YOUR_TURN: "NOT_YOUR_TURN",
  RATE_LIMITED: "RATE_LIMITED",
  SERVER_ERROR: "SERVER_ERROR",
  TIMEOUT: "TIMEOUT",
  TOKEN_LIMIT: "TOKEN_LIMIT",
  UNAUTHORIZED: "UNAUTHORIZED",
  UNKNOWN_TOOL: "UNKNOWN_TOOL",
} as const;

export const TIME_CONTROLS = {
  BLITZ_3_2: "3+2",
  CLASSICAL_30_10: "30+10",
  RAPID_10_5: "10+5",
} as const;

export const GAME_MODES = {
  CHESS960: "chess960",
  STANDARD: "standard",
} as const;

export const BOARD_MODES = {
  ASSISTED: "assisted",
  PURE: "pure",
} as const;

export const MATCH_STATUS = {
  ACTIVE: "active",
  COMPLETED: "completed",
  PENDING: "pending",
} as const;

export const GAME_STATUS = {
  ACTIVE: "active",
  COMPLETED: "completed",
  PENDING: "pending",
} as const;

export const GAME_RESULT = {
  BLACK_FORFEIT: "black_forfeit",
  BLACK_WIN: "black_win",
  DRAW: "draw",
  WHITE_FORFEIT: "white_forfeit",
  WHITE_WIN: "white_win",
} as const;

export const EVENT_TYPES = {
  DRAW_ACCEPT: "draw_accept",
  DRAW_OFFER: "draw_offer",
  DRAW_REJECT: "draw_reject",
  ERROR: "error",
  ILLEGAL_MOVE: "illegal_move",
  MESSAGE: "message",
  MOVE: "move",
  RESIGN: "resign",
  STATE_READ: "state_read",
} as const;

export const LIMITS = {
  DRAW_OFFER_COOLDOWN_MOVES: 10,
  MAX_API_CALLS_PER_GAME: 200,
  MAX_API_CALLS_PER_TURN: 10,
  MAX_MESSAGES_PER_TURN: 5,
  MAX_REQUESTS_PER_SECOND: 10,
  MAX_REQUESTS_PER_TURN: 20,
  MAX_STATE_READS_PER_TURN: 10,
  MAX_TOKENS_PER_GAME: 100000,
  MAX_TOKENS_PER_MOVE: 4096,
} as const;

export const PROMPT_VERSION = "v1.0";
export const RULES_VERSION = "v1.0";
export const BENCHMARK_VERSION = "0.1.0";
export const MANIFEST_VERSION = "1.0";
