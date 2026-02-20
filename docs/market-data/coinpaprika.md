---
sidebar_position: 3
title: CoinPaprika
description: CoinPaprika market data provider — 56K+ coins, OHLCV charts, cprice/cchart/coinsearch commands.
---

# CoinPaprika

CoinPaprika is the primary market data provider for coins not available on 1inch. It covers 56,000+ cryptocurrencies with real-time price data and historical OHLCV charts.

**Plugin:** `src/plugins/coinpaprika/`
**API routes:** `src/app/api/coinpaprika/`

---

## Commands

### `cprice <symbol>`

Get cryptocurrency price from CoinPaprika directly.

```bash
> cprice BTC
📈 Bitcoin (BTC)

  Price: $43,521.50
  24h Change: +2.34%
  Market Cap: $850.23B (Rank #1)
  Volume (24h): $25.45B

  Source: CoinPaprika

> cprice ETH
📈 Ethereum (ETH)

  Price: $2,345.67
  24h Change: +1.23%
  Market Cap: $280.12B (Rank #2)
  Volume (24h): $12.34B

  Source: CoinPaprika
```

Also accessible via the `price` alias:
```bash
price BTC --protocol coinpaprika
```

### `coinsearch <query>`

Search for coins by name or symbol. Uses fuzzy matching across 56K+ entries.

```bash
> coinsearch ethereum
🔍 Search results for 'ethereum':

  1. 🪙 ETH - Ethereum (Rank #2)
  2. 🎫 ETC - Ethereum Classic (Rank #25)
  3. 🎫 ETHW - Ethereum PoW (Rank #150)
  ...

💡 Use 'price <symbol> --protocol coinpaprika' to get price data
```

### `cchart <symbol> [--line]`

Add a historical OHLCV chart to the analytics panel.

```bash
> cchart BTC
📊 Added BTC chart to analytics panel (CoinPaprika)

> cchart ETH --line
📊 Added ETH chart to analytics panel (CoinPaprika)
```

Also accessible via the `chart` alias:
```bash
chart BTC --protocol coinpaprika
chart SOL --protocol coinpaprika --line
```

**Default:** 30 days of daily (24h interval) candlestick data.

---

## Symbol Resolution

CoinPaprika uses its own coin ID system (e.g., `btc-bitcoin`, `eth-ethereum`). The plugin automatically resolves ticker symbols:

```
cprice BTC
  → resolveSymbol('BTC')
  → 'btc-bitcoin'
  → GET /api/coinpaprika/ticker/btc-bitcoin
  → format and display
```

**Resolution algorithm:**
1. Filter to active coins with `rank > 0`.
2. Sort by market cap rank (lower = better).
3. Prefer `'coin'` type over `'token'`.
4. Return best match.

**Performance:**
- Lazy loading: `coins.json` (9.1 MB, 56K coins) loaded on first command use.
- O(1) symbol lookups via in-memory Map index.
- 24-hour cache TTL.
- Load time: ~100-200ms on first use, less than 10ms subsequently.

---

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/coinpaprika/ticker/[id]` | GET | Price and market data for a coin |
| `/api/coinpaprika/ohlcv/[id]` | GET | Historical OHLCV chart data |

### OHLCV Route Parameters

```
GET /api/coinpaprika/ohlcv/btc-bitcoin?interval=24h&limit=30
```

| Parameter | Default | Options |
|-----------|---------|---------|
| `interval` | `24h` | `1h`, `24h`, `7d`, `14d`, `30d`, `90d`, `365d` |
| `limit` | `30` | 1–366 |
| `start` | — | ISO 8601 date |
| `end` | — | ISO 8601 date |
| `quote` | `usd` | `usd`, `btc` |

### OHLCV Response Format

```json
{
  "coinId": "btc-bitcoin",
  "interval": "24h",
  "quote": "usd",
  "count": 30,
  "data": [
    {
      "time_open": "2024-01-01T00:00:00Z",
      "time_close": "2024-01-01T23:59:59Z",
      "open": 43521.50,
      "high": 44123.75,
      "low": 43000.25,
      "close": 43821.50,
      "volume": 25450000000,
      "market_cap": 850230000000
    }
  ]
}
```

---

## Data Layer Architecture

The plugin uses a modular `ICoinRegistry` interface, making it easy to swap the data source:

```typescript
interface ICoinRegistry {
  resolveSymbol(symbol: string): Promise<string | null>
  searchBySymbol(symbol: string, options?: CoinSearchOptions): Promise<CoinEntry[]>
  fuzzySearch(query: string, limit?: number): Promise<CoinEntry[]>
  getById(id: string): Promise<CoinEntry | null>
  getAllActive(): Promise<CoinEntry[]>
}
```

**Current implementation:** `JsonFileCoinRegistry` — uses `coins.json` with in-memory indexing.

**Future implementations** (easy to swap via one line in `index.ts`):
- `DatabaseCoinRegistry` — Prisma/SQLite
- `ApiCoinRegistry` — fetch on demand from CoinPaprika API
- `RedisCoinRegistry` — Redis cache

---

## Database Statistics

The bundled `coins.json`:

| Stat | Value |
|------|-------|
| Total coins | 56,492 |
| Active coins | 13,188 (23%) |
| Inactive coins | 43,304 (77%) |
| Types | 54,027 tokens, 2,465 coins |
| File size | 9.1 MB |

**Memory usage:** ~12 MB per server instance (9 MB JSON + 3 MB index).

---

## Rate Limits

- **Free tier:** 25,000 requests/month (~833/day).
- **No API key required** for the current implementation.
- Each chart view = 1 API request.

---

## Error Messages

```bash
# Symbol not found
❌ Coin 'XYZ' not found in CoinPaprika database
💡 Try searching: coinsearch XYZ

# Rate limit exceeded
❌ Rate limit exceeded
CoinPaprika free tier: 25,000 requests/month
Please try again in a few moments.

# Network error
❌ Failed to fetch price for BTC
Error: Network error: Failed to fetch
```

---

## Comparison with 1inch

| Feature | 1inch | CoinPaprika |
|---------|-------|-------------|
| Coverage | ~10K tokens | 56K+ coins |
| Data source | 1inch DEX aggregator | 100+ exchanges |
| Chain support | Multi-chain EVM | Chain-agnostic |
| Price type | Real-time on-chain DEX | Market aggregated |
| Token resolution | Dynamic API | Static JSON + API hybrid |
| Cache strategy | No static cache | In-memory JSON, 24h TTL |
| Rate limits | Generous | 25K/month free |
| Historical depth | Recent | Up to 1 year |
