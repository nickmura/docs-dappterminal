---
sidebar_position: 5
title: DexScreener
description: DexScreener on-chain market data — pair-based lookup, token address resolution, and why it complements other providers.
---

# DexScreener

:::info Not Yet Implemented
DexScreener is documented as a planned market data provider. No commands or API routes are implemented yet. This page describes the intended integration.
:::

DexScreener provides real-time on-chain DEX data for trading pairs across all major chains. Unlike CoinPaprika and CoinGecko which aggregate data from centralized exchanges, DexScreener shows live on-chain liquidity and trading activity — making it ideal for newly listed tokens and DEX-specific price discovery.

---

## Why DexScreener?

DexScreener complements the other providers:

- **CoinPaprika/CoinGecko** aggregate prices from 100+ exchanges — good for established coins.
- **1inch** shows DEX prices for tokens with significant on-chain liquidity.
- **DexScreener** shows raw on-chain pair data — even for brand-new tokens with no CEX listing.

If a token was just launched on Uniswap or Raydium and isn't yet in CoinPaprika, DexScreener will have it.

---

## Key Difference: Pair-Based vs Coin-Based

CoinPaprika and CoinGecko are **coin-based** — you look up `BTC` or `ETH` and get aggregated market data.

DexScreener is **pair-based** — you specify a trading pair on a specific DEX:
- `PEPE/WETH on Uniswap v3 (Ethereum)`
- `TOKEN/SOL on Raydium (Solana)`

This means DexScreener requires a token contract address or pair address rather than a simple ticker symbol.

---

## Planned Commands

### `chart <pairOrAddress> --protocol dexscreener`

Display a real-time on-chain price chart for a trading pair.

```bash
chart TOKEN/SOL --protocol dexscreener
  → Resolving TOKEN/SOL pair on Solana...
  → Found: TOKEN-USDC on Raydium
  → Added pair chart to analytics panel (DexScreener)
```

### `price <tokenAddress> --protocol dexscreener`

Get the current on-chain price for a token by contract address.

```bash
price 0x1234...abcd --protocol dexscreener
  → TOKEN: $0.0045 (Raydium, Solana)
  → Pair: TOKEN/USDC | Liquidity: $125K | 24h Vol: $45K
```

---

## Planned API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/dexscreener/pairs/[pairAddress]` | GET | Data for a specific pair address |
| `/api/dexscreener/search` | GET | Search for pairs by token address or symbol |

---

## Token Address → Pair Resolution

DexScreener resolves token addresses to pairs:

```
price 0x1234...abcd --protocol dexscreener
  → GET /api/dexscreener/search?q=0x1234...abcd
  → Find best pair (highest liquidity)
  → Return real-time price for that pair
```

---

## Coverage

- All EVM chains (Ethereum, Arbitrum, Optimism, Base, BSC, etc.)
- Solana
- Aptos
- All major DEXes (Uniswap, Curve, Raydium, Orca, etc.)
- Newly listed pairs available immediately

---

## Rate Limits

DexScreener has a public API with rate limits (exact limits vary and are subject to change). The implementation should add rate limiting via `src/lib/rate-limit.ts` consistent with other API routes.

---

## Implementation Notes

DexScreener's pair-based model requires different handling than CoinPaprika/CoinGecko:

1. **No central coin registry** — pairs are looked up on demand by address or symbol search.
2. **Dynamic pair discovery** — a symbol like `TOKEN` may map to multiple pairs; the implementation should select the highest-liquidity pair by default.
3. **No bundled data file** — unlike CoinPaprika's `coins.json`, DexScreener data must be fetched from their API.
4. **Chart format differs** — DexScreener may return streaming/websocket data rather than batched OHLCV; adapt the chart output format accordingly.

The `--protocol dexscreener` flag in `price` and `chart` is already parsed by the routing logic — it needs a concrete handler to route to.
