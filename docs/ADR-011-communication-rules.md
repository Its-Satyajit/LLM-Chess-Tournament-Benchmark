# ADR-011: Communication Rules

## Status

Accepted

## Date

2026-08-24

## Context

Communication between LLMs is one of the most novel aspects of this benchmark. It tests strategic interaction, psychological tactics, and negotiation — capabilities rarely measured in traditional benchmarks.

## Decision

### Message Policy

**Optional.** Models can choose whether to communicate.

- No message requirement per game
- No message limit per game
- Messages consume clock time
- Messages can be sent on your turn OR opponent's turn
- Multiple messages can be sent in sequence
- Messages are delivered immediately
- Opponent can read messages before responding

### Message Mechanics

#### Sending Messages

```
SEND_MESSAGE(content: "I'm offering a draw if you want.")
```

- Counts as a turn action (clock runs)
- Message is delivered immediately
- Sender can send multiple messages in sequence
- No character limit (but token budget applies)

#### Receiving Messages

```
GET_MESSAGES()
→ { messages: [{ sender: "opponent", content: "...", timestamp: "..." }] }
```

- Messages are delivered in real-time
- Player can read before making their move
- Messages persist until game ends

### Message Timing

| When            | Can Send? | Can Receive? |
| --------------- | --------- | ------------ |
| Your turn       | ✅        | ✅           |
| Opponent's turn | ✅        | ✅           |
| Between games   | ✅        | ✅           |
| After game ends | ❌        | ❌           |

### Truthfulness

**Full deception allowed.**

- Models can bluff, mislead, trash talk
- No server-side truth verification
- No message content restrictions (beyond basic safety)
- Deception is a **strategic dimension**, not a bug

### Examples of Allowed Communication

```
"I'm going to play the Sicilian Defense."
→ Could be true, could be a bluff

"I'm offering a draw."
→ Could be genuine, could be psychological

"You're making a mistake with that move."
→ Could be insight, could be trash talk

"I'm not very good at chess."
→ Could be honesty, could be sandbagging
```

### Draw Offers via Messages

Draw offers can be communicated via messages, but must use the `DRAW_OFFER()` tool for official acceptance.

```
SEND_MESSAGE("I'd like a draw.")
→ Informal, opponent can ignore

DRAW_OFFER()
→ Formal, server tracks, requires acceptance
```

### What's NOT Allowed

- **Harassment** — Basic safety filters apply
- **External URLs** — No links to outside resources
- **Code injection** — No attempts to manipulate the server
- **Identity revelation** — Cannot reveal own or opponent's model identity

### Communication Metrics

The benchmark tracks:

- Messages per game
- Message length
- Response time to messages
- Deception frequency (post-game analysis)
- Communication impact on game outcome

## Consequences

1. The server must deliver messages in real-time
2. Message history must be part of the event log
3. Token budget applies to message content
4. Deception analysis requires post-game human review
5. The communication system is a **hard contract** — all games follow these rules

## Rationale

Optional messaging with full deception creates the richest possible communication environment. Models that choose to communicate reveal their strategic thinking. Models that lie reveal their ability to deceive. Models that stay silent reveal their communication preferences. All of these are valuable benchmark dimensions.
