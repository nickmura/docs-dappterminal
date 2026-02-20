---
sidebar_position: 6
title: Pipeline DSL
tags: [experimental, design-spec]
description: Sequential command chaining — design spec for composing DeFi operations in a single input line.
---

# Pipeline DSL

:::caution Not Yet Implemented
This is a design specification, not implemented functionality. The Pipeline DSL is planned for a future release after execution core hardening (Phase 0). See [Architecture: Execution Engine](../architecture/execution-engine.md) for the hardening plan.
:::

**Status:** Design Notes | **Last Updated:** 2026-02-05

---

## Motivation

Currently each command executes in isolation. A user wanting to swap tokens and then bridge the result must run two separate commands, manually copying output values between them:

```
user@defi> uniswap-v4:swap 10 usdc eth
  → Swapped 10 USDC for 0.0031 ETH

user@defi> lifi:bridge 0.0031 eth optimism arbitrum
  → Bridging 0.0031 ETH from Optimism to Arbitrum...
```

Sequential command running eliminates manual intermediate steps. A pipeline expresses intent as a single composed operation:

```
user@defi> uniswap-v4:swap 10 usdc eth => $swap && lifi:bridge $swap.amountOut eth optimism arbitrum
```

---

## Is This a DSL?

Yes. This is a **command pipeline DSL** — a domain-specific mini-language for composing DeFi operations. It is comparable to Unix shell pipes but with named variable bindings instead of stdin/stdout streams. The scope is intentionally narrow: compose DeFi operations, nothing more.

The algebraic foundation already supports this. `composeCommands` in `src/core/monoid.ts` implements the monoid composition operation `(f ∘ g)(x) = g(f(x))`, but it is not yet exposed in the CLI. The pipeline DSL is the user-facing syntax that surfaces this existing algebraic capability.

---

## Proposed Syntax

```
uniswap-v4:swap 10 usdc eth => $swap && lifi:bridge $swap.amountOut eth optimism arbitrum
```

**Language constructs:**

| Construct | Syntax | Example | Semantics |
|-----------|--------|---------|-----------|
| Chain operator | `&&` | `cmd1 && cmd2` | Run cmd2 only if cmd1 succeeds |
| Variable capture | `=> $name` | `swap 10 usdc eth => $swap` | Bind command output to `$swap` |
| Variable interpolation | `$name` | `bridge $swap.amountOut` | Replace with captured value |
| Field access | `$name.field` | `$swap.amountOut` | Access a specific field |
| Implicit result | `$_` | `bridge $_.amountOut` | Always refers to the most recent output |

**Why this syntax:**
- `=>` is universally understood as "produces" (arrow functions, pattern matching).
- `$var` is the shell convention for variable interpolation.
- `$_` is Perl/PowerShell convention for "last result".
- `&&` is bash convention for "continue on success".
- No new concepts — familiar to anyone with shell experience.

---

## Fiber Isolation Rules

Pipelines that reference multiple protocols must execute from M_G (no active protocol):

```bash
# ✅ Valid — both commands resolve from M_G
user@defi> uniswap-v4:swap 10 usdc eth => $swap && lifi:bridge $swap.amountOut eth optimism arbitrum

# ✅ Valid — both commands in same fiber
user@uniswap-v4> swap 10 usdc eth => $swap && discover $swap.token

# ❌ Invalid — cross-fiber pipeline while in a fiber
user@uniswap-v4> swap 10 usdc eth => $swap && lifi:bridge $swap.amountOut eth optimism arbitrum
# → Error: cross-fiber access blocked. Exit to global context first.
```

---

## Execution Timing

### Post-transaction chaining (default)

Each pipeline step waits for the previous step's transaction to confirm on-chain, then uses the actual result:

```bash
# Waits for swap to confirm, uses actual amountOut received
uniswap-v4:swap 10 usdc eth => $swap && lifi:bridge $swap.amountOut eth optimism arbitrum
```

### Dry-run mode

Uses quoted/estimated values immediately without executing transactions:

```bash
uniswap-v4:swap 10 usdc eth => $swap && lifi:bridge $swap.amountOut eth optimism arbitrum --dry-run
# → Preview: Step 1 would produce ~0.0031 ETH
# → Preview: Step 2 would bridge ~0.0031 ETH (Optimism → Arbitrum)
```

---

## Pipeline Confirmation

Optional `--confirm` flag shows a preview before executing:

```bash
user@defi> uniswap-v4:swap 10 usdc eth => $swap && lifi:bridge $swap.amountOut eth optimism arbitrum --confirm

Pipeline Preview:
  Step 1: uniswap-v4:swap — Swap 10 USDC → ETH
  Step 2: lifi:bridge — Bridge [result of step 1] ETH, Optimism → Arbitrum

Execute pipeline? [y/n]
```

---

## Pipeline Output Schema

Commands will optionally expose a `pipelineOutput` for downstream consumption:

```typescript
interface PipelineOutput {
  amount?: string         // Human-readable output amount (e.g., "0.0031")
  amountRaw?: string      // Raw amount in base units
  token?: string          // Output token symbol (e.g., "ETH")
  tokenAddress?: string   // Output token contract address
  txHash?: string         // Transaction hash (after Phase 2)
  chainId?: number        // Chain the result lives on
  [key: string]: unknown  // Protocol-specific fields
}
```

Commands without `pipelineOutput` can still be chained but only expose their raw result object via `$_`.

---

## Architectural Components Needed

### 1. Pipeline Parser
Tokenize a pipeline input string into structured steps. Split on `&&`, extract `=> $name` captures, identify `$var.field` interpolation sites.

### 2. Pipeline Context / Variable Store
A `Map<string, unknown>` holding named captures plus `$_`. Lives for the duration of one pipeline execution, then discards.

### 3. Pipeline Executor
Sequential loop: for each step, interpolate variables → resolve command → execute → capture result → update variable store. Abort on failure (`&&` semantics).

### 4. CLI Detection
Detect `&&` in input → route to pipeline executor instead of single command execution.

---

## Relationship to the Algebraic Structure

A pipeline `f => $x && g($x)` is the composition `g ∘ f` where the intermediate value is explicitly named. The existing `composeCommands` function already implements this at the type level:

```typescript
// src/core/monoid.ts:61
function composeCommands<A, B, C>(
  f: Command<A, B>,
  g: Command<B, C>
): Command<A, C>
```

The pipeline DSL adds:
- **Parsing** — turn string syntax into composition calls.
- **Named intermediates** — `$var` bindings (the monoid doesn't need these, but users do).
- **Runtime interpolation** — substitute actual values into argument strings.
- **Cross-fiber composition** — compose commands from different fibers (only from M_G).

---

## Rollout Plan

**Phase A** (first ship): `cmd1 && cmd2` only — no variable binding.

**Phase B**: Variable capture and interpolation (`=> $var`, `$var.field`).

**Phase C**: `--dry-run` and `--confirm` workflow support.

**Prerequisite:** All of Phase 0 execution core hardening must be complete before Phase A ships. See [Architecture: Execution Engine](../architecture/execution-engine.md).

---

## Open Questions

1. **Error recovery** — if step 2 of 4 fails, steps 1–1 already executed on-chain. Abort and report is likely the only option (on-chain actions can't be rolled back).
2. **Pipeline-aware autocomplete** — should the fuzzy resolver suggest `$var` names while typing after `&&`?
3. **Saved pipelines / macros** — could users alias a pipeline? e.g., `alias swap-and-bridge = "..."`. Future extension, not in scope for initial ship.
4. **Lowering to `composeCommands`** — should the DSL eventually lower to explicit monoid composition, or remain a separate execution path?
