export const ERROR_CODES = {
  ILLEGAL_MOVE: "ILLEGAL_MOVE",
  NOT_YOUR_TURN: "NOT_YOUR_TURN",
  INVALID_FORMAT: "INVALID_FORMAT",
  UNKNOWN_TOOL: "UNKNOWN_TOOL",
  RATE_LIMITED: "RATE_LIMITED",
  TOKEN_LIMIT: "TOKEN_LIMIT",
  API_LIMIT: "API_LIMIT",
  TIMEOUT: "TIMEOUT",
  SERVER_ERROR: "SERVER_ERROR",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
} as const;

export const TIME_CONTROLS = {
  BLITZ_3_2: "3+2",
  RAPID_10_5: "10+5",
  CLASSICAL_30_10: "30+10",
} as const;

export const GAME_MODES = {
  STANDARD: "standard",
  CHESS960: "chess960",
} as const;

export const BOARD_MODES = {
  PURE: "pure",
  ASSISTED: "assisted",
} as const;

export const MATCH_STATUS = {
  PENDING: "pending",
  ACTIVE: "active",
  COMPLETED: "completed",
} as const;

export const GAME_STATUS = {
  PENDING: "pending",
  ACTIVE: "active",
  COMPLETED: "completed",
} as const;

export const GAME_RESULT = {
  WHITE_WIN: "white_win",
  BLACK_WIN: "black_win",
  DRAW: "draw",
  WHITE_FORFEIT: "white_forfeit",
  BLACK_FORFEIT: "black_forfeit",
} as const;

export const EVENT_TYPES = {
  MOVE: "move",
  MESSAGE: "message",
  STATE_READ: "state_read",
  DRAW_OFFER: "draw_offer",
  DRAW_ACCEPT: "draw_accept",
  DRAW_REJECT: "draw_reject",
  RESIGN: "resign",
  ILLEGAL_MOVE: "illegal_move",
  ERROR: "error",
} as const;

export const LIMITS = {
  MAX_TOKENS_PER_MOVE: 4096,
  MAX_TOKENS_PER_GAME: 100000,
  MAX_API_CALLS_PER_TURN: 10,
  MAX_API_CALLS_PER_GAME: 200,
  MAX_REQUESTS_PER_SECOND: 10,
  MAX_REQUESTS_PER_TURN: 20,
  MAX_MESSAGES_PER_TURN: 5,
  MAX_STATE_READS_PER_TURN: 10,
  DRAW_OFFER_COOLDOWN_MOVES: 10,
} as const;

export const PROMPT_VERSION = "v1.0";
export const RULES_VERSION = "v1.0";
export const BENCHMARK_VERSION = "0.1.0";
export const MANIFEST_VERSION = "1.0";
