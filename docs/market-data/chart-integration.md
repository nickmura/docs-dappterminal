---
sidebar_position: 2
title: Chart Integration
description: How the chart alias routes across providers, valid built-in charts vs token charts, and a provider comparison table.
---

# Chart Integration

The `chart` command is a G_core alias that routes to different data providers based on the chart type and `--protocol` flag. This page explains how routing works and how each provider's chart data differs.

---

## Chart Routing Logic

The `chart` alias uses a two-step decision:

1. **Is this a built-in chart?** Built-in charts are non-token analytics panels (performance, network, portfolio). These never route to a provider.
2. **Which provider?** For token charts, route based on the `--protocol` flag or active context.

### Built-in Charts (No Provider)

These charts are always available and source their data from the analytics pipeline:

```bash
chart performance    # App-level performance metrics
chart network        # Network graph visualization
chart network-graph  # Same as above
chart portfolio      # Wallet portfolio analytics
chart balances       # Token balance history
```

Built-in charts: `wbtc`, `eth` (special built-in DEX chart panels), `performance`, `network`, `network-graph`, `portfolio`, `balances`.

### Token Charts (Provider-Routed)

Any other symbol routes to a protocol-specific chart command:

```bash
chart BTC --protocol coinpaprika    # → coinpaprika:cchart BTC
chart WBTC --protocol 1inch         # → 1inch chart (DEX price data)
chart ETH --protocol coingecko      # → coingecko chart (when implemented)
chart TOKEN/SOL --protocol dexscreener  # → dexscreener pair chart (when implemented)
```

**Routing implementation:**

```typescript
// src/core/commands.ts (chart alias)
const validCharts = ['wbtc', 'eth', 'performance', 'network', 'network-graph', 'portfolio', 'balances']

if (validCharts.includes(chartType)) {
  // Render built-in chart directly
} else if (explicitProtocol === 'coinpaprika') {
  // Delegate to cchart command
  return await cchartCmd.run(`${symbol} ${lineFlag}`, context)
} else {
  // Default: 1inch chart lookup
}
```

---

## Provider Comparison

| Feature | 1inch | CoinPaprika | CoinGecko | DexScreener |
|---------|-------|-------------|-----------|-------------|
| Data source | DEX aggregator | 100+ exchanges | 100+ exchanges | On-chain DEX pairs |
| Coverage | ~10K tokens | 56K+ coins | ~13K coins | All on-chain pairs |
| Chain support | Multi-chain EVM | Chain-agnostic | Chain-agnostic | All chains |
| Price type | Real-time DEX | Market aggregated | Market aggregated | Real-time on-chain |
| Intervals | 1h, 6h, 24h, 7d | 1h, 24h, 7d, 14d, 30d, 90d, 365d | Flexible | Real-time |
| Max data points | Varies | 366 | Varies | Streaming |
| Historical depth | Recent | Up to 1 year | Extensive | Real-time |
| Rate limits | Generous | 25K req/month | Free tier / Pro | Rate limited |
| Chart types | Candlestick, Line | Candlestick, Line | Candlestick, Line | Candlestick |
| Implementation | ✅ | ✅ | ℹ️ Planned | ℹ️ Planned |

---

## 1inch Charts

1inch provides DEX price data based on on-chain liquidity. Best for:
- Tokens actively traded on Ethereum mainnet and other EVM chains.
- Real-time DEX price movements.
- Comparing DEX price vs market price.

```bash
chart WBTC --protocol 1inch
chart ETH --protocol 1inch   # wbtc and eth also have built-in 1inch panels
```

---

## CoinPaprika Charts

CoinPaprika provides OHLCV data aggregated from 100+ exchanges. Best for:
- 56K+ coins including many not traded on major DEXes.
- 30-day historical data at 24h intervals (default).
- Candlestick and line chart modes.

```bash
# Direct command
cchart BTC
cchart ETH --line

# Via chart alias
chart BTC --protocol coinpaprika
chart SOL --protocol coinpaprika --line
```

**Symbol resolution:** CoinPaprika uses its own coin ID system (`btc-bitcoin`, `eth-ethereum`). The `cchart` command automatically resolves symbols:

```
cchart BTC → resolveSymbol('BTC') → 'btc-bitcoin' → GET /api/coinpaprika/ohlcv/btc-bitcoin
```

**API endpoint:** `GET /api/coinpaprika/ohlcv/[id]`

Query parameters:
- `interval`: `1h`, `24h` (default), `7d`, `14d`, `30d`, `90d`, `365d`
- `limit`: 1–366 (default: 30)
- `start`, `end`: ISO 8601 date strings

See [Market Data: CoinPaprika](./coinpaprika.md) for the full integration details.

---

## CoinGecko Charts

:::info Not Yet Implemented
CoinGecko chart support is planned but not yet available. This section describes the intended behavior.
:::

CoinGecko provides market aggregated OHLCV data with flexible time ranges.

```bash
chart ETH --protocol coingecko    # (planned)
```

See [Market Data: CoinGecko](./coingecko.md).

---

## DexScreener Charts

:::info Not Yet Implemented
DexScreener chart support is planned but not yet available. This section describes the intended behavior.
:::

DexScreener provides real-time on-chain pair data. Unlike the other providers, DexScreener is pair-based (not coin-based) — you specify a token/quote pair on a specific DEX.

```bash
chart TOKEN/SOL --protocol dexscreener    # (planned)
```

See [Market Data: DexScreener](./dexscreener.md).

---

## Chart Output Format

All chart commands return data in a format compatible with the analytics panel:

```typescript
{
  success: true,
  value: {
    message: string          // e.g., "📊 Added BTC chart to analytics panel (CoinPaprika)"
    chartType: 'candlestick' | 'line'
    symbol: string
    source: string           // provider name
    interval: string
    dataPoints: number
    data: OHLCVDataPoint[]
  }
}
```

The analytics panel renders this data regardless of which provider generated it.

---

## Search-Then-Chart Workflow

```bash
# Find a coin first
coinsearch cardano
  → 1. 🪙 ADA - Cardano (Rank #8)
  → 2. 🎫 ADAi - ADA-pegged stablecoin...

# Chart it
cchart ADA
  → 📊 Added ADA chart to analytics panel (CoinPaprika)
```
