# Spec: Non-Forfeiting Rate Limiting and Vector SVG Chess Pieces

Status: ready-for-agent

## Problem Statement

1. **Unwanted API Limit Forfeitures**:
   Previously under ADR-004, when an LLM player exceeded the per-turn or per-game API call threshold, the engine immediately forfeited the match with `Match Over: {"reason":"api_limit","winner":"white"}`. This led to matches ending abruptly on administrative counts rather than on-board chess evaluation or natural clock expiration.
2. **Inconsistent Chess Piece Rendering**:
   The chessboard in `src/components/ChessBoard.tsx` rendered pieces using system font Unicode characters (`♙`, `♘`, `♗`, `♖`, `♕`, `♔`, etc.). Depending on OS, browser, and installed fonts, pieces rendered with inconsistent weights, hollow outlines, misalignment, or colored emoji glyphs, creating a poor aesthetic experience.

## Solution

1. **Non-Forfeiting Rate Limiting**:
   - When an LLM player reaches or exceeds the API call limit (`MAX_API_CALLS_PER_TURN` or `MAX_API_CALLS_PER_GAME`), the engine returns failure / rejects calls without forfeiting the game.
   - API endpoints (`gate()`, `GET /state/:gameId`, `POST /move/:gameId`) return HTTP 429 Rate Limited (`{"error": "Rate limited: API call budget reached. Retry again."}`) with `forfeit: false`.
   - The match engine leaves the game in its active state (`status: 'active'`).
   - The player's clock continues to run down naturally. If the player exhausts their remaining clock time without submitting a legal move, they lose on time (`timeout`), which is a natural chess result.
2. **Vector SVG Chess Pieces**:
   - Provide standard, clean vector SVG piece components for all 12 pieces (`P`, `N`, `B`, `R`, `Q`, `K` for both white and black).
   - Use standard Staunton / Cburnett vector paths with standard `viewBox="0 0 45 45"`.
   - Render crisp outlines, solid fills (pure white with dark border for white, solid dark slate/black with white highlights for black), maintaining responsive scaling within board squares.
   - Preserve all existing accessibility attributes (`role="img"`, aria-labels) and board highlight states (`sq-hint`, `sq-check`, `sq-last-from`, `sq-last-to`).

## User Stories

1. As a tournament participant model, when I make rapid or excessive API calls, I want the server to return HTTP 429 telling me to retry rather than forfeiting my game immediately, so that I can still submit a legal move if I have clock time left.
2. As a benchmark operator, I want games to end strictly via chess rules (checkmate, stalemate, repetition, 50-move, insufficient material, resignation) or clock expiration (`timeout`), never on `api_limit`.
3. As a spectator, I want chess pieces on the live board and replay theatre to appear crisp, uniform, and beautifully proportioned regardless of what browser or operating system I use.

## Implementation Decisions

- **MatchEngine Rate Limit Handling**:
  - In `MatchEngine.makeMove`, when `apiCallsThisGame >= LIMITS.MAX_API_CALLS_PER_GAME`, log the event and return `{ accepted: false, error: 'API_LIMIT' }` without calling `this.completeGame(...)`.
  - In `MatchEngine.trackApiCall`, when `apiCallsThisGame > LIMITS.MAX_API_CALLS_PER_GAME`, log the event and return `false` without calling `this.completeGame(...)`.
- **API Response Formatting**:
  - In `src/server/api/match.ts`, `gate()` rejects with `failStatus: 429`, `failError: 'Rate limited: API call budget reached. Retry again.'`, `forfeit: false`.
  - In `src/server/api/match.ts`, the `GET /:matchId/state/:gameId` route returns HTTP 429 with `{ error: 'Rate limited: API call budget reached. Retry again.' }` when `trackApiCall` fails, avoiding `forfeit: true`.
- **Vector SVG Pieces**:
  - Create `src/components/ChessPieces.tsx` exporting a `ChessPiece` component accepting `{ piece: PieceKey, className?: string }`.
  - SVG elements have `viewBox="0 0 45 45"`, `fillRule="evenodd"`, `clipRule="evenodd"`, and proper inline vector paths.
  - Update `src/components/ChessBoard.tsx` to render `<ChessPiece piece={piece as PieceKey} />`.
  - Update `src/app/index.css` to ensure SVG pieces scale cleanly.

## Testing Decisions

- **TDD for Rate Limiting**:
  - Update `src/server/game/Budget.test.ts`: test that exceeding `MAX_API_CALLS_PER_GAME` returns `false`, logs the error, but leaves the game `status === 'active'` and `game.result` undefined/null.
- **TDD / Component Test for ChessBoard Pieces**:
  - Test in `src/components/ChessBoard.test.tsx` that pieces render as SVG elements with appropriate SVG classes/roles and correct piece colors for both white and black.
