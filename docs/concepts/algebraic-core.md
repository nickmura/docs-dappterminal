---
sidebar_position: 2
title: Algebraic Core
description: The fibered monoid formal specification that underpins dappTerminal's command system.
---

# Algebraic Core

This page describes the formal command model that powers dappTerminal. It combines the practical mental model with the rigorous algebraic specification. See [FIBERED-MONOID-SPEC.md](../notes/FIBERED-MONOID-SPEC.md) in the source for complete proofs and implementation compliance tables.

**Version:** 1.0.0 | **Status:** Implementation Complete

---

## Why a Monoid?

The command system needs three properties that a monoid provides naturally:

1. **Composition** — chain two commands to form a third, type-safely.
2. **Identity** — a no-op command that leaves context unchanged.
3. **Associativity** — chaining order doesn't matter for the result, only the sequence does.

These three properties together guarantee that command pipelines are predictable and that each protocol's commands can be composed freely within that protocol without affecting commands in another.

---

## The Core Model

### Commands Form a Monoid (M, ∘, e)

- **Set M** — all commands available in the system.
- **Composition (∘)** — chaining two commands to produce a new command: `(f ∘ g)(x) = g(f(x))`.
- **Identity (e)** — a no-op command that returns its input unchanged.

**Monoid laws:**

| Law | Expression |
|-----|-----------|
| Associativity | `(f ∘ g) ∘ h = f ∘ (g ∘ h)` |
| Left identity | `e ∘ f = f` |
| Right identity | `f ∘ e = f` |

**Implementation:** `src/core/monoid.ts` — `identityCommand`, `composeCommands`, `verifyMonoidLaws`.

---

### Command Scopes

Commands are partitioned into three **disjoint** scopes:

**G = G_core ∪ G_alias ∪ G_p**

Where:
- **G_core ∩ G_alias = ∅**
- **G_core ∩ G_p = ∅**
- **G_alias ∩ G_p = ∅**

| Scope | Description | Examples |
|-------|-------------|---------|
| `G_core` | Global commands, always available in any context | `help`, `use`, `exit`, `wallet`, `balance`, `whoami` |
| `G_alias` | Protocol-agnostic aliases that bind at runtime | `swap`, `bridge` (planned — requires 2+ protocols sharing a function) |
| `G_p` | Protocol-specific commands bound to protocol P | `1inch:swap`, `wormhole:bridge`, `lifi:routes` |

**Implementation:** `src/core/commands.ts` (G_core), `src/core/command-registry.ts`, `src/plugins/*/commands.ts` (G_p).

---

### Protocol Fibers (M_P)

Each protocol P has a **submonoid** M_P ⊆ M:

**`M_P = { m ∈ M | π(m) = P }`**

Properties of each fiber:

| Property | Definition |
|----------|-----------|
| **Closure** | f, g ∈ M_P ⇒ f ∘ g ∈ M_P |
| **Identity** | e_P ∈ M_P (protocol-specific identity, auto-injected) |
| **Isolation** | M_P ∩ M_Q = ∅ for P ≠ Q |

**Why protocol-specific identity?** Each fiber M_P is a proper submonoid, not just a semigroup. The global identity `e` has `scope: 'G_core'`, which means composing a fiber command with the global identity would eject it from the fiber. Each protocol gets its own identity `e_P` with `scope: 'G_p'` and `protocol: P` so that composition stays within the fiber.

**Implementation:** `createProtocolFiber` in `src/core/monoid.ts` — automatically injects the protocol-specific identity into every new fiber.

---

### Resolution Operators

Four operators map inputs to commands:

| Operator | Signature | Description |
|----------|-----------|-------------|
| **π (Projection)** | `M → Protocols ∪ {⊥}` | Maps a command to its protocol, or ⊥ for G_core/G_alias |
| **σ (Section)** | Protocols → M_P | Returns the fiber (command set) for a protocol |
| **ρ (Exact Resolver)** | `(Protocols ∪ G) → M ∪ {⊥}` | Deterministic lookup by id or namespace |
| **ρ_f (Fuzzy Resolver)** | (Protocols ∪ G) × ℝ → [M] | Levenshtein-based matching for autocomplete and typo correction |

**Implementation:** `src/core/command-registry.ts`.

See [Resolution Operators](./resolution-operators.md) for detailed worked examples of each operator.

---

### ExecutionContext

The runtime state the algebra operates on:

```typescript
ExecutionContext {
  activeProtocol?: ProtocolId        // Current fiber (undefined = in M_G)
  protocolState: Map<ProtocolId, any> // Per-protocol session cache
  history: CommandHistoryEntry[]      // Execution log
  wallet: {
    address?: string
    chainId?: number
    isConnected: boolean
  }
}
```

**activeProtocol** determines which fiber is active. When set to `'1inch'`, the resolver checks M_1inch for unqualified commands before falling back to G_core. When `undefined`, you're in the global monoid M_G and can access any fiber by namespace.

**Implementation:** `src/core/types.ts`.

---

## Fiber Isolation in Practice

When you're inside a fiber (after `use 1inch`), cross-fiber access is blocked:

```bash
# In M_G (global monoid)
user@defi> 1inch:swap 1 eth usdc      # ✅ Access any fiber by namespace
user@defi> uniswap:swap 1 eth usdc    # ✅ Access any fiber by namespace
user@defi> use 1inch                  # Enter 1inch fiber

# In M_1inch (1inch fiber)
user@1inch> swap 1 eth usdc           # ✅ 1inch swap
user@1inch> 1inch:swap 1 eth usdc     # ✅ Explicit namespace to same fiber
user@1inch> uniswap:swap 1 eth usdc   # ❌ BLOCKED — cross-fiber access
user@1inch> help                      # ✅ Core command always available
user@1inch> exit                      # ✅ Exit to M_G
```

**Mathematical justification:** Fibers M_P are submonoids with `M_P ∩ M_Q = ∅`. Allowing cross-fiber access would violate isolation and create dependencies between independent submonoids. The correct pattern is: within M_P, compose commands from M_P plus global commands; to switch protocols, exit to M_G first.

---

## Implementation Compliance

### Fully Implemented (v1.0)

| Component | Location |
|-----------|----------|
| Monoid M (identity, composition) | `src/core/monoid.ts:45,55` |
| Command scopes (G_core, G_alias, G_p) | `src/core/types.ts` |
| Protocol fibers (M_P) as submonoids | `src/core/monoid.ts:128-157` |
| Protocol-specific identity injection | `src/core/monoid.ts:142-154` |
| Fiber closure property | `src/core/monoid.ts:58-61` |
| π, σ, ρ, ρ_f operators | `src/core/command-registry.ts` |
| Protocol-local aliases | `src/core/command-registry.ts:138` |
| Plugin fiber validation | `src/plugins/plugin-loader.ts:64` |

### Pragmatic Deviations

| Component | Spec | Implementation | Rationale |
|-----------|------|----------------|-----------|
| σ (section) | `Protocols → P(M)` (power set) | `Protocols → M_P` (single fiber) | Power set semantics deferred to v2.0 |
| Identity injection | Manual by plugin author | Automatic in `createProtocolFiber` | Prevents missing identity bugs |

### Deferred to Future Versions

| Component | Version |
|-----------|---------|
| G_alias commands | v2.0 (need 2+ protocols sharing same function) |
| Γ operator (protocol composition) | v2.0 |
| Product space P | v2.0 |
| Power set σ | v2.0 |

---

## Why This Matters for Plugin Authors

Every plugin command must declare:

```typescript
{
  scope: 'G_p',
  protocol: 'my-protocol',  // Must match plugin metadata.id
  // ...
}
```

The `addCommandToFiber` function enforces this at registration time and will throw if scope or protocol don't match. This is what makes the closure property hold: only commands with the right protocol tag can enter a fiber.

See [Architecture: Plugin System](../architecture/plugin-system.md) and [Guides: Create a Plugin](../guides/create-a-plugin.md) for the full authoring workflow.
