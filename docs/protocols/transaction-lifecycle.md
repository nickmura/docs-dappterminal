---
sidebar_position: 2
title: Transaction Lifecycle
description: The common quote → execute → status pattern shared across all DeFi protocol integrations.
---

# Transaction Lifecycle

Most protocol tooling follows a shared quote → execute → status loop that stays within a single fiber M_p unless explicitly namespaced.

**Last Updated:** 2026-01-02

---

## 1. Quote / Preview

**Goal:** produce a deterministic plan without signing.

Typical actions:
- Resolve chain IDs and token metadata.
- Fetch pricing, routes, or transfer steps.
- Normalize the response into terminal-friendly summaries.
- Cache results in `ExecutionContext.protocolState`.

**Outputs:**
- Route summary (fees, ETA, slippage).
- Ordered steps with transaction payloads or references.

```bash
user@wormhole> quote 1 eth usdc optimism arbitrum

  Route: AutomaticCCTPRoute
  Amount: 1 ETH → 3,412 USDC
  ETA: ~2 minutes
  Fee: 0.05%

  Use 'bridge' to execute this quote.
```

---

## 2. Prepare / Execute

**Goal:** convert cached quote into unsigned transactions and sign.

Typical actions:
- Read cached quote from `ExecutionContext.protocolState`.
- Build one or more unsigned txs (approval + execution).
- Present each tx to the wallet for user confirmation.
- Broadcast and collect hashes.

**Patterns by protocol:**

| Protocol | Steps |
|----------|-------|
| DEX swaps (1inch) | Single swap tx, or permit + swap |
| Bridges (LiFi) | Multi-step: approval + bridge (per LiFi route steps) |
| Bridges (Wormhole) | Ordered tx list from `/api/wormhole/bridge` |
| Bridges (Stargate) | Two steps: approve + bridge |
| Faucet | Server signs and broadcasts; client receives tx hash |

```bash
user@wormhole> bridge

  Step 1/2: Approve USDC transfer
  → [Wallet confirmation required]
  ✓ Approved (tx: 0xabc...)

  Step 2/2: Initiate Wormhole bridge
  → [Wallet confirmation required]
  ✓ Bridge initiated (tx: 0xdef...)

  Track status: wormhole:status 0xdef...
```

---

## 3. Status / Track

**Goal:** ensure completion and expose explorer links.

Typical actions:
- Poll protocol status endpoints or block explorers.
- Emit explorer URLs for each hash.
- Update `ExecutionContext.history` with status transitions.

```bash
user@lifi> status

  Bridge status: PENDING
  Source tx: 0xabc... (Optimism) ✓ Confirmed
  Destination tx: 0xdef... (Arbitrum) ⏳ Pending

  Explorer: https://explorer.li.finance/tx/0xabc...
```

---

## Caching Guidance

- Cache quotes in `protocolState` with timestamps.
- Provide `--refresh` flags to re-quote when prices change.
- If wallet chain ID changes, invalidate cached plans.
- Use `lastUpdated` field for staleness detection.

```typescript
// Pattern for caching quotes
context.protocolState.set(protocol, {
  ...context.protocolState.get(protocol),
  lastQuote: quote,
  lastQuoteAt: Date.now(),
})

// Pattern for staleness check
const cached = context.protocolState.get(protocol)?.lastQuote
const isStale = !cached || Date.now() - cached.lastQuoteAt > 60_000
```

---

## Error Handling Checklist

- Handle upstream errors by bubbling `{ success: false, error }`.
- Differentiate between user rejection and tx failure.
- Guard for missing cached quotes before execution.
- Normalize revert reasons to CLI-friendly messages.
- Never let tracking failures (analytics) affect the swap/bridge flow.

---

## Minimal Example (Pseudo-code)

```text
quote:
  fetch route from /api/[protocol]/quote
  normalize response
  cache in protocolState
  display summary to user

execute:
  read cached route from protocolState
  build tx list
  for each tx:
    present to wallet
    await confirmation
    store hash
  update history

status:
  poll /api/[protocol]/status with stored hashes
  output explorer links
  update history with final status
```

---

## Relationship to the Monoid

The lifecycle stays within a single fiber M_p:

- `quote`, `bridge`/`execute`, `status` commands are all G_p with the same `protocol` tag.
- Protocol state is namespaced to that protocol in `ExecutionContext.protocolState`.
- Composing these commands is a valid monoid composition within M_p: `execute ∘ quote` and `status ∘ execute ∘ quote` both stay within the fiber.

Cross-protocol workflows (e.g., swap on Uniswap then bridge via LiFi) must be initiated from M_G (no active protocol), since they span two fibers. This is exactly what the planned Pipeline DSL will support. See [Guides: Pipeline DSL](../guides/pipeline-dsl.md).
