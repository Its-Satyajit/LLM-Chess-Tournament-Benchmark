# ADR-015: Reproducibility

## Status

Accepted

## Date

2026-08-24

## Context

A benchmark without reproducibility is just a leaderboard. Another researcher must be able to run the exact same match and get the same result.

## Decision

**Full reproducibility** via complete match manifests.

### Match Manifest Schema

```json
{
  "manifest_version": "1.0",
  "benchmark_version": "0.1.0",
  "match_id": "MATCH-2026-08-24-A7K29X",

  "players": {
    "a": {
      "player_id": "P-A7K29X",
      "model_config": {/* full ADR-014 config */}
    },
    "b": {
      "player_id": "P-B4Q81Z",
      "model_config": {/* full ADR-014 config */}
    }
  },

  "parameters": {
    "time_control": "10+5",
    "starting_position": "standard",
    "chess960_seed": null,
    "board_mode": "assisted"
  },

  "prompt": {
    "version": "v1.2",
    "template_hash": "sha256:abc123...",
    "values": {
      "player_a_id": "P-A7K29X",
      "player_b_id": "P-B4Q81Z"
    }
  },

  "rules": {
    "version": "v1.0",
    "draw_rules": "mutual_agreement",
    "error_handling": "retry_within_time",
    "communication": "optional",
    "deception_allowed": true
  },

  "seeds": {
    "match_seed": 12345,
    "chess960_seed": 67890,
    "prompt_seed": 11111
  },

  "environment": {
    "server_version": "0.1.0",
    "node_version": "20.11.0",
    "os": "linux",
    "timestamp": "2026-08-24T12:00:00Z"
  }
}
```

### Seed Management

| Seed          | Purpose                    | Regeneration            |
| ------------- | -------------------------- | ----------------------- |
| match_seed    | General randomness         | Per match               |
| chess960_seed | Starting position          | Per match (if Chess960) |
| prompt_seed   | Prompt value randomization | Per match               |

Seeds are **deterministic** — same seed = same results (for position generation, prompt values, etc.).

### What CAN Be Reproduced

- Starting position (via seed)
- Prompt values (via seed)
- Time control (fixed parameter)
- Rules (fixed parameter)
- Model config (recorded)

### What CANNOT Be Reproduced

- LLM API responses (stochastic by nature)
- Network latency
- API rate limits
- Model provider outages

### Reproducibility Statement

Each manifest includes a reproducibility statement:

```
This match can be reproduced with the same seed and model configuration.
LLM responses may vary due to inherent stochasticity.
Aggregate results across many matches are reproducible.
Individual match outcomes may differ.
```

### Manifest Storage

- Manifests are stored as JSON files
- One manifest per match
- Manifests are part of the event log
- Manifests are publicly accessible (for transparency)

## Consequences

1. The system must generate and store manifests for every match
2. Seeds must be cryptographically generated
3. The manifest schema must be versioned
4. Reproducibility is a **first-class feature**, not an afterthought
5. The manifest is the **canonical record** of a match

## Rationale

Full reproducibility ensures the benchmark is scientific. Other researchers can verify results, run comparisons, and build on the work. The manifest captures everything needed to understand exactly how a match was conducted.
