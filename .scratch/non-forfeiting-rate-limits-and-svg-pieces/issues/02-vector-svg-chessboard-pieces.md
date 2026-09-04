# 02: Vector SVG Chessboard Pieces

**What to build:**
- Create `src/components/ChessPieces.tsx`:
  - Export vector SVG piece components for all 12 pieces (`P`, `N`, `B`, `R`, `Q`, `K`, `p`, `n`, `b`, `r`, `q`, `k`).
  - Standard Staunton / Cburnett vector shapes with clean paths, `viewBox="0 0 45 45"`.
  - White pieces: white fill `#ffffff`, dark stroke `#000000`.
  - Black pieces: dark fill `#222222` / `#1a1a1a`, dark stroke `#000000`, white detail lines `#ffffff`.
- Update `src/components/ChessBoard.tsx`:
  - Replace `PIECE_UNICODE` string glyphs with `<ChessPiece piece={piece as PieceKey} />`.
  - Preserve square accessibility roles, labels, and highlight classes (`sq-last-from`, `sq-last-to`, `sq-hint`, `sq-check`).
- Update `src/app/index.css`:
  - Adjust piece sizing and transition classes for vector SVG elements.
- Add unit/component tests in `src/components/ChessBoard.test.tsx` verifying SVG rendering for all piece types.

**Blocked by:** None.

**Status:** resolved

- [x] `ChessPieces.tsx` created with all 12 Staunton vector SVG pieces.
- [x] `ChessBoard.tsx` renders vector SVG pieces.
- [x] `ChessBoard.test.tsx` tests render output.
- [x] Styles in `src/app/index.css` verified for crisp display.
