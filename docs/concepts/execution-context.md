---
sidebar_position: 4
title: Execution Context
description: Per-tab runtime state — activeProtocol, protocolState, history, and wallet.
---

# Execution Context

The `ExecutionContext` is the runtime state that the algebraic command system operates on. Each terminal tab has its own independent `ExecutionContext`, which is what allows multiple protocol sessions to run simultaneously without interfering with each other.

**Implementation:** `src/core/types.ts`

---

## Shape

```typescript
interface ExecutionContext {
  activeProtocol?: ProtocolId           // Current fiber (undefined = in M_G)

  protocolState: Map<ProtocolId, any>   // Per-protocol session cache
  globalState?: Record<string, unknown> // Global key-value store (pipeline vars)

  history: CommandHistoryEntry[]        // Execution log

  wallet: {
    address?: string
    chainId?: number
    isConnected: boolean
  }
}
```

---

## Fields

### `activeProtocol`

The currently active protocol fiber. When set, unqualified commands resolve against this fiber first before falling back to G_core.

- **Set by:** `use <protocol>` (G_core command)
- **Cleared by:** `exit` (G_core command)
- **Effect on resolution:** When `activeProtocol = 'wormhole'`, typing `bridge` resolves to `wormhole:bridge`. Cross-fiber access via namespace is blocked.

```typescript
// Context when inside Wormhole fiber
{
  activeProtocol: 'wormhole',
  // ...
}

// Context when in global monoid M_G
{
  activeProtocol: undefined,
  // ...
}
```

### `protocolState`

A `Map<ProtocolId, any>` where each protocol stores its own session cache. This is the canonical location for:

- Cached quotes (avoid re-fetching on `execute` after `quote`)
- Selected route or route type
- Step execution state
- Pending transaction hashes

**Example shapes:**

```typescript
protocolState: {
  wormhole: {
    lastQuote: { bestRoute, quotes, transferRequest },
    selectedRouteType: 'AutomaticCCTPRoute',
  },
  stargate: {
    lastQuote: { stargateSteps, fullQuote },
  },
  lifi: {
    selectedRoute: { id, steps, fees },
    execution: { stepHashes, updatedAt },
  },
}
```

**Caching guidance:**
- Only store serializable data (no functions, no class instances).
- Invalidate cached quotes when `wallet.chainId` changes.
- Store user-facing identifiers (tx hash, request ID) so follow-up commands can reference them.
- Use a `lastUpdated` timestamp if you need staleness detection.

### `globalState`

A catch-all key-value store for shared state that crosses protocol boundaries. Currently used as the variable store for the pipeline DSL (when implemented). Plugins generally should not write here — use `protocolState` instead.

### `history`

An ordered log of command executions. Used by the `history` G_core command and for UX debugging.

```typescript
interface CommandHistoryEntry {
  id: string
  input: string
  result: CommandResult<unknown>
  timestamp: number
  protocol?: ProtocolId
}
```

**Known issue:** In the current implementation, commands that go through the handler dispatch path (transaction signing flows) may not update `history` consistently. This is a tracked issue. See [Internal: Known Issues](../internal/known-issues).

### `wallet`

Current wallet connection state, synced from wagmi hooks.

```typescript
wallet: {
  address?: string    // Connected address (undefined if not connected)
  chainId?: number    // Active chain (undefined if not connected)
  isConnected: boolean
}
```

Protocol commands should guard on `wallet.isConnected` before attempting transaction execution. Some commands (quote, status) work without a wallet.

---

## Per-Tab Isolation

Each tab gets its own `ExecutionContext` instance:

```typescript
// In src/app/page.tsx / src/components/cli.tsx
const [contexts, setContexts] = useState<Map<string, ExecutionContext>>()

// Each tab keyed by tabId
const tabContext = contexts.get(tabId)
```

This means:
- Tab A can be inside the 1inch fiber while Tab B is inside the Wormhole fiber.
- Cached quotes in Tab A's `protocolState.wormhole` are not visible in Tab B.
- Command history is per-tab.

**Important:** The plugin registry and protocol fiber registrations are global (shared across tabs). Only the execution context — active protocol, protocol state, history, wallet — is per-tab.

---

## Accessing Protocol State in Commands

Commands receive the `ExecutionContext` as a parameter:

```typescript
const quoteCommand: Command = {
  id: 'quote',
  scope: 'G_p',
  protocol: 'wormhole',

  async run(args: string, context: ExecutionContext) {
    // Read existing state
    const cached = context.protocolState.get('wormhole')?.lastQuote

    // Fetch quote
    const quote = await fetchQuote(args)

    // Write state (immutable update pattern)
    context.protocolState.set('wormhole', {
      ...context.protocolState.get('wormhole'),
      lastQuote: quote,
    })

    return { success: true, value: quote }
  }
}
```

---

## ExecutionContext and the Algebraic Model

In the fibered monoid model, the `ExecutionContext` is the environment threaded through command execution. Commands are not pure functions — they can read and write context. This is intentional: DeFi operations are inherently stateful (you quote first, execute second, using the cached quote).

The `activeProtocol` field is the runtime embodiment of "which fiber is active". Setting it to `'1inch'` is equivalent to entering M_1inch in the algebraic model. The resolution operators (π, σ, ρ) consult `activeProtocol` to enforce fiber isolation.
