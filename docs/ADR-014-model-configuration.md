# ADR-014: Model Configuration Recording

## Status

Accepted

## Date

2026-08-24

## Context

A benchmark must record the exact model configuration. Without it, results become meaningless over time as models update and change.

## Decision

Record **full configuration** for every model in every match.

### Configuration Schema

```json
{
  "model": {
    "provider": "openai",
    "name": "gpt-4o",
    "version": "2024-08-06",
    "api_version": "2024-08-06"
  },
  "parameters": {
    "temperature": 0.7,
    "max_output_tokens": 4096,
    "top_p": 1.0,
    "frequency_penalty": 0.0,
    "presence_penalty": 0.0
  },
  "context": {
    "window_size": 128000,
    "system_prompt_hash": "sha256:abc123...",
    "tools_provided": [
      "GET_STATE",
      "MAKE_MOVE",
      "SEND_MESSAGE",
      "GET_MESSAGES",
      "DRAW_OFFER",
      "RESIGN"
    ]
  },
  "metadata": {
    "date_tested": "2026-08-24T12:00:00Z",
    "benchmark_version": "0.1.0",
    "config_source": "codex-cli"
  }
}
```

### Config Sources

The benchmark can load model configurations from:

| Source       | Description                           |
| ------------ | ------------------------------------- |
| Manual entry | User provides config directly         |
| Codex CLI    | Import from `codex` command-line tool |
| Open Code    | Import from Open Code IDE             |
| Chat apps    | Import from ChatGPT, Claude, etc.     |
| Config file  | Load from `models.yaml`               |

### Config File Format

```yaml
# models.yaml
models:
  - name: gpt-4o
    provider: openai
    version: "2024-08-06"
    temperature: 0.7
    max_output_tokens: 4096
    source: codex-cli

  - name: claude-sonnet-4-20250514
    provider: anthropic
    version: "2025-05-14"
    temperature: 0.7
    max_output_tokens: 4096
    source: claude-app

  - name: gemini-2.5-pro
    provider: google
    version: "2025-05-06"
    temperature: 0.7
    max_output_tokens: 4096
    source: ai-studio
```

### What Gets Recorded Per Match

```json
{
  "match_id": "...",
  "player_a": {
    "id": "P-A7K29X",
    "config": {/* full config */}
  },
  "player_b": {
    "id": "P-B4Q81Z",
    "config": {/* full config */}
  }
}
```

### Config Versioning

- Configs are **immutable** — once recorded, never changed
- Each match has a snapshot of the exact config used
- Configs can be compared across matches
- Config changes require a new model entry (not an update)

### Why Full Config

1. **Reproducibility** — Another researcher can replicate the exact conditions
2. **Comparison** — Can compare same model at different settings
3. **Debugging** — Can identify config-related issues
4. **Evolution tracking** — Can track how model performance changes with updates
5. **Transparency** — Full disclosure of testing conditions

## Consequences

1. The system must capture and store full configs
2. Config files must be version-controlled
3. Match results must include config snapshots
4. Config changes must create new model entries
5. The config system is a **hard contract** — all matches record full config

## Rationale

Full configuration recording ensures reproducibility and transparency. It allows researchers to replicate results, compare configurations, and track model evolution over time. The integration with codex CLI, Open Code, and chat apps makes it easy to import real-world configurations.
