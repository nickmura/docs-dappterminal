---
sidebar_position: 2
title: Command Interface
description: Command, CommandResult, and CommandScope TypeScript interfaces with annotations.
---

# Command Interface

TypeScript interface definitions for the core command system.

**Implementation:** `src/core/types.ts`, `src/core/monoid.ts`

---

## Command

The primary interface for all commands in the system.

```typescript
interface Command<TArgs = string, TResult = unknown> {
  id: string
  scope: CommandScope
  protocol?: ProtocolId
  description: string

  run(args: TArgs, context: ExecutionContext): Promise<CommandResult<TResult>>
}
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique identifier within the command's scope. No colons allowed. |
| `scope` | `CommandScope` | One of `'G_core'`, `'G_alias'`, `'G_p'`. Must be exact string literal. |
| `protocol` | `ProtocolId?` | Required for `G_p` commands. Must match the fiber's `id`. |
| `description` | `string` | Human-readable description shown in `help` output. |
| `run` | `function` | The command implementation. |

**Type parameters:**
- `TArgs` — the type of the args passed to `run`. Defaults to `string` (raw CLI input).
- `TResult` — the type of the successful result value. Defaults to `unknown`.

---

## CommandScope

```typescript
type CommandScope = 'G_core' | 'G_alias' | 'G_p'
```

| Value | Description |
|-------|-------------|
| `'G_core'` | Global command, always available. Defined in `src/core/commands.ts`. |
| `'G_alias'` | Protocol-agnostic alias (planned, not yet implemented). |
| `'G_p'` | Protocol-specific command. Must have a `protocol` field. |

---

## CommandResult

The return type of `command.run()`.

```typescript
type CommandResult<T> =
  | { success: true; value: T }
  | { success: false; error: Error }
```

**Always check `success` before accessing `value`:**

```typescript
const result = await command.run(args, context)

if (!result.success) {
  console.error(result.error.message)
  return result
}

console.log(result.value)
```

**Pipeline output extension (planned):**

```typescript
// Future extension for pipeline DSL support
type CommandResult<T> =
  | { success: true; value: T; pipelineOutput?: PipelineOutput }
  | { success: false; error: Error }
```

---

## ExecutionContext

The runtime state passed to `command.run()`.

```typescript
interface ExecutionContext {
  activeProtocol?: ProtocolId

  protocolState: Map<ProtocolId, unknown>
  globalState?: Record<string, unknown>

  history: CommandHistoryEntry[]

  wallet: {
    address?: string
    chainId?: number
    isConnected: boolean
  }
}
```

See [Concepts: Execution Context](../concepts/execution-context.md) for full documentation.

---

## CommandHistoryEntry

```typescript
interface CommandHistoryEntry {
  id: string
  input: string
  result: CommandResult<unknown>
  timestamp: number
  protocol?: ProtocolId
}
```

---

## ProtocolId

```typescript
type ProtocolId = string
```

A string identifier that uniquely names a protocol. Examples: `'1inch'`, `'wormhole'`, `'coinpaprika'`. Must match the plugin's `metadata.id` exactly.

---

## ResolutionContext

Passed to the resolution operators (ρ, ρ_f).

```typescript
interface ResolutionContext {
  input: string
  executionContext: ExecutionContext
  explicitProtocol?: ProtocolId   // From --protocol flag
}
```

---

## ResolvedCommand

Returned by the exact resolver ρ.

```typescript
interface ResolvedCommand {
  command: Command
  protocol?: ProtocolId
  resolutionMethod: 'exact' | 'alias' | 'fuzzy'
  confidence?: number              // Used by ρ_f
}
```

---

## identityCommand

The global identity element of the monoid.

```typescript
export const identityCommand: Command = {
  id: 'identity',
  scope: 'G_core',
  run: async <T>(args: T): Promise<CommandResult<T>> => {
    return { success: true, value: args }
  }
}
```

**Implementation:** `src/core/monoid.ts:45`

---

## composeCommands

Binary composition operation for the monoid.

```typescript
function composeCommands<A, B, C>(
  f: Command<A, B>,
  g: Command<B, C>
): Command<A, C>
```

Preserves protocol scope when both commands are in the same fiber:

```typescript
// If f.scope === 'G_p' && g.scope === 'G_p' && f.protocol === g.protocol:
//   result.scope = 'G_p', result.protocol = f.protocol  (fiber closure maintained)
// Otherwise:
//   result.scope = 'G_core'
```

**Implementation:** `src/core/monoid.ts:55`
