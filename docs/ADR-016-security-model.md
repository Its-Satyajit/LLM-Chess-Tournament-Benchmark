# ADR-016: Security Model

## Status

Accepted

## Date

2026-08-24

## Context

You're giving an LLM an API endpoint. The API must assume the client is hostile. Even though the client happens to be a language model, the security model must be zero-trust.

## Decision

**Zero-trust security.** Every request is authenticated, authorized, and validated.

### Authentication

| Method              | Description                         |
| ------------------- | ----------------------------------- |
| Player token        | Short-lived JWT, scoped to match    |
| API key             | Long-lived key for tournament admin |
| No anonymous access | All requests require authentication |

### Player Token Structure

```json
{
  "sub": "P-A7K29X",
  "match": "MATCH-2026-08-24-A7K29X",
  "permissions": ["read:state", "write:move", "write:message", "read:messages"],
  "exp": 1724512800,
  "iat": 1724509200
}
```

### Scoped Credentials

Each player token is scoped to:

- **One match only** — Cannot access other matches
- **Specific actions** — Only allowed operations
- **Time-limited** — Expires after match ends
- **No admin access** — Cannot modify server state

### Match Isolation

```
Match A: P-A1, P-B1
  ↓ Isolated
Match B: P-A2, P-B2
  ↓ Isolated
Match C: P-A3, P-B3
```

- Player from Match A cannot access Match B
- No cross-match information flow
- Separate databases per match (logical isolation)

### Rate Limiting

| Limit            | Value | Scope      |
| ---------------- | ----- | ---------- |
| Requests/second  | 10    | Per player |
| Requests/turn    | 20    | Per player |
| Messages/turn    | 5     | Per player |
| State reads/turn | 10    | Per player |

Rate limits are enforced at the API gateway level.

### Request Validation

Every request is validated:

1. **Authentication** — Valid token?
2. **Authorization** — Allowed action?
3. **Match context** — Correct match?
4. **Turn order** — Is it your turn?
5. **Rate limit** — Within limits?
6. **Schema** — Valid request format?
7. **Content** — No injection attempts?

### What's Protected

| Resource               | Protection       |
| ---------------------- | ---------------- |
| Server internal state  | Never exposed    |
| Other matches          | No access        |
| Admin endpoints        | Separate auth    |
| Database               | No direct access |
| File system            | No access        |
| Network                | Isolated         |
| Logs                   | No player access |
| Other players' configs | Hidden           |

### API Key Rotation

- Player tokens: Auto-expire after match
- Admin API keys: Rotate every 90 days
- Provider API keys: Stored in environment, never in database
- All keys: Encrypted at rest

### Security Events

The system logs security events:

- Failed authentication attempts
- Rate limit violations
- Unauthorized access attempts
- Invalid request formats
- Suspicious patterns

### Threat Model

| Threat                                | Mitigation                       |
| ------------------------------------- | -------------------------------- |
| LLM tries to access other matches     | Match isolation, token scoping   |
| LLM tries to escalate privileges      | Permission validation            |
| LLM tries to inject code              | Request validation, sanitization |
| LLM tries to DoS the server           | Rate limiting                    |
| LLM tries to read server state        | Zero internal exposure           |
| LLM tries to manipulate other players | Message isolation                |

## Consequences

1. The API gateway must enforce authentication and rate limiting
2. Player tokens must be generated and validated correctly
3. Match isolation must be implemented at the data layer
4. Security events must be monitored and logged
5. The security model is a **hard contract** — no exceptions

## Rationale

Zero-trust security ensures the benchmark is safe and fair. LLMs are powerful and unpredictable — the system must assume they will try to exploit any weakness. The security model protects the integrity of the benchmark and the safety of the infrastructure.
