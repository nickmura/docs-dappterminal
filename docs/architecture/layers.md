---
sidebar_position: 1
title: System Layers
description: The four-layer architecture — CLI/Terminal UI, Core Runtime, Plugin Layer, and API Layer.
---

# System Layers

dappTerminal has four distinct layers. Each layer has a clear boundary so command composition in M stays clean while protocol work stays inside M_p fibers.

## Layer Map

```
User Input
  ▼
CLI / Terminal UI
  ▼
Core Runtime (Monoid + Registry)
  ▼
Plugin Layer (Protocol Fibers)
  ▼
API Layer (Server Routes)
  ▼
Shared Libs + External Services
```

---

## 1. CLI / Terminal UI

**Primary responsibility:** user interaction, parsing, and rendering.

- Captures raw input, splits command + args, and routes to the command registry.
- Owns the tab model; each tab has its own `ExecutionContext`.
- Connects wallet state (address, chain ID, connection status) to the runtime.
- Presents transaction drafts and confirmations before signing.

**Primary surfaces:**
- `src/components/cli.tsx` — main terminal component
- `src/app/page.tsx` — RainbowKit wallet provider, tab management
- `src/app/layout.tsx` — application shell

**Key features:**
- Multi-line command support
- Arrow key history navigation (up/down through `ExecutionContext.history`)
- Tab completion via ρ_f fuzzy resolver
- Protocol context indicator (`user@1inch>` when inside a fiber)
- Multi-tab model with independent execution contexts

---

## 2. Core Runtime (Monoid + Registry)

**Primary responsibility:** algebraic guarantees and command dispatch.

- Composition and identity defined in (M, ∘, e).
- Commands partitioned into G_core, G_alias (planned), and G_p.
- Resolution operators π, σ, ρ, ρ_f enforce fiber routing.
- Execution context provides protocol-scoped state and history.

**Primary surfaces:**
- `src/core/monoid.ts` — identity, composition, `createProtocolFiber`, `addCommandToFiber`
- `src/core/command-registry.ts` — all four resolution operators
- `src/core/types.ts` — `ExecutionContext`, `Command`, `CommandResult` interfaces
- `src/core/commands.ts` — G_core command implementations

**Resolution flow:**

```
command input
      │
      ▼
  alias resolution
      │
      ▼
  G_core check
      │
      ├─ found → execute
      │
      └─ G_p check
             │
             ├─ explicit --protocol flag
             ├─ P:command namespace
             ├─ activeProtocol context
             └─ user preference
```

---

## 3. Plugin Layer (Protocol Fibers)

**Primary responsibility:** protocol-specific command surfaces.

- Each plugin exposes commands in G_p with `scope: 'G_p'` and a protocol id.
- Plugins register through the plugin loader and create fibers via `createProtocolFiber`.
- Commands shape inputs, call API routes or SDKs, and update protocol state.

**Primary surfaces:**
- `src/plugins/plugin-loader.ts` — initializes plugins and validates fiber invariants
- `src/plugins/*/index.ts` — plugin metadata and `initialize()` entry point
- `src/plugins/*/commands.ts` — G_p command implementations
- `src/plugins/*/types.ts` — protocol-specific TypeScript types
- `src/plugins/_template/` — canonical template for new plugins

**Plugin structure:**

```
src/plugins/[protocol]/
├── index.ts          # Plugin metadata & initialization
├── commands.ts       # Protocol commands (G_p scope)
├── types.ts          # Protocol-specific types
├── handlers.ts       # Transaction signing handlers (if needed)
└── ARCHITECTURE.md   # Protocol-specific docs
```

**Implemented plugins:**

| Plugin | Directory | Status |
|--------|-----------|--------|
| 1inch | `src/plugins/1inch/` | ✅ Complete |
| LiFi | `src/plugins/lifi/` | ✅ Complete |
| Wormhole | `src/plugins/wormhole/` | ✅ Complete |
| Stargate | `src/plugins/stargate/` | ✅ Complete |
| CoinPaprika | `src/plugins/coinpaprika/` | ✅ Complete |
| Uniswap v4 | `src/plugins/uniswap-v4/` | 🚧 In progress |
| Aave v3 | `src/plugins/aave-v3/` | 📋 Planned |
| Faucet | `src/plugins/faucet/` | ✅ Complete |

---

## 4. API Layer (Next.js App Router)

**Primary responsibility:** server-side proxy and security boundary.

- Hosts `/api/[protocol]/[action]` routes.
- Keeps API keys server-side and normalizes response envelopes.
- Returns unsigned transaction payloads for client-side signing.
- Enforces authentication (API key validation) and rate limiting.

**Primary surfaces:**
- `src/app/api/README.md` — API route conventions
- `src/app/api/*/route.ts` — individual route handlers

**Standard response format:**

```typescript
// Success
{ success: true, data: T }

// Error
{ success: false, error: string }
```

**Security model:**
- API key authentication via `x-api-key` header (production)
- Per-endpoint rate limits (10–100 req/min)
- RPC method allowlist on 1inch proxy (read-only only; `eth_sendRawTransaction` blocked)
- No server-side transaction signing — routes return payloads, clients sign

---

## 5. Shared Libraries

**Primary responsibility:** reusable helpers to avoid drift between API routes and plugins.

- Chain maps, token registries, quote builders, and formatters.
- Shared by API routes and plugins for consistent behavior.

**Primary surfaces:**
- `src/lib/chains.ts` — chain configuration (7 chains + protocol mappings)
- `src/lib/wormhole.ts`, `src/lib/wormhole-sdk.ts` — Wormhole helpers
- `src/lib/stargate.ts` — Stargate helpers
- `src/lib/lifi.ts` — LiFi helpers
- `src/lib/faucet/` — faucet services
- `src/lib/auth.ts` — API authentication utilities
- `src/lib/rate-limit.ts` — in-memory rate limiting (Redis migration planned)

---

## Layer Boundaries

These rules enforce the layer separation:

- **CLI must not embed protocol secrets.** All secrets stay in API routes.
- **Plugins must not bypass the registry.** Always resolve via ρ — never call command functions directly.
- **API routes return data, never sign transactions.** Transaction signing is always client-side via wagmi/viem.
- **Shared libs are the only place where cross-layer utility logic lives.** Don't duplicate chain maps in multiple places.
- **Core commands must remain protocol-agnostic.** G_core commands should not import from `src/plugins/` directly (the current CoinPaprika/Faucet exception is a known inconsistency — see [Internal: Known Issues](../internal/known-issues)).
