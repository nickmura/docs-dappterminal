---
sidebar_position: 4
title: CoinGecko
description: CoinGecko market data provider — commands, coin ID resolution, rate limits, and coverage.
---

# CoinGecko

:::info Not Yet Implemented
CoinGecko is documented as a planned market data provider. No commands or API routes are implemented yet. This page describes the intended integration, modeled after the CoinPaprika implementation.
:::

CoinGecko is a market data aggregator covering approximately 13,000 coins with market cap, price, volume, and historical OHLCV data. It is well known for its comprehensive coverage of DeFi tokens and its coin ID system.

---

## Planned Commands

### `price <symbol> --protocol coingecko`

Get cryptocurrency price from CoinGecko.

```bash
price ETH --protocol coingecko
  → ETH: $2,345.67 (+1.23%, 24h)
  → Market Cap: $280B (Rank #2)
  → Source: CoinGecko
```

### `chart <symbol> --protocol coingecko`

Add a CoinGecko price chart to the analytics panel.

```bash
chart ETH --protocol coingecko
  → Added ETH chart to analytics panel (CoinGecko)
```

---

## Planned API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/coingecko/ticker/[id]` | GET | Price and market data |
| `/api/coingecko/ohlcv/[id]` | GET | Historical OHLCV chart data |

---

## Coin ID Resolution

CoinGecko uses its own coin ID system (e.g., `bitcoin`, `ethereum`, `uniswap`). Resolution would follow the same pattern as CoinPaprika:

```
price ETH --protocol coingecko
  → resolveSymbol('ETH') → 'ethereum'
  → GET /api/coingecko/ticker/ethereum
```

The resolution algorithm would use a bundled coin list (similar to CoinPaprika's `coins.json`) or fetch from the CoinGecko `/coins/list` API.

---

## Rate Limits

| Tier | Limit |
|------|-------|
| Free (public API) | ~30 calls/minute |
| Demo API key | ~30 calls/minute with higher monthly limits |
| Pro | Higher limits, priority access |

The free public API requires no key. A Demo or Pro key unlocks higher rate limits and additional endpoints.

---

## Coverage vs CoinPaprika

| Feature | CoinGecko | CoinPaprika |
|---------|-----------|-------------|
| Coverage | ~13K coins | 56K+ coins |
| Historical data | Extensive (years) | Up to 1 year |
| DeFi token metadata | Strong | Good |
| Coin categories | Yes | Limited |
| Social data | Yes | Limited |
| NFTs | Yes | No |
| API key required | No (free tier) | No |

CoinGecko has better metadata coverage (categories, social links, developer activity) while CoinPaprika has broader coin coverage including many inactive tokens.

---

## Implementation Notes

When implementing CoinGecko, follow the CoinPaprika pattern:
1. Create `src/plugins/coingecko/` with `index.ts`, `commands.ts`, `types.ts`, and a coin registry.
2. Add API routes at `src/app/api/coingecko/`.
3. Register the provider in the `price` and `chart` alias routing logic.
4. Use the `ICoinRegistry` interface for the data layer to keep it swappable.

The `--protocol coingecko` flag in `price` and `chart` is already parsed by the routing logic — it just needs a concrete handler to route to.
