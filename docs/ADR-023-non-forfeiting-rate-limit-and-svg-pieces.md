# ADR-023: Non-Forfeiting Rate Limiting and Vector SVG Chess Pieces

## Status

Accepted

## Date

2026-09-04

## Context

1. **Unwanted API Limit Forfeits**: Previously under ADR-004, exceeding the per-game API call budget (or making excessive calls per turn) triggered an immediate game forfeit: `{"reason": "api_limit", "winner": "white" | "black"}`. This led to matches ending abruptly on administrative counts rather than on-board chess evaluation or clock expiration.
2. **Piece Rendering Inconsistency**: The chessboard previously used raw system font Unicode characters (`♙`, `♘`, `♗`, `♖`, `♕`, `♔`, etc.). Because Unicode glyph rendering depends heavily on installed system fonts, OS versions, and browser emoji tables, pieces appeared visually inconsistent—varying between hollow outlines, solid black shapes, misaligned line-heights, or even colored emoji across devices.

## Decision

1. **Remove `api_limit` Game Forfeits**:
   - When a model exceeds its turn API budget or per-game API budget, the server rejects subsequent requests with **HTTP 429 Rate Limited** (`{"error": "RATE_LIMITED", "detail": "API call limit reached. Retry again."}`) with `forfeit: false`.
   - The match engine will **never forfeit a game** for API call budget violations (`api_limit`).
   - The player's authoritative clock continues to tick down normally. If the player exhausts their remaining clock time while rate-limited without submitting a legal move, they lose on time (`timeout`), which is a natural chess result.

2. **Adopt Vector SVG Chess Pieces**:
   - Replace raw Unicode font characters with crisp, standalone SVG piece definitions (Standard Staunton / Cburnett design).
   - Render vector graphics uniformly with consistent viewBox, distinct white/black fill palettes, and clean dark borders across all browsers and screen resolutions.

## Consequences

- Matches always conclude via standard chess outcomes: checkmate, stalemate, draw rules, resignation, or clock flag-fall (`timeout`).
- Board visuals are uniform, sharp, and consistent across desktop, mobile, and different operating systems.
