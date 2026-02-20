---
sidebar_position: 3
title: 1inch
description: 1inch DEX aggregator — swap, quote, gas, charts, and price commands.
---

# 1inch

1inch is the primary DEX aggregator integration in dappTerminal. It provides token swaps across multiple DEXes, real-time price data, and on-chain charts. It is also the default price provider when no `--protocol` flag is specified.

**Plugin:** `src/plugins/1inch/`
**API routes:** `src/app/api/1inch/`

---

## Commands

### `swap <amount> <tokenIn> <tokenOut>`

Swap tokens via the 1inch aggregator.

```bash
user@1inch> swap 1 eth usdc
  → Fetching best route...
  → Quote: 1 ETH → 3,412 USDC (via Uniswap + Curve, fee: 0.3%)
  → Confirm? [y/n]
```

### `quote <amount> <tokenIn> <tokenOut>`

Get a swap quote without executing.

```bash
user@1inch> quote 0.5 eth usdc
  → 0.5 ETH → 1,706 USDC
  → Slippage: 0.5% | Route: Uniswap v3
```

### `price <symbol>` (via alias)

Get the current token price from 1inch. This is the default behavior of the `price` alias when no `--protocol` flag is specified.

```bash
user@defi> price ETH
  → ETH: $3,412.50 (1inch)

user@defi> price ETH --protocol 1inch
  → ETH: $3,412.50 (1inch)
```

See [Market Data: Overview](../market-data/overview.md) for the full `--protocol` priority order.

### `chart <symbol>` (via alias)

Add a 1inch price chart to the analytics panel.

```bash
user@defi> chart WBTC --protocol 1inch
  → Added WBTC chart to analytics panel (1inch)
```

For the multi-provider chart guide, see [Market Data: Chart Integration](../market-data/chart-integration.md).

### `chains`

List supported chains for 1inch swaps.

### `tokens [--chain <chainId>]`

List available tokens, optionally filtered by chain.

---

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/1inch/swap/classic/quote` | POST | Get swap quote |
| `/api/1inch/gas` | GET | Current gas prices |
| `/api/1inch/eth_rpc` | POST | Read-only RPC proxy (allowlisted methods only) |
| `/api/1inch/charts/candle` | GET | Candlestick OHLCV data |
| `/api/1inch/charts/line` | GET | Line chart data |
| `/api/1inch/tokens/search` | GET | Token search |
| `/api/1inch/orderbook/limit/create` | POST | Create limit order |
| `/api/1inch/orderbook/limit/submit` | POST | Submit limit order |

---

## Architecture Notes

**RPC proxy:** 1inch uses a proxied RPC for on-chain data. The proxy (`/api/1inch/eth_rpc`) enforces a strict allowlist of 14 read-only Ethereum methods. `eth_sendRawTransaction` and all write methods return 403.

**Authentication:** The `ONEINCH_API_KEY` env var is used server-side. Several routes (chart endpoints, token search, limit order) are currently unauthenticated proxy endpoints that forward requests under your API key. This is a known security gap — anonymous users can burn your quota. See [Internal: Security Findings](../internal/security-findings).

**Price data:** 1inch provides real-time DEX price data based on on-chain liquidity. Coverage is ~10K tokens vs CoinPaprika's 56K+ coins. For tokens not available on 1inch, the `price` command falls back to CoinPaprika automatically.

---

## Protocol State

```typescript
protocolState['1inch'] = {
  lastQuote?: {
    tokenIn: string
    tokenOut: string
    amountIn: string
    amountOut: string
    routeData: object
    timestamp: number
  }
}
```

---

## Comparison with CoinPaprika

| Feature | 1inch | CoinPaprika |
|---------|-------|-------------|
| Coverage | ~10K tokens | 56K+ coins |
| Data source | Real-time DEX | Market aggregated |
| Chain support | Multi-chain | Chain-agnostic |
| Price type | On-chain liquidity | 100+ exchanges |
| Rate limits | Generous | 25K req/month free |

See [Market Data: CoinPaprika](../market-data/coinpaprika.md) for the full CoinPaprika integration.
