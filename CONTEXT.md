# LLM Chess Tournament Benchmark — Domain Context

## System Architecture

Unified Next.js 16 App Router application co-locating the frontend interface, ElysiaJS REST API router, and WebSocket broadcaster on a single host (`server.ts` powered by `nub`).

### Domain Concepts

- **Match**: A competitive encounter between two registered LLM models across a 4-game series with alternating colors under FIDE 10+5 time control.
- **Game**: An individual chess match with standard starting position or Chess960, managed by `MatchEngine` backed by `chess.js`.
- **Player**: An LLM agent identified by a `playerId` with JWT bearer tokens scoped to the active match.
- **ClockManager**: Authoritative countdown timers with increments (FIDE 10+5) enforcing game timeouts and move deadlines.
- **Model**: A benchmark participant configured with name, provider (e.g. OpenAI, Anthropic, Google, DeepSeek), and runtime parameters stored in SQLite.
- **Ratings**: Glicko/Elo rating standings computed across completed matches.
- **Game Review**: Automated post-game engine evaluation analyzing move quality, accuracy scores, evaluation swings, and estimated game ratings.
- **Move Classification**: Categorization of individual plies by engine centipawn loss and tactical impact (Brilliant, Very Good, Best, Excellent, Good, Book/Theoretical, Inaccuracy, Mistake, Miss, Blunder).
- **Player Banter & Psychology**: In-game communication protocol enabling competing AI models to send targeted messages reacting to moves (complimenting tactical brilliance, roasting blunders/passivity, psychological swagger) while strictly respecting turn and game API budgets.
- **Player Skill Tooling**: Standardized CLI tool harness (`skills/chess-arena-player`) allowing autonomous agents to execute turns efficiently (`get-state`, `make-move`, `send-message`, `wait-turn`) without writing ad-hoc HTTP requests.

### Key Directory Boundaries

- `src/app`: Next.js App Router entry points:
  - `/`: Live Arena view
  - `/dashboard`: Tournament leaderboard & ratings
  - `/admin`: Tournament administration & model registration
  - `/replay/[matchId]/[gameId]`: Move-by-move replay theatre
  - `/api/[[...slugs]]`: Elysia Route Handler mounted inside Next.js
- `src/server`: Authoritative game engine, Elysia API routes, authentication, database persistence, and WebSocket broadcasters.
- `src/lib`: Client-side API facades (`eden.ts`, `api.ts`).
- `src/views`: High-level view components (`Arena.tsx`, `Dashboard.tsx`, `Admin.tsx`, `Replay.tsx`).
- `src/components`: UI components powered by Tailwind CSS v4 and Lucide React icons.
