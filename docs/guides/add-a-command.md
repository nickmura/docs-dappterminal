---
sidebar_position: 4
title: Add a Command
description: Adding a new G_p command to an existing protocol plugin.
---

# Add a Command

This guide covers adding a single command to an existing protocol plugin. For creating a new plugin from scratch, see [Guides: Create a Plugin](./create-a-plugin.md).

---

## Step 1: Define the Command Object

In `src/plugins/[protocol]/commands.ts`:

```typescript
import type { Command, CommandResult } from '@/core/types'

export const statusCommand: Command<string, StatusResult> = {
  id: 'status',
  scope: 'G_p',
  protocol: 'my-protocol',    // Must match the plugin's metadata.id exactly
  description: 'Check the status of the last transaction',

  async run(args: string, context): Promise<CommandResult<StatusResult>> {
    // Read cached state
    const state = context.protocolState.get('my-protocol')
    if (!state?.lastTxHash) {
      return {
        success: false,
        error: new Error('No recent transaction. Run a swap first.'),
      }
    }

    // Fetch status
    const response = await fetch(`/api/my-protocol/status?tx=${state.lastTxHash}`)
    const result = await response.json()

    if (!result.success) {
      return { success: false, error: new Error(result.error) }
    }

    return { success: true, value: result.data }
  },
}
```

**Required fields:**
- `id` — unique within the fiber (string, no colons).
- `scope: 'G_p'` — exact string literal, not a variable.
- `protocol` — exact match of the plugin's `metadata.id`.
- `run` — async function accepting `(args: string, context: ExecutionContext)`.

---

## Step 2: Register with addCommandToFiber

In `src/plugins/[protocol]/index.ts`, import and register:

```typescript
import { statusCommand } from './commands'

async function initialize(context: ExecutionContext): Promise<ProtocolFiber> {
  const fiber = createProtocolFiber('my-protocol', 'My Protocol')

  addCommandToFiber(fiber, swapCommand)
  addCommandToFiber(fiber, quoteCommand)
  addCommandToFiber(fiber, statusCommand)  // ← Add here

  return fiber
}
```

`addCommandToFiber` validates and will throw if:
- `command.scope !== 'G_p'`
- `command.protocol !== fiber.id`

---

## Step 3: Decide on API Route vs Direct SDK

**Use an API route if:**
- The call requires a secret API key.
- The response needs server-side transformation.
- You want authentication and rate limiting.
- The SDK must run server-side (e.g., Wormhole SDK).

**Use direct client-side code if:**
- The call is a public read-only RPC (`eth_getBalance`, etc.).
- You're using wagmi hooks directly.
- There's no secret involved.

Most protocol integrations use API routes for quotes and SDK calls, and direct wagmi calls for transaction submission.

---

## Step 4: Handle Protocol State

If your command reads or writes cached data:

```typescript
// Read
const cached = context.protocolState.get('my-protocol')?.lastQuote

// Write (always use spread to avoid overwriting other fields)
context.protocolState.set('my-protocol', {
  ...context.protocolState.get('my-protocol'),
  lastStatus: statusResult,
  lastStatusAt: Date.now(),
})
```

**Rules:**
- Only store serializable data (no functions, no Promise objects).
- Include `lastUpdated` timestamps if you need staleness detection.
- Invalidate quotes when `context.wallet.chainId` changes.

---

## Step 5: Pre-flight Quality Checks

Before considering the command done:

- [ ] Input parsing handles missing/invalid args with a helpful usage message.
- [ ] Output schema is deterministic (same input → same output shape).
- [ ] Error messages are user-facing strings, not raw exception messages.
- [ ] Uses the standard API response envelope (`{ success, data|error }`) when calling routes.
- [ ] Guards on `context.wallet.isConnected` if the command requires a wallet.
- [ ] No secrets hardcoded in the command file.

---

## Command Scope Rules

| Scope | Where defined | Who registers it |
|-------|---------------|-----------------|
| `G_core` | `src/core/commands.ts` | Core — not plugins |
| `G_alias` | Future | Core — not plugins |
| `G_p` | `src/plugins/[protocol]/commands.ts` | Plugin via `addCommandToFiber` |

**Never use `G_core` scope in a plugin.** If you want a shorthand alias (like `cprice` for CoinPaprika), it should either be a `G_core` command registered by core (not ideal), or a protocol-local alias that resolves when the user is inside the fiber.

---

## Example: Adding a Status Command to Stargate

```typescript
// src/plugins/stargate/commands.ts
export const statusCommand: Command = {
  id: 'status',
  scope: 'G_p',
  protocol: 'stargate',
  description: 'Check the status of the last bridge transaction',

  async run(args, context) {
    const state = context.protocolState.get('stargate')
    if (!state?.lastTxHash) {
      return {
        success: false,
        error: new Error('No recent bridge transaction found. Run bridge first.'),
      }
    }

    const response = await fetch(`/api/stargate/status?tx=${state.lastTxHash}`)
    const result = await response.json()

    if (!result.success) {
      return { success: false, error: new Error(result.error) }
    }

    return {
      success: true,
      value: {
        status: result.data.status,
        explorerUrl: result.data.explorerUrl,
      },
    }
  },
}
```

Then in `src/plugins/stargate/index.ts`:

```typescript
addCommandToFiber(fiber, quoteCommand)
addCommandToFiber(fiber, bridgeCommand)
addCommandToFiber(fiber, statusCommand)  // ← New
```

After restarting the dev server:

```bash
user@stargate> status
  → Status: CONFIRMED
  → Explorer: https://...
```
