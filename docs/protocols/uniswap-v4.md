---
sidebar_position: 7
title: Uniswap v4
description: Uniswap v4 DEX integration — Universal Router calldata with client-side signing.
---

# Uniswap v4

:::info Work in Progress
The Uniswap v4 plugin is under active development. Core swap functionality and the handler flow are implemented, but some features are incomplete. This page reflects the current implementation state.
:::

**Plugin:** `src/plugins/uniswap-v4/`
**Docs:** `src/plugins/uniswap-v4/architecture.md`

---

## Commands (Current)

### `swap <amount> <tokenIn> <tokenOut>`

Build a swap via the Uniswap v4 Universal Router and sign client-side.

```bash
user@uniswap-v4> swap 10 usdc eth
  → Building swap calldata...
  → Route: USDC → ETH (Uniswap v4 pool)
  → Min out: 0.0031 ETH (0.5% slippage)
  → [Wallet confirmation]
  → ✓ Swap submitted (tx: 0xabc...)
```

### `quote <amount> <tokenIn> <tokenOut>`

Get a swap quote without executing.

### `positions`

List current Uniswap v4 liquidity positions (in development).

---

## Architecture

**Universal Router:** The swap command builds calldata for the Uniswap v4 Universal Router, which handles hook-aware routing. The transaction payload is returned to the CLI for client-side signing via wagmi.

**Multi-hop support:** The handler supports both single-hop and multi-hop swaps. Swap tracking is integrated in both paths (`src/plugins/uniswap-v4/handlers.ts:287-299, 607-620`).

**Shared lib:** `src/plugins/uniswap-v4/lib/` contains Universal Router helpers, pool math, and price impact calculations.

---

## Implementation Status

| Feature | Status |
|---------|--------|
| Single-hop swap | ✅ Implemented |
| Multi-hop swap | ✅ Implemented |
| Swap tracking | ✅ Integrated |
| Quote command | 🚧 Partial |
| Positions command | 🚧 In progress |
| Liquidity management | 📋 Planned |

---

## Notes

The Uniswap v4 handler is complex (large surface area, many debug logs). Review `src/plugins/uniswap-v4/handlers.ts` before extending it. The approval flow and multicall pattern differ from standard ERC-20 swaps.
