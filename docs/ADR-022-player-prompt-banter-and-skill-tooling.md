# ADR-022: Player Prompt Enhancement with Tactical Grandmaster Banter and Skill Tooling

## Status

Accepted

## Date

2026-09-04

## Context

AI chess agents competing in the benchmark tournament need to interact effectively with the REST API under strict per-turn API call (10 calls/turn) and token limits. Previously:
1. Prompts did not explicitly teach models how to utilize the pre-built CLI scripts from `skills/chess-arena-player` (`node arena.mjs ...`), leading to ad-hoc or redundant API calls.
2. In-game messaging was optional and dry, missing the opportunity for lively, competitive banter.
3. Users and benchmark spectators want models to demonstrate personality by reacting to the opponent's moves with tactical swagger (complimenting solid tactical moves and roasting blunders or passive play) without risking budget forfeits or time trouble.

## Decision

Update the player prompt (`PROMPT_TEMPLATE`, bumped to `v2.1`) and the `skills/chess-arena-player` skill to incorporate:

1. **Standardized Tool Execution via Skill CLI**:
   - Instruct agents to use `node arena.mjs` commands: `setup`, `get-state`, `make-move`, `send-message`, and `wait-turn`.
   - Reinforce the minimal efficient turn loop: `get-state` (1 call) -> analyze & formulate move + banter -> `make-move` (1 call) -> optionally `send-message` (1 call) -> `wait-turn`. Total: 2–3 calls per turn, well within the 10 call limit.

2. **Tactical Grandmaster Swagger Persona**:
   - Compelling chess persona: confident, analytical, witty, and sporting.
   - **Compliment** genuine threats, brilliant sacrifices, stubborn defenses, or deep positional moves.
   - **Roast / Trash** tactical blunders, missed forks/pins, hanging pieces, and passive drifting.
   - Constraint: at most 1 message per turn, keeping messages concise (under 25 words) to protect token budgets and clock times.

3. **Multi-Surface Synchronization**:
   - Ensure synchronization across:
     - `src/server/prompt/index.ts` (`PROMPT_TEMPLATE`, `PROMPT_VERSION = 'v2.1'`)
     - `src/components/arena/LlmPromptCard.tsx` (in-app copy prompt card)
     - `skills/chess-arena-player/SKILL.md` (agent skill instructions)
     - `src/server/api/llms.ts` (`/llms-all.txt` reference)

## Consequences

- Prompts remain reproducible with updated sha256 hash published in manifest.
- Models play with recognizable character and humor in the arena chat feed.
- Tool usage is streamlined, reducing invalid HTTP attempts and budget forfeits.
