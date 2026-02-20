---
sidebar_position: 3
title: Plugin Interface
description: Plugin, ProtocolFiber, and PluginConfig TypeScript interfaces with lifecycle notes.
---

# Plugin Interface

TypeScript interface definitions for the plugin system.

**Implementation:** `src/plugins/types.ts`, `src/core/monoid.ts`

---

## Plugin

The interface every protocol plugin must implement.

```typescript
interface Plugin {
  metadata: PluginMetadata
  defaultConfig: PluginConfig
  initialize(context: ExecutionContext): Promise<ProtocolFiber>
}
```

| Field | Description |
|-------|-------------|
| `metadata` | Static plugin information (id, name, version, etc.) |
| `defaultConfig` | Default configuration values |
| `initialize` | Creates the fiber and registers commands. Called once per plugin load. |

---

## PluginMetadata

```typescript
interface PluginMetadata {
  id: ProtocolId      // Unique identifier — must match all commands' protocol field
  name: string        // Display name (e.g., 'Wormhole')
  version: string     // Semver (e.g., '0.2.0')
  description: string
  tags: string[]      // e.g., ['bridge', 'cross-chain']
}
```

**Critical:** `metadata.id` is the source of truth for the plugin's identity. It must:
- Match every `Command.protocol` field in the plugin's `commands.ts`.
- Match the fiber's `id` returned from `initialize`.
- Be unique across all registered plugins.

The plugin loader enforces `fiber.id === plugin.metadata.id` at registration time and throws if they differ.

---

## PluginConfig

```typescript
interface PluginConfig {
  enabled: boolean
  rpcUrl?: string
  // Protocol-specific config fields
  [key: string]: unknown
}
```

**Current status:** `defaultConfig` exists but is not injected into `initialize()` or command execution. Most defaults are unused beyond validation. See [Internal: Known Issues](../internal/known-issues).

---

## ProtocolFiber

The runtime representation of a protocol submonoid M_P.

```typescript
interface ProtocolFiber {
  id: ProtocolId
  name: string
  description?: string
  commands: Map<string, Command>
}
```

| Field | Description |
|-------|-------------|
| `id` | Protocol identifier — must match `Plugin.metadata.id` |
| `name` | Display name |
| `commands` | Map of command id → Command. Includes the auto-injected protocol identity. |

**Do not** manipulate `commands` directly. Use `addCommandToFiber` which validates scope and protocol before adding.

---

## createProtocolFiber

Creates a new `ProtocolFiber` with the protocol-specific identity element automatically injected.

```typescript
function createProtocolFiber(
  id: ProtocolId,
  name: string,
  description?: string
): ProtocolFiber
```

**Implementation:** `src/core/monoid.ts:128`

The injected identity command has:
```typescript
{
  id: 'identity',
  scope: 'G_p',
  protocol: id,
  description: `Identity operation for ${name}`,
  run: async <T>(args: T) => ({ success: true, value: args })
}
```

This ensures each M_P is a proper submonoid (not just a semigroup).

---

## addCommandToFiber

Validates and registers a command into a fiber's command map.

```typescript
function addCommandToFiber(fiber: ProtocolFiber, command: Command): void
```

**Throws if:**
- `command.scope !== 'G_p'`
- `command.protocol !== fiber.id`

**Implementation:** `src/core/monoid.ts:117`

---

## HandlerMap

Optional — for plugins with transaction signing flows.

```typescript
type HandlerMap = Record<string, Handler>

type Handler = (
  result: CommandResult<unknown>,
  context: ExecutionContext,
  walletClient: WalletClient
) => Promise<HandlerResult>

interface HandlerResult {
  success: boolean
  pipelineOutput?: PipelineOutput
}
```

Handlers are registered separately from commands and invoked by the CLI after `command.run()` returns a transaction payload. The handler receives the wallet client and is responsible for signing and broadcasting.

**Known issue:** The current handler dispatch path has a protocol mismatch risk for alias commands. See [Internal: Known Issues](../internal/known-issues).

---

## Plugin Registration

Plugins are exported from `src/plugins/index.ts` and loaded by the plugin loader:

```typescript
// src/plugins/index.ts
export const plugins: Plugin[] = [
  oneinchPlugin,
  lifiPlugin,
  wormholePlugin,
  stargatePlugin,
  coinpaprikaPlugin,
]
```

**Plugin loader:** `src/plugins/plugin-loader.ts`

The loader:
1. Calls `plugin.initialize(context)` for each plugin.
2. Validates `fiber.id === plugin.metadata.id`.
3. Registers the fiber into the global command registry.

**Current limitation:** The plugin loader is a global singleton. New tabs repeatedly call `loadPlugin()` into the same loader without guarding for already-loaded plugins. Initialization may repeat and overwrite the same registry entries. See [Internal: Known Issues](../internal/known-issues).
