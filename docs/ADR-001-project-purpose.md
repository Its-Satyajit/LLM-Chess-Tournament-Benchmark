# ADR-001: Project Purpose

## Status

Accepted

## Date

2026-08-24

## Context

The project could be:

- **A:** A tournament to determine which LLM plays chess best
- **B:** A benchmark to measure LLM capabilities through chess
- **C:** Both

## Decision

The project is **two-layered**:

```
        LLM CHESS ARENA
               │
    ┌──────────┴──────────┐
    │                     │
TOURNAMENT             BENCHMARK
    │                     │
 Who wins?          Why/how did it play?
    │                     │
   Elo          Reasoning / Memory / Strategy
```

### Layer 1: Tournament

- **Goal:** Determine which LLM is the strongest chess player
- **Output:** Elo/Glicko ratings, win/draw/loss records
- **Focus:** Objective competitive outcomes
- **Format:** Structured competition (round-robin, Swiss, etc.)

### Layer 2: Benchmark

- **Goal:** Measure specific LLM capabilities through chess
- **Output:** Diagnostic metrics on reasoning, memory, strategy, communication
- **Focus:** Behavioral analysis, not just outcomes
- **Dimensions:**
  - Reasoning quality
  - Memory and state tracking
  - Strategic planning
  - Communication patterns
  - Error recovery
  - Adaptation under pressure

## Consequences

1. The event log must capture **everything** — moves, messages, timestamps, API calls, errors
2. The system must support **both** competitive play and diagnostic analysis
3. Evaluation reports must separate **tournament results** from **benchmark diagnostics**
4. The architecture must keep the two layers **decoupled** but **compatible**

## Rationale

The chess tournament provides an objective, reproducible outcome. The underlying event stream gives an unusually rich dataset for evaluating LLM behavior. Together, they answer both "who wins?" and "why/how did it play?"
