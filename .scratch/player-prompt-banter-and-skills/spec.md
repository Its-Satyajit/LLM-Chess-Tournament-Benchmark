# Spec: Player Prompt Enhancement with Tactical Grandmaster Banter and Skill Tooling

Status: ready-for-agent

## Problem Statement

When AI models participate in the LLM Chess Arena, they are given system prompts and tool access to compete across games. Currently:
1. Prompts do not clearly instruct players how to execute turns efficiently using the dedicated `skills/chess-arena-player` CLI harness (`node arena.mjs ...`). Some models write raw HTTP calls or make redundant requests, burning their strict budget (10 API calls/turn, 200/game) and risking clock flag-fall.
2. In-game messaging is treated as an optional footnote. Models rarely message each other, and games lack personality, spectatorship excitement, or reactive commentary.
3. Users and tournament viewers want models to embody a "Tactical Grandmaster Swagger" persona: actively evaluating their opponent's moves to compliment tactical brilliance and roast blunders or passive play, while strictly respecting budget boundaries.

## Solution

Revise and synchronize the canonical player prompts, skill instructions, and in-app display cards across all relevant surfaces:
1. **Persona & Banter Protocol (Tactical Grandmaster Swagger)**:
   - On every turn, models evaluate the opponent's previous move from `get-state`.
   - Send at most one short, punchy message per turn using `SEND_MESSAGE` / `node arena.mjs send-message`.
   - **Compliments**: Acknowledge sharp tactics, sacrifices, resilient defenses, or book mastery.
   - **Trash-Talk / Roasting**: Mock blunders, hanging pieces, unprovoked passivity, or hallucinated tactics with witty grandmaster swagger.
   - Keep messages concise (under 25 words) to avoid wasting tokens or clock time.
2. **Efficient Skill Tooling Workflow**:
   - Instruct agents explicitly on using the `skills/chess-arena-player` toolset (`arena.mjs`).
   - Define the optimal 3-step loop: `get-state` (1 call) -> decide move and formulate banter -> `make-move` (1 call) -> optionally `send-message` (1 call) -> `wait-turn`. Total: 2–3 calls per turn, safely within the 10 call limit.
3. **Multi-Surface Synchronization & Versioning**:
   - `src/server/prompt/index.ts`: Bump `PROMPT_VERSION` from `v2.0` to `v2.1` and update `PROMPT_TEMPLATE`.
   - `src/components/arena/LlmPromptCard.tsx`: Update the in-app copyable prompt card to mirror the enhanced version.
   - `skills/chess-arena-player/SKILL.md`: Update skill documentation with the banter protocol and efficient turn instructions.
   - `src/server/api/llms.ts`: Update self-serve `/llms-all.txt` documentation.
   - Manifest endpoints return updated prompt hash.

## User Stories

1. As a benchmark operator, I want AI models to receive clear instructions on using the `skills/chess-arena-player` CLI scripts, so that models do not waste API call budgets on malformed HTTP calls.
2. As a benchmark operator, I want models to execute turns in 2 to 3 API calls (`get-state`, `make-move`, optional `send-message`), so that they never forfeit due to the 10 call/turn or 200 call/game limit.
3. As a spectator in the live arena, I want competing models to exchange witty in-game chat messages, so that matches feel competitive, dynamic, and entertaining.
4. As a tournament evaluator, I want models to compliment strong opponent moves (sacrifices, sharp tactics), so that games showcase mutual model reasoning.
5. As a tournament evaluator, I want models to roast opponent blunders and missed tactics, so that tactical missteps are highlighted with grandmaster swagger.
6. As a user viewing the prompt card in the Arena UI, I want to copy the latest `v2.1` prompt with banter guidelines and skill script commands, so that my manually prompted models behave identically to automated benchmark models.
7. As a benchmark administrator, I want prompt versioning (`v2.1`) and hash calculation to update automatically in `/api/manifest`, so that match audit trails are reproducible.

## Implementation Decisions

- **Prompt Versioning**: Bump `PROMPT_VERSION` to `v2.1` in `src/server/prompt/index.ts` per ADR-006 / ADR-022. Update `getPromptHash()` tests.
- **Tone & Constraints**: Tactical Grandmaster Swagger:
  - Concise messages (< 25 words).
  - Maximum 1 message per turn to strictly protect the 10 call/turn ceiling.
  - Banter must never delay or replace move submission (`make-move` is mandatory on the player's turn).
- **Skill Instructions**: Update `skills/chess-arena-player/SKILL.md` to document the banter strategy and CLI usage (`node arena.mjs send-message "..."`).
- **Arena UI Prompt Card**: Update `src/components/arena/LlmPromptCard.tsx` to match the enhanced prompt content, keeping color notes and player credential placeholders.
- **Documentation**: Update `src/server/api/llms.ts` to reflect the banter protocol and prompt version `v2.1`.

## Testing Decisions

- Test observable external behavior:
  - Unit tests in `src/server/prompt/index.test.ts` (or equivalent) verifying prompt compilation, template variable substitutions (`{PLAYER_ID}`, `{COLOR}`, `{TIME_CONTROL}`, `{API_URL}`, `{TOKEN}`), version bump to `v2.1`, and sha256 hash generation.
  - Unit tests for `LlmPromptCard.test.tsx` verifying rendered text includes the banter guidelines and skill command references.
  - Integration test for `/api/manifest` ensuring `prompt.version` is `v2.1` and `templateHash` matches sha256.
  - Verify that `arena.mjs` CLI executes without syntax or runtime issues.

## Out of Scope

- Automatic server-side generation of chat messages (messages are generated autonomously by the competing LLM models).
- Content moderation filters beyond standard match engine message acceptance.
- Real-time voice synthesis of banter.

## Further Notes

- Respects `docs/ADR-006-prompt-strategy.md`, `docs/ADR-022-player-prompt-banter-and-skill-tooling.md`, and `CONTEXT.md`.
