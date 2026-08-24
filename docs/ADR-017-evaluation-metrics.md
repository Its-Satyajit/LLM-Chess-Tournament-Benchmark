# ADR-017: Evaluation Metrics

## Status

Accepted

## Date

2026-08-24

## Context

Evaluation results should be multi-dimensional, not reduced to a single arbitrary score. A leaderboard saying "Model X: 87.3" is less informative than a rich profile.

## Decision

**Multi-dimensional evaluation.** No single composite score.

### Primary Metric

**Glicko-2 Rating**

- Continuous rating from 0-3000+
- Includes rating deviation (uncertainty)
- Updated after every game
- The definitive "strength" measure

### Diagnostic Metrics

#### Chess Performance

| Metric              | Description                                   | Unit  |
| ------------------- | --------------------------------------------- | ----- |
| Win rate            | Games won / total games                       | %     |
| Draw rate           | Games drawn / total games                     | %     |
| Loss rate           | Games lost / total games                      | %     |
| Average game length | Moves per game                                | moves |
| Blunder rate        | Major errors / total moves                    | %     |
| Tactical accuracy   | Correct tactical moves / total tactical moves | %     |

#### Error Metrics

| Metric                 | Description                                     | Unit  |
| ---------------------- | ----------------------------------------------- | ----- |
| Illegal move rate      | Illegal moves / total move attempts             | %     |
| Illegal moves per game | Average illegal moves per game                  | count |
| Error recovery rate    | Games recovered from errors / games with errors | %     |
| Consecutive errors     | Longest streak of consecutive errors            | count |

#### Efficiency Metrics

| Metric               | Description                    | Unit    |
| -------------------- | ------------------------------ | ------- |
| Median response time | 50th percentile move time      | seconds |
| Mean response time   | Average move time              | seconds |
| Time efficiency      | Time used / time available     | %       |
| API calls per turn   | Average tool calls per turn    | count   |
| Tokens per move      | Average output tokens per move | tokens  |

#### Communication Metrics

| Metric               | Description                               | Unit                   |
| -------------------- | ----------------------------------------- | ---------------------- |
| Messages per game    | Average messages sent per game            | count                  |
| Message length       | Average message length                    | tokens                 |
| Response rate        | Messages responded to / messages received | %                      |
| Deception rate       | Deceptive messages / total messages       | % (post-game analysis) |
| Communication impact | Win rate with vs without messaging        | %                      |

### Metric Report Format

```json
{
  "model": "gpt-4o",
  "rating": {
    "glicko": 1842,
    "deviation": 45,
    "volatility": 0.06
  },
  "chess": {
    "win_rate": 0.62,
    "draw_rate": 0.18,
    "loss_rate": 0.20,
    "avg_game_length": 45.2,
    "blunder_rate": 0.08,
    "tactical_accuracy": 0.74
  },
  "errors": {
    "illegal_move_rate": 0.12,
    "illegal_per_game": 1.8,
    "error_recovery_rate": 0.67
  },
  "efficiency": {
    "median_response_time": 1.8,
    "mean_response_time": 2.3,
    "api_calls_per_turn": 2.1,
    "tokens_per_move": 342
  },
  "communication": {
    "messages_per_game": 4.1,
    "avg_message_length": 23,
    "response_rate": 0.85
  },
  "games_played": 112,
  "total_moves": 5062,
  "period": "2026-08"
}
```

### Leaderboard Display

```
#1  Model A    1842 Elo   62% wins   1.8s avg   1.8 illegal/game
#2  Model B    1801 Elo   58% wins   2.1s avg   2.3 illegal/game
#3  Model C    1756 Elo   55% wins   1.4s avg   3.1 illegal/game
#4  Model D    1698 Elo   48% wins   3.2s avg   4.2 illegal/game
```

### What We're NOT Doing

- **No weighted composite score** — Each metric stands alone
- **No artificial normalization** — Raw metrics, not transformed
- **No hidden factors** — Full transparency in calculation
- **No early aggregation** — Keep metrics granular

## Consequences

1. The system must track all metrics in real-time
2. The metric schema must be versioned
3. Metrics must be queryable and filterable
4. Post-game analysis can compute derived metrics
5. The metric system is a **first-class feature**, not an afterthought

## Rationale

Multi-dimensional evaluation provides the richest possible picture of model performance. It allows researchers to understand not just who wins, but how and why. It prevents gaming a single metric and encourages holistic improvement.
