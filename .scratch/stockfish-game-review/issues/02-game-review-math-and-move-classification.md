# 02: Game Review Math, Accuracy Calculation & Move Classifications

**What to build:**
A pure TypeScript math and chess rules engine that calculates:
1. Win probability function $W(cp) = 50 + 50 \times \tanh(0.00368208 \times cp)$.
2. Move accuracy and aggregate player accuracy scores (0–100%).
3. Average Centipawn Loss (ACPL).
4. Estimated game performance rating (ELO).
5. Move classification logic supporting both **Tournament Mode** (Brilliant, Very Good, Best, Excellent, Good, Theoretical, Inaccuracy, Mistake, Miss, Blunder) and **Streamer / Sigma Mode** (Sigma, Awesome, Best, Nice, Ok, Theoretical, Strange, Bad, Miss, Clown).

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] Win probability function returns 50% for 0 cp, ~99% for +1000 cp, ~1% for -1000 cp.
- [x] Accuracy formula computes 100% for top moves and penalizes blunders properly.
- [x] Classification logic correctly categorizes moves based on win-rate drop and tactical sacrifice heuristics.
- [x] Performance rating calculation generates realistic ratings based on accuracy and ACPL.
- [x] Vitest unit tests achieve 100% test coverage over mathematical edge cases.
