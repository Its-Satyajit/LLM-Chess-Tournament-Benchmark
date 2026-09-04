# 04: Game Review Dashboard Card & Dual-Mode Toggle UI

**What to build:**
A rich UI component (`GameReviewCard`) displayed on the Replay Theatre page (`/replay/[matchId]/[gameId]`) that presents:
- White and Black accuracy gauges (e.g. 85.0% vs 84.1%).
- Estimated game performance rating (ELO) for both models.
- Comparative side-by-side move classification count table.
- Interactive mode toggle switch between **Tournament Mode** and **Streamer / Sigma Mode** (Sigma, Awesome, Best, Nice, Ok, Theoretical, Strange, Bad, Miss, Clown).
- Review trigger button ("Start Review") with live progress bar and depth selector (Quick/Standard/Deep).

**Blocked by:** 03: Game Review Coordinator & Local Storage Cache

**Status:** resolved

- [x] Game review card displays accuracy meters and ratings for White and Black.
- [x] Classification count table lists counts side-by-side (White count vs Black count).
- [x] Toggle switch switches labels dynamically between Tournament Mode and Streamer / Sigma Mode.
- [x] Depth selector allows selecting Quick (10), Standard (14), or Deep (18).
- [x] Vitest component tests verify rendering, user interactions, and mode switching.
