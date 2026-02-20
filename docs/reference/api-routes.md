---
sidebar_position: 5
title: API Routes
description: All /api/* endpoints organized by protocol with method, description, and authentication status.
---

# API Routes

All API routes follow the convention `/api/[protocol]/[action]`. All routes return `{ success: true, data }` on success or `{ success: false, error }` on failure.

**Authentication:** Routes marked ⚠️ are unauthenticated and forward requests under your server-side API key — anyone can use them. These are known security gaps. See [Internal: Security Findings](../internal/security-findings).

---

## 1inch

| Route | Method | Auth | Description |
|-------|--------|------|-------------|
| `/api/1inch/gas` | GET | ✅ | Current gas prices |
| `/api/1inch/eth_rpc` | POST | ✅ | RPC proxy (14 read-only methods allowlisted) |
| `/api/1inch/swap/classic/quote` | POST | ⚠️ | Get classic swap quote |
| `/api/1inch/charts/candle` | GET | ⚠️ | Candlestick OHLCV chart data |
| `/api/1inch/charts/line` | GET | ⚠️ | Line chart data |
| `/api/1inch/tokens/search` | GET | ⚠️ | Search tokens by symbol/name |
| `/api/1inch/orderbook/limit/create` | POST | ⚠️ | Create limit order |
| `/api/1inch/orderbook/limit/submit` | POST | ⚠️ | Submit limit order |

---

## LiFi

| Route | Method | Auth | Description |
|-------|--------|------|-------------|
| `/api/lifi/routes` | GET | Rate-limited only | Get bridge routes |
| `/api/lifi/step-transaction` | POST | ✅ | Prepare step transaction |
| `/api/lifi/status` | GET | ✅ | Check bridge status |
| `/api/lifi/test-key` | GET | ✅ | Validate LiFi API key |

---

## Wormhole

| Route | Method | Auth | Description |
|-------|--------|------|-------------|
| `/api/wormhole/quote` | POST | ✅ | Discover routes via Wormhole SDK |
| `/api/wormhole/bridge` | POST | ✅ | Build ordered tx list |

---

## Stargate

| Route | Method | Auth | Description |
|-------|--------|------|-------------|
| `/api/stargate/quote` | POST | ✅ | Get bridge quote with approve + bridge steps |

---

## CoinPaprika

| Route | Method | Auth | Description |
|-------|--------|------|-------------|
| `/api/coinpaprika/ticker/[id]` | GET | None | Price and market data for a coin |
| `/api/coinpaprika/ohlcv/[id]` | GET | None | Historical OHLCV chart data |

**Parameters for OHLCV:** `interval` (1h, 24h, 7d, 14d, 30d, 90d, 365d), `limit` (1-366), `start`, `end`, `quote` (usd, btc).

---

## Faucet

| Route | Method | Auth | Description |
|-------|--------|------|-------------|
| `/api/faucet/request` | POST | None (rate-limited by DB) | Request testnet tokens |
| `/api/faucet/status` | GET | None | Check request status |
| `/api/faucet/history` | GET | None | View request history |
| `/api/faucet/config` | GET | None (public) | Get faucet configuration |

**Faucet request body:**
```json
{
  "network": "sepolia | holesky | optimism-sepolia",
  "address": "0x..."
}
```

---

## Analytics

| Route | Method | Auth | Description |
|-------|--------|------|-------------|
| `/api/analytics/user-history` | GET | ⚠️ None | Paginated transaction history |
| `/api/analytics/protocol-volume` | GET | ⚠️ None | Volume data by protocol/chain/date |
| `/api/analytics/global-stats` | GET | ⚠️ None | Platform-wide metrics |

**Security note:** Analytics endpoints currently skip authentication. They expose wallet transaction history to anyone. See [Internal: Security Findings](../internal/security-findings).

**User history parameters:** `walletAddress` (required), `protocol`, `chainId`, `txType` (swap|bridge), `limit` (max 100), `offset`.

**Protocol volume parameters:** `protocol`, `chainId`, `startDate` (ISO), `endDate` (ISO).

---

## Response Envelope

All routes use the same envelope:

```typescript
// Success
{ success: true, data: T }

// Error
{ success: false, error: string }
```

HTTP status codes:
- `200` — success
- `400` — bad request (missing/invalid parameters)
- `401` — unauthorized (missing or invalid `x-api-key` header)
- `403` — forbidden (e.g., blocked RPC method)
- `429` — rate limited
- `500` — server error

---

## Adding New Routes

See [Guides: Add an API Route](../guides/add-an-api-route.md) for the route authoring guide.
