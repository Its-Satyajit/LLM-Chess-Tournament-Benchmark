# ADR-018: Benchmark Integrity

## Status

Accepted

## Date

2026-08-24

## Context

Once the benchmark becomes popular, models may be trained specifically to perform well on it. This undermines the benchmark's validity. Anti-gaming measures must be implemented from the start.

## Decision

**High priority.** Implement anti-gaming measures now, not later.

### Anti-Gaming Measures

#### 1. Randomized Starting Positions

- Chess960 mode randomizes piece placement
- Standard mode can use random openings from a large pool
- Position selection is seed-based and unpredictable

#### 2. Rotating Prompts

- Prompt template is versioned but values are randomized
- Player IDs, credentials, and timestamps vary per match
- No fixed "magic strings" to memorize

#### 3. Match-Specific Identities

- Player IDs are regenerated per match
- No persistent identities across tournaments
- Models cannot learn opponent patterns

#### 4. Multiple Seeds

- Every match uses a unique random seed
- Same model pairings get different positions
- Prevents memorization of specific matchups

#### 5. Hidden Positions

- Some test positions are never published
- Holdout positions for private evaluation
- Position pool is large enough to prevent full coverage

#### 6. Private Evaluation Matches

- Some matches are not publicly visible
- Used for benchmark validation
- Prevents models from optimizing for public results

#### 7. Holdout Tournaments

- Some tournaments use unpublished positions
- Results are private until positions are released
- Prevents training on benchmark data

### Integrity Guarantees

| Guarantee           | Implementation                        |
| ------------------- | ------------------------------------- |
| Position randomness | Seed-based PRNG, large position pool  |
| Prompt uniqueness   | Randomized values, versioned template |
| Identity isolation  | Per-match ephemeral IDs               |
| Data privacy        | Some matches are private              |
| Reproducibility     | Complete manifests with seeds         |
| Transparency        | Full event logs, open source          |

### What We're NOT Doing

- **No obfuscation** — The benchmark is open source, code is visible
- **No adversarial prompts** — We don't try to trick models
- **No hidden rules** — All rules are documented
- **No secret sauce** — The methodology is public

### Why This Works

The anti-gaming measures work because:

1. **Randomness is unpredictable** — Can't memorize what you can't predict
2. **Scale prevents coverage** — Too many positions to train on all
3. **Open source is honest** — We're transparent about the methodology
4. **Rich metrics prevent gaming** — Can't optimize for a single metric

### Benchmark Versioning

The benchmark itself is versioned:

```
benchmark_version: "0.1.0"
```

When anti-gaming measures change, the version increments. This ensures:

- Old results are comparable within a version
- New versions can be more robust
- The community can track improvements

## Consequences

1. The system must generate and manage random seeds
2. Some matches must be flagged as private
3. The position pool must be large and growing
4. The benchmark version must be tracked
5. Integrity measures are a **hard requirement**, not optional

## Rationale

Benchmark integrity is essential for long-term validity. Anti-gaming measures ensure the benchmark measures real LLM ability, not optimization for specific test cases. Implementing these measures from the start prevents the benchmark from becoming meaningless as models improve.
