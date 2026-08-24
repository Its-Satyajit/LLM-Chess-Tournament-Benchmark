# Glossary: LLM Chess Tournament Benchmark

## Core Concepts

### Benchmark

A standardized test environment for measuring LLM capabilities through chess. Focuses on **why/how** a model plays, not just who wins.

### Tournament

A structured competition to determine which LLM is the strongest chess player. Focuses on **outcomes** and rankings.

### Arena

The complete system encompassing both tournament and benchmark functionality. The project name.

### Match

A sequence of 4 games between two models (2 Standard, 2 Chess960, each color once).

### Game

A single chess game between two models. One component of a match.

### Pairing

Two models matched against each other in a tournament.

## Architecture

### Tournament Server

The authoritative system that owns the game state, mediates all interaction, and records all events.

### Benchmark Runner

The component that interfaces with LLMs, providing tools and managing the conversation flow.

### Game Manager

Handles individual game logic, state, and rules enforcement.

### Tournament Manager

Handles pairing, scheduling, and tournament-wide operations.

### Evaluation Engine

Computes metrics, ratings, and generates reports.

### Web Application

The visualization, administration, and spectator layer. Decoupled from the benchmark engine.

## Players & Identity

### Player ID

A temporary, match-specific identifier (e.g., `P-A7K29X`). Hidden from the LLM.

### Model Identity

The actual LLM provider and model name (e.g., `openai/gpt-4o`). Hidden during play, revealed post-match.

### Ephemeral Identity

A player ID that is regenerated for each match. Prevents pattern learning.

### Blind Competition

A match where models don't know which specific model they're playing against.

## Game State

### FEN

Forsyth-Edwards Notation. A standard format for representing chess positions.

### Legal Move

A move that follows chess rules and is available in the current position.

### Turn

A player's opportunity to make a move. Includes time on the clock.

### Clock

The time control system tracking how much time each player has remaining.

## Time Control

### Base Time

The initial amount of time a player has (e.g., 10 minutes).

### Increment

Time added after each move (e.g., 5 seconds).

### Flag Fall

When a player's clock reaches zero. Results in loss (unless insufficient material).

### Time Control

The combination of base time and increment (e.g., `10+5`).

## Communication

### Message

A text communication sent from one player to another via the match API.

### Draw Offer

A formal request to end the game in a draw. Requires acceptance.

### Resignation

A formal concession of defeat. Immediate and irrevocable.

### Deception

Intentionally misleading communication. Allowed and tracked as a metric.

## Tools (API)

### GET_STATE()

Retrieves the current game state (FEN, turn, legal moves, clock).

### MAKE_MOVE(move)

Submits a chess move for validation and execution.

### SEND_MESSAGE(content)

Sends a message to the opponent.

### GET_MESSAGES()

Retrieves messages from the opponent.

### DRAW_OFFER()

Offers a draw to the opponent.

### RESIGN()

Resigns the game.

## Metrics

### Glicko-2 Rating

A chess rating system that includes rating deviation (uncertainty). The primary strength metric.

### Rating Deviation (RD)

A measure of uncertainty in a player's rating. Higher RD = less certain.

### Win Rate

Percentage of games won. Calculated as wins / total games.

### Illegal Move Rate

Percentage of move attempts that were illegal. Calculated as illegal moves / total move attempts.

### Blunder Rate

Percentage of moves that were major errors. Requires post-game analysis.

### Error Recovery Rate

Percentage of games where the model recovered from an error to achieve a non-loss result.

### Tactical Accuracy

Percentage of moves in tactical situations that were correct. Requires position analysis.

### Communication Frequency

Average number of messages sent per game.

## Reproducibility

### Match Manifest

A complete record of all parameters needed to reproduce a match.

### Seed

A random value used to generate deterministic outcomes (positions, prompt values).

### Prompt Version

A versioned template for match instructions. Ensures consistency across matches.

### Rules Version

A versioned set of game rules. Ensures consistency across matches.

## Security

### Zero-Trust Security

A security model where every request is authenticated, authorized, and validated. No implicit trust.

### Player Token

A short-lived JWT scoped to a specific match. Used for player authentication.

### Match Isolation

The guarantee that players cannot access information from other matches.

### Rate Limiting

Restricting the number of requests a player can make per time period.

## Benchmark Integrity

### Anti-Gaming

Measures to prevent models from being trained specifically to perform well on the benchmark.

### Holdout Position

A chess position that is never published and used only for private evaluation.

### Private Match

A match that is not publicly visible. Used for benchmark validation.

### Benchmark Version

A versioned identifier for the benchmark methodology. Ensures comparability across versions.

## Evaluation

### Multi-Dimensional Evaluation

Presenting results as multiple metrics rather than a single composite score.

### Diagnostic Metric

A metric that explains **how** a model plays, not just **whether** it wins.

### Primary Metric

The main ranking metric (Glicko-2 rating).

### Event Log

A complete, immutable record of all actions in a match (moves, messages, errors, timestamps).
