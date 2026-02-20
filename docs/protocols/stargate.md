---
sidebar_position: 6
title: Stargate
description: Stargate LayerZero bridge — stablecoin cross-chain transfers with approve + bridge execution.
---

# Stargate

Stargate is a LayerZero-based bridge focused on stablecoin transfers. It uses a two-step flow (approve + bridge) that the CLI executes in order after receiving a quote.

**Plugin:** `src/plugins/stargate/`
**API routes:** `src/app/api/stargate/`
**Docs:** `src/plugins/stargate/ARCHITECTURE.md`
**Shared lib:** `src/lib/stargate.ts`

---

## Commands

### `bridge <token> <network0> <network1>`

Bridge a stablecoin between chains via Stargate.

```bash
user@stargate> bridge usdc ethereum arbitrum
  → Fetching Stargate quote...
  → Amount: 100 USDC | Fee: 0.06% | ETA: ~1 min
  → Step 1/2: Approve USDC transfer
  → [Wallet confirmation]
  → Step 2/2: Bridge via Stargate
  → [Wallet confirmation]
  → ✓ Bridged (tx: 0xabc...)
```

**Current limitation:** Stargate integration supports same-token stablecoin transfers only (e.g., USDC → USDC, not USDC → ETH). This reflects the current API call pattern, not a fundamental Stargate limitation.

### `quote <token> <network0> <network1>`

Get a bridge quote without executing.

### `chains`

List Stargate-supported chains.

---

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/stargate/quote` | POST | Get bridge quote with approve + bridge steps |

---

## Architecture

**Quote-then-execute:** The Stargate API returns a quote containing both the approve transaction and the bridge transaction as ordered steps. The CLI caches these steps in `protocolState` and executes them in sequence.

**Slippage calculation:** The server-side quote route handles slippage calculation based on the requested amount and current pool state.

**Step execution:** The CLI iterates `stargateSteps`, presenting each to wagmi for user confirmation:
1. **Step 1** — approve the Stargate router to spend tokens.
2. **Step 2** — call the Stargate bridge contract.

**Tracking:** Bridge transactions are recorded via the swap tracking service (`src/lib/tracking/swaps.ts`).

---

## Protocol State

```typescript
protocolState['stargate'] = {
  lastQuote?: {
    stargateSteps: StargateTxStep[]
    fullQuote: StargateQuote
    timestamp: number
  }
}
```

---

## Stablecoin Focus

Stargate's current integration is stablecoin-optimized:
- Same-token transfers (USDC, USDT, DAI, etc.)
- Deep liquidity pools for minimal slippage
- Deterministic step structure (approve + bridge)

For cross-asset bridging (e.g., ETH on one chain → USDC on another), use LiFi or Wormhole which support heterogeneous token pairs.
