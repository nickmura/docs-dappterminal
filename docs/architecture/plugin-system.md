---
sidebar_position: 2
title: Plugin System
description: Plugin lifecycle, fiber creation, command registration, and the plugin loader.
---

# Plugin System

The plugin system is how dappTerminal achieves extensibility without sacrificing the algebraic guarantees of the fibered monoid. Each protocol is a self-contained plugin that creates its own fiber and registers its commands into that fiber.

**Implementation:** `src/plugins/plugin-loader.ts`, `src/plugins/*/index.ts`

---

## Plugin Interface

Every plugin implements this interface:

```typescript
interface Plugin {
  metadata: {
    id: ProtocolId        // Unique identifier, e.g., 'wormhole'
    name: string          // Display name, e.g., 'Wormhole'
    version: string       // Semver, e.g., '1.0.0'
    description: string
    tags: string[]        // e.g., ['bridge', 'cross-chain']
  }

  defaultConfig: PluginConfig

  initialize(context: ExecutionContext): Promise<ProtocolFiber>
}
```

The `initialize` function receives the current execution context and must return a `ProtocolFiber`. The fiber is what the plugin registers into the global command registry.

---

## ProtocolFiber

A `ProtocolFiber` is the runtime representation of a protocol submonoid M_P:

```typescript
interface ProtocolFiber {
  id: ProtocolId
  name: string
  description?: string
  commands: Map<string, Command>  // All G_p commands for this protocol
}
```

The plugin loader validates that `fiber.id === plugin.metadata.id` before registration, enforcing the section law `π(σ(P)) = P`.

---

## Plugin Lifecycle

1. **Loading** — the plugin loader calls `plugin.initialize(context)` for each registered plugin.
2. **Validation** — the loader checks `fiber.id === plugin.metadata.id`.
3. **Registration** — the fiber is stored in the global command registry via `σ`.
4. **Availability** — from this point, `σ(P)` returns the fiber and ρ can resolve G_p commands.

**Current behavior:** Plugins are loaded once per tab creation into a global `pluginLoader` singleton. This means the fiber registry is global while execution contexts are per-tab. Known limitation — see [Internal: Known Issues](../internal/known-issues).

---

## Creating a Protocol Fiber

Use `createProtocolFiber` from `src/core/monoid.ts`:

```typescript
import { createProtocolFiber, addCommandToFiber } from '@/core/monoid'

async function initialize(context: ExecutionContext): Promise<ProtocolFiber> {
  // Creates fiber with automatic protocol-specific identity injection
  const fiber = createProtocolFiber('my-protocol', 'My Protocol')

  // Register commands into the fiber
  addCommandToFiber(fiber, swapCommand)
  addCommandToFiber(fiber, quoteCommand)

  return fiber
}
```

`createProtocolFiber` automatically injects the protocol-specific identity element `e_P` into the fiber's command map. This is what makes M_P a proper submonoid (not just a semigroup).

---

## Adding Commands to a Fiber

Use `addCommandToFiber` to register a command. It validates the command's scope and protocol before adding:

```typescript
import { addCommandToFiber } from '@/core/monoid'

addCommandToFiber(fiber, myCommand)
// Throws if: command.scope !== 'G_p'
// Throws if: command.protocol !== fiber.id
```

Command definition:

```typescript
const swapCommand: Command = {
  id: 'swap',
  scope: 'G_p',
  protocol: 'my-protocol',
  description: 'Swap tokens via My Protocol',

  async run(args: string, context: ExecutionContext): Promise<CommandResult<SwapResult>> {
    // Parse args, call API route, return result
    return { success: true, value: result }
  }
}
```

---

## Plugin Registration

Plugins are registered in `src/plugins/index.ts`:

```typescript
import { myProtocolPlugin } from './my-protocol'

export const plugins = [
  oneinchPlugin,
  lifiPlugin,
  wormholePlugin,
  stargatePlugin,
  myProtocolPlugin,  // Add here
]
```

The plugin loader iterates this array and calls `initialize` for each during startup.

---

## Plugin Directory Structure

```
src/plugins/[protocol]/
├── index.ts          # Plugin metadata & initialize()
├── commands.ts       # G_p command implementations
├── types.ts          # Protocol-specific TypeScript types
├── handlers.ts       # Transaction signing handlers (if needed)
└── ARCHITECTURE.md   # Protocol-specific notes
```

The `handlers.ts` file (optional) contains the wallet interaction logic — signing transactions, broadcasting, and waiting for confirmations. Handlers are called by the CLI after the command's `run()` returns a payload.

---

## Handlers

Some protocol commands return transaction payloads that require wallet interaction (user confirmation, signing, broadcast). These go through **handlers** — functions that the CLI dispatches to after `command.run()`:

```typescript
// In src/plugins/my-protocol/handlers.ts
export const myProtocolHandlers: HandlerMap = {
  'swap': async (result, context, walletClient) => {
    const tx = result.value.transaction
    const hash = await walletClient.sendTransaction(tx)
    // Track, update history, return
  }
}
```

**Known issue:** The current handler dispatch path has a protocol mismatch risk for alias commands. See [Internal: Known Issues](../internal/known-issues) for details and planned fix.

---

## Scaffold a New Plugin

```bash
cp -r src/plugins/_template src/plugins/my-protocol
```

Then:
1. Update `metadata.id`, `name`, `description`, `tags` in `index.ts`
2. Implement commands in `commands.ts`
3. Add API routes in `src/app/api/my-protocol/` if needed
4. Register the plugin in `src/plugins/index.ts`
5. Write `src/plugins/my-protocol/ARCHITECTURE.md`

For the full step-by-step guide, see [Guides: Create a Plugin](../guides/create-a-plugin.md).
