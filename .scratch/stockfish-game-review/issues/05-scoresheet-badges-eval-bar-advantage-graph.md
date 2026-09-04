# 05: Scoresheet Badges, Dynamic Eval Bar & Advantage Timeline

**What to build:**
Enhancements across the Replay Theatre interface:
- Vertical evaluation bar alongside the chessboard showing centipawn balance / mate in dynamic colors.
- Interactive SVG advantage timeline graph below the board, rendering advantage peaks and valleys with click-to-jump to ply.
- Move classification badge icons and dual labels rendered on every move in the interactive scoresheet.
- Keyboard navigation (arrows/Home/End) updates the evaluation bar in sync with the board.

**Blocked by:** 04: Game Review Dashboard Card & Dual-Mode Toggle UI

**Status:** resolved

- [x] Vertical evaluation bar dynamically updates as active ply changes.
- [x] Advantage graph renders full game evaluation curve and responds to clicks by jumping to selected ply.
- [x] Scoresheet moves render classification badge (icon + color + label in selected mode).
- [x] Component tests verify synchronization between board, eval bar, and scoresheet.
