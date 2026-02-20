---
sidebar_position: 3
title: Command Scopes
description: G_core, G_alias, and G_p — the three disjoint command partitions in dappTerminal.
---

# Command Scopes

The global command set G is partitioned into three disjoint scopes:

**G = G_core ∪ G_alias ∪ G_p**

This partition is an invariant of the system: a command belongs to exactly one scope, enforced at registration time.

---

## G_core — Core Commands

**Definition:** Global commands available in all contexts, with no protocol dependency.

**TypeScript tag:** `scope: 'G_core'`

**Implementation:** `src/core/commands.ts`

**Commands:**

| Command | Description |
|---------|-------------|
| `help` | Fiber-aware command listing — shows current fiber's commands + essential globals |
| `use <protocol>` | Enter a protocol fiber (sets `activeProtocol`) |
| `exit` | Exit current protocol fiber (clears `activeProtocol`) |
| `history` | Show command execution log from ExecutionContext |
| `wallet` | Show wallet connection status |
| `whoami` | Display connected address |
| `balance` | Show wallet token balance |
| `price <symbol>` | Get token price (routes to 1inch or CoinPaprika via `--protocol` flag) |
| `chart <type>` | Add chart to analytics panel |
| `clear` | Clear terminal output |

**Key property:** G_core commands are always available regardless of which fiber is active. When inside a protocol fiber, `help` shows the fiber's commands plus an "essential globals" subset (help, exit, clear, history, wallet, whoami, balance).

---

## G_alias — Aliased Commands

**Definition:** Protocol-agnostic commands that bind to a protocol fiber at runtime based on active context or user preferences.

**TypeScript tag:** `scope: 'G_alias'`

**Status:** Planned — not yet implemented. Requires 2+ protocols implementing the same function (e.g., two DEX protocols both implementing `swap`).

**Deferred to:** v2.0

**Example (future):**

```bash
# When both Uniswap and 1inch are available, 'swap' is a G_alias
# It resolves to the active protocol's swap command:
user@uniswap> swap 10 usdc eth    # → uniswap:swap
user@1inch> swap 10 usdc eth      # → 1inch:swap
user@defi> swap 10 usdc eth       # → resolves by preference/default
```

**Open question:** Default protocol ordering for alias resolution (user preference vs chain context). See [Internal: Roadmap](../internal/roadmap).

---

## G_p — Protocol-Specific Commands

**Definition:** Commands bound to a specific protocol P. Together, all G_p commands for protocol P form the protocol fiber M_P.

**TypeScript tag:** `scope: 'G_p'`, `protocol: '<protocol-id>'`

**Implementation:** `src/plugins/[protocol]/commands.ts`

**Examples:**

| Command | Protocol | Namespace form |
|---------|----------|---------------|
| `swap` | 1inch | `1inch:swap` |
| `quote` | 1inch | `1inch:quote` |
| `bridge` | lifi | `lifi:bridge` |
| `routes` | lifi | `lifi:routes` |
| `bridge` | wormhole | `wormhole:bridge` |
| `quote` | wormhole | `wormhole:quote` |
| `bridge` | stargate | `stargate:bridge` |
| `cprice` | coinpaprika | `coinpaprika:cprice` |
| `coinsearch` | coinpaprika | `coinpaprika:coinsearch` |
| `cchart` | coinpaprika | `coinpaprika:cchart` |

**Resolution:** G_p commands are resolved in priority order:
1. Explicit `--protocol` flag
2. Namespaced form (`protocol:command`)
3. Active protocol context (set via `use`)
4. User preferences

---

## Partition Invariant

The three scopes are mutually exclusive. The invariant is:

```
G_core ∩ G_alias = ∅
G_core ∩ G_p = ∅
G_alias ∩ G_p = ∅
```

This is enforced programmatically:

- **G_core commands** are registered via `registerCoreCommands()` into the `coreCommands` map.
- **G_alias commands** would be registered into the `aliasedCommands` map (future).
- **G_p commands** are registered via `addCommandToFiber()`, which validates `scope === 'G_p'` and `protocol === fiber.id` before adding.

If a command attempts to register with the wrong scope, `addCommandToFiber` throws:

```typescript
if (command.scope !== 'G_p') {
  throw new Error(`Expected G_p scope, got ${command.scope}`)
}
if (command.protocol !== fiber.id) {
  throw new Error(`Protocol mismatch: ${command.protocol} !== ${fiber.id}`)
}
```

---

## Practical Implications

**For users:**
- G_core commands work anywhere. You never lose access to `help`, `exit`, `wallet`, etc.
- To access protocol commands without entering the fiber, use namespace syntax: `1inch:swap`.
- When inside a fiber, unqualified commands resolve to that fiber's commands first.

**For plugin authors:**
- Every command in your plugin **must** use `scope: 'G_p'` and `protocol: '<your-id>'`.
- Never use `scope: 'G_core'` in a plugin command — it will either throw (if passed to `addCommandToFiber`) or pollute the global namespace (if imported directly into core commands).
- The protocol ID in your command must match your plugin's `metadata.id` exactly.

See [Guides: Add a Command](../guides/add-a-command.md) for the full workflow.
