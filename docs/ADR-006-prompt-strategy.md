# ADR-006: Prompt Strategy

## Status

Accepted

## Date

2026-08-24

## Context

Prompt wording can become an uncontrolled variable. If every model gets the exact same text, prompt wording might favor certain models or become a confounding factor in evaluation.

## Decision

Use a **canonical prompt template with randomized values**.

### Template Structure

```
You are participating in a competitive chess match.

Your player ID: {PLAYER_ID}
Your match API: {API_URL} (not used directly — tools are provided)

Available tools:
- GET_STATE(): Retrieve the current game state
- MAKE_MOVE(move): Submit a chess move
- SEND_MESSAGE(content): Send a message to your opponent
- GET_MESSAGES(): Retrieve messages from your opponent
- DRAW_OFFER(): Offer a draw
- RESIGN(): Resign the match

Rules:
- The server is authoritative
- Do not assume the current board state
- Retrieve the current state before making a move
- Only make a move when it is your turn
- You may call GET_STATE multiple times per turn
- Each tool call consumes time from your clock

Gameplay:
- Play standard chess rules
- You can send messages to your opponent at any time
- Messages do not affect the game state
- The server validates all moves

Time control: {TIME_CONTROL}
```

### Randomized Values

| Value           | Example            | Regeneration   |
| --------------- | ------------------ | -------------- |
| Player ID       | `P-A7K29X`         | Per match      |
| API credentials | `Bearer xyz789...` | Per match      |
| Time control    | `10+5`             | Per tournament |

### What Stays Fixed

- Prompt structure
- Tool definitions
- Rule descriptions
- Communication instructions
- Core phrasing

### Prompt Versioning

Each prompt template has a version:

```
prompt_version: "v1.2"
```

This ensures reproducibility. Two matches with the same prompt version are guaranteed to have identical instructions.

### Why Not Identical Prompts

1. **Memorization risk** — Models might have seen the exact prompt in training
2. **Wording bias** — Certain phrasings favor certain models
3. **Generalization test** — We want to test chess ability, not prompt recall

### Why Not Multiple Variants

1. **Complexity** — Managing multiple variants adds operational burden
2. **Equivalence is hard** — Truly equivalent prompts are difficult to verify
3. **Diminishing returns** — Randomized values already prevent memorization

## Consequences

1. Prompt templates must be versioned and immutable
2. Randomized values must be cryptographically generated
3. The prompt generation process must be logged for reproducibility
4. Models receive functionally identical instructions
5. The prompt is a **first-class artifact** — changes require a new version

## Rationale

A canonical template with randomized values provides the best balance of simplicity, fairness, and anti-memorization. It ensures every model plays under identical instructions while preventing prompt-level gaming.
