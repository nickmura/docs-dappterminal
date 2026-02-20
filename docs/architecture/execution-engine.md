---
sidebar_position: 4
title: Execution Engine
description: The headless kernel model, current CLI hardening status, and the execution engine roadmap.
---

# Execution Engine

This page describes the target architecture for dappTerminal's execution core and the hardening plan required before shipping the pipeline DSL and multi-surface (CLI + GUI) support.

**Source:** `docs/notes/notes_feb14.md`

---

## Core Position

The current product direction is valid: CLI-first, GUI later.

The correction is architectural:
- **The CLI should be a client of the runtime, not the runtime itself.**
- **The business logic source of truth should be a headless execution core.**

Unix analogy:
- **Kernel** — execution/runtime engine (headless, typed, testable).
- **Shell** — terminal adapter (text parsing + rendering).
- **Desktop** — visual adapter (swap windows, provider UI, charts, etc.).

---

## Current State (Actual)

Today, `src/components/cli.tsx` is simultaneously:
- The text parser
- The command resolver
- The execution engine
- The transaction signing orchestrator
- The history manager
- The tab state manager

This works for a single UI surface, but it makes testing impossible and creates the blockers listed below.

---

## Current Blockers for Pipeline DSL

Before implementing the full sequential command DSL (see [Guides: Pipeline DSL](../guides/pipeline-dsl.md)), the following execution-path weaknesses must be fixed:

### 1. No handler return channel
Handler contract returns `Promise<void>`, so post-handler structured chaining data (e.g., amount received after swap) is not available for the next pipeline step.

### 2. Handler path bypasses history updates
Early returns in the handler flow skip the unified `updateExecutionContext` call. This means `ExecutionContext.history` diverges from what the terminal renders.

### 3. Global execution lock is not a scheduler
A single `isExecuting` boolean with drop-on-busy behavior is unsafe for deterministic multi-step pipeline execution. A queued command could be silently dropped.

### 4. Parser is too primitive for DSL grammar
Current split-based parsing cannot handle `&&`, `=> $var`, `$var.field`, quoting, or escaping.

### 5. Pipeline variable store lifecycle is undefined
No clean, execution-scoped variable environment is currently enforced.

---

## Phase 0: Execution Core Hardening

Before shipping the DSL, implement these strengthening steps:

### 1. Add HandlerResult contract
```typescript
interface HandlerResult {
  success: boolean
  pipelineOutput?: PipelineOutput  // Structured output for next step
  contextPatch?: Partial<ExecutionContext>  // Controlled context updates
}
```

### 2. Guarantee context update for all paths
Both the normal command path and the handler path must call `updateExecutionContext` consistently. History should never diverge.

### 3. Replace global lock with per-tab FIFO queue
```typescript
// Instead of:
let isExecuting = boolean

// Use:
const tabQueue = new Map<tabId, Queue<PendingCommand>>()
```

This ensures deterministic sequencing and no silent command drops.

### 4. Extract command parse/resolve/execute from cli.tsx
Move into a testable `ExecutionEngine` service/module with a clear boundary:

```typescript
// Target interface
class ExecutionEngine {
  resolve(input: string, context: ExecutionContext): ResolvedCommand | null
  execute(command: ResolvedCommand, context: ExecutionContext): Promise<CommandResult>
  runHandler(result: CommandResult, context: ExecutionContext): Promise<HandlerResult>
}
```

### 5. Add runtime event model
Emit typed events that both CLI and GUI can subscribe to:

```typescript
type RuntimeEvent =
  | { type: 'quote_ready'; data: QuoteData }
  | { type: 'tx_requested'; data: TxRequest }
  | { type: 'tx_sent'; data: { hash: string } }
  | { type: 'tx_confirmed'; data: { hash: string; receipt: Receipt } }
  | { type: 'error'; data: { message: string } }
```

---

## Target Architecture

### ExecutionEngine (headless)

Responsibilities:
- Resolve command + protocol binding.
- Execute command and handler lifecycle.
- Maintain execution context and history.
- Emit structured events.
- Own queue and scheduling semantics.

### Interface Adapters

**CLI Adapter** (`src/components/cli.tsx`)
- Text parser and prompt interaction.
- Subscribes to runtime events and renders terminal output.
- No business logic — only rendering and input.

**Desktop/UI Adapter** (future)
- Typed input forms and visual flow controls.
- Subscribes to the same events for graphical presentation.
- Calls the same `ExecutionEngine` as the CLI.

**Outcome:** No duplicated business logic between terminal and GUI. Visual components become first-class clients of the same runtime.

---

## Sequential DSL Rollout (after hardening)

Once Phase 0 is complete:

**Phase A:** `cmd1 && cmd2` only (no variable binding).

**Phase B:** Variable capture and interpolation: `=> $var`, `$var.field`.

**Phase C:** `--dry-run` and `--confirm` workflow support.

See [Guides: Pipeline DSL](../guides/pipeline-dsl.md) for the full design specification.

---

## Design Guardrails

1. **UI must never bypass the execution engine** for protocol operations.
2. **Text parsing remains CLI-specific**; the runtime API remains typed.
3. **Plugin handlers should return structured outputs**, not UI-specific side effects.
4. **Logging must be gated** (`process.env.NODE_ENV === 'development'`), never ad-hoc runtime noise.

---

## Why CLI Hardening Comes Before DSL

Shipping the full sequential DSL in the current state would amplify existing weaknesses:

- Pipeline steps depend on handler results → but handlers don't return values yet.
- DSL semantics require deterministic ordering → but the current lock can silently drop commands.
- Variable interpolation requires parsed AST → but the current parser is string-split only.
- Pipeline state must survive across steps → but history updates are inconsistent.

Hardening first means the DSL is built on a solid foundation, not on workarounds.
