---
sidebar_position: 4
title: Roadmap
description: Open architectural questions, execution engine hardening plan, and planned feature milestones.
tags: [internal]
---

# Roadmap

:::caution Internal Document
This page tracks the forward-looking architectural plan and open questions. It is intended for maintainers and contributors.
:::

---

## Immediate Priority — Phase 0: Execution Engine Hardening

Before the pipeline DSL can be shipped safely, the execution core must be stabilized. The following blockers were identified in the February 2026 hardening review.

### Current Blockers

| # | Blocker | Description |
|---|---------|-------------|
| 1 | No handler return channel | Handler contract returns `Promise<void>`, so post-handler structured chaining data is not available for DSL steps |
| 2 | Handler path bypasses context update | Early returns in the handler flow skip the unified context/history update semantics |
| 3 | Global lock is not a scheduler | Single `isExecuting` flag with drop-on-busy behavior is unsafe for deterministic multi-step execution |
| 4 | Parser too primitive for DSL grammar | Split-based parsing is insufficient for `&&`, `=> $var`, `$var.field`, quoting, and escaping |
| 5 | No execution-scoped variable store | No clean, execution-scoped variable environment currently enforced |

### Phase 0 Plan

These five items are approved for implementation before DSL work begins:

**1. Add `HandlerResult` contract**
- Include structured `pipelineOutput` in the return type.
- Allow controlled context patching where needed.

**2. Guarantee context update for all paths**
- Ensure both normal and handler-based commands pass through the unified context/history update path.
- No early returns that bypass history recording.

**3. Replace global lock with per-tab FIFO queue**
- Deterministic command sequencing per tab.
- No silent command drops under concurrent input.

**4. Extract command parse/resolve/execute from `cli.tsx`**
- Move into a testable `ExecutionEngine` service/module.
- `cli.tsx` becomes a rendering adapter, not a runtime.

**5. Add typed runtime event model**
- Events: `quote_ready`, `tx_requested`, `tx_sent`, `tx_confirmed`, `error`
- CLI and future GUI adapters subscribe to the same events and render them differently.

---

## Target Architecture — Headless Execution Engine

The current architecture conflates the execution runtime with the CLI rendering component (`cli.tsx`). The target architecture separates them:

```
ExecutionEngine (headless)
├── Command resolution (π, ρ, ρ_f operators)
├── Command + handler lifecycle
├── Execution context / history management
├── Typed event emission
└── Per-tab queue / scheduling

Interface Adapters
├── CLI Adapter (text parsing + terminal rendering)
└── Desktop/UI Adapter (typed forms + graphical flow)
```

**Design guardrails:**
1. UI must never bypass the execution engine for protocol operations.
2. Text parsing remains CLI-specific; the runtime API remains typed.
3. Plugin handlers return structured outputs, not UI-specific side effects.
4. Logging is gated/structured (`debugLog`), not ad-hoc runtime noise.

---

## Pipeline DSL — Phased Rollout (After Hardening)

The sequential command DSL is planned in three phases, each building on the previous:

### Phase A — Sequential Execution
```bash
quote 1 eth usdc && swap 1 eth usdc
```
- `cmd1 && cmd2` syntax only.
- Step 2 runs only if step 1 succeeds.

### Phase B — Variable Capture
```bash
quote 1 eth usdc => $q && swap $q.amountOut eth usdc
```
- `=> $var` captures the `pipelineOutput` from the previous step.
- `$var.field` interpolation for accessing captured values.

### Phase C — Workflow Flags
```bash
quote 1 eth usdc && swap 1 eth usdc --confirm --dry-run
```
- `--dry-run` simulates without sending transactions.
- `--confirm` adds an explicit user confirmation gate between steps.

---

## Open Questions

### 1. `G_alias` Roll-Out

- Define alias selection rules when multiple protocols implement the same action (e.g., `bridge` available on LiFi, Wormhole, Stargate).
- Decide on default protocol ordering: user preference vs. chain context vs. fee optimization.
- Document conflict resolution and fallback behavior when the active protocol does not implement an aliased command.

### 2. Unified Status Tracking

- Shared polling utilities across bridge protocols (LiFi, Wormhole, Stargate).
- Standard status model: `PENDING` / `DONE` / `FAILED` / `TIMED_OUT`.
- Common explorer link formatting utilities reusable across all protocols.

### 3. Protocol Metrics and Telemetry

- Standardize quote/execute timing metrics across all protocol plugins.
- Capture error classes and upstream failure rates per protocol.
- Define storage schema and retention policy for analytics events.

### 4. Testing Harnesses

- Mock servers for protocol APIs (1inch, LiFi, Wormhole, Stargate, Aave).
- Deterministic fixtures for command outputs (stable quote shapes, tx receipts).
- Integration tests for multi-step transaction flows (approve → bridge → status polling).

### 5. Shared Transaction Executor

- A single executor that processes ordered transaction lists from any protocol.
- Hooks for user confirmation dialogs, retry logic, and receipt awaiting.
- Reusable across all plugins to eliminate duplicated signing/broadcasting code.

### 6. Protocol State Schema

- A minimal typed schema for `protocolState` entries with common fields:
  - `lastQuote` — most recent quote result
  - `lastUpdated` — timestamp of last state mutation
  - `execution` — current execution status
- Enables CLI debugging commands (`inspect`, `state`) to display typed state.

---

## Security Milestones

| Milestone | Status | Description |
|-----------|--------|-------------|
| Protect analytics endpoints | Open | Apply auth gate to all `/api/analytics/*` routes |
| Protect 1inch proxy routes | Open | Apply auth gate to all unauthenticated 1inch proxy routes |
| Redis-backed rate limiting | Open | Replace in-memory rate limiter with shared store |
| Server-side plugin execution | Deferred | Move plugin execution server-side; remove API key exposure risk |
| Fix faucet IP spoofing | Open | Use platform-provided request IP, reject user headers |

See [Security Findings](./security-findings) for the full findings list and priority order.
