---
sidebar_position: 5
title: State and Storage
description: ExecutionContext in-memory state, Prisma persistence, and the swap/bridge tracking system.
---

# State and Storage

State in dappTerminal is split between in-memory execution context (per-tab, volatile) and persistent database storage (Prisma, for faucet and analytics). Observability is handled through structured responses, history, and audit logs.

---

## ExecutionContext (In-Memory)

The runtime state for a single terminal tab. See [Concepts: Execution Context](../concepts/execution-context.md) for the full shape.

**Key fields:**
- `activeProtocol` — the current fiber M_p.
- `protocolState` — per-protocol cache (quotes, routes, tx plans).
- `history` — command execution log for UX and debugging.
- `wallet` — address, chain ID, and connection status.

**Example `protocolState` shapes:**

```text
protocolState:
  wormhole:
    lastQuote: { bestRoute, quotes, transferRequest }
    selectedRouteType: AutomaticCCTPRoute
  stargate:
    lastQuote: { stargateSteps, fullQuote }
  lifi:
    selectedRoute: { id, steps, fees }
    execution: { stepHashes, updatedAt }
```

**Consistency guidelines:**
- Cache only serializable data inside `protocolState` (no functions, no class instances).
- Invalidate cached quotes when `wallet.chainId` changes.
- Persist user-facing identifiers (tx hash, request ID) for follow-up commands.
- Use a `lastUpdated` timestamp if you need staleness detection.

---

## Persistent Storage (Faucet)

The faucet uses Prisma-backed PostgreSQL models for durability and abuse protection.

**Schema:** `prisma/schema.prisma`

**Core models:**

| Model | Purpose |
|-------|---------|
| `FaucetRequest` | Request lifecycle: pending → completed/failed |
| `RateLimitRecord` | Per-address and per-IP rate limit windows |
| `FaucetConfig` | Per-network faucet configuration |
| `FaucetAuditLog` | Structured event history |

**Primary surfaces:**
- `src/lib/faucet/rate-limit-db.ts` — DB-backed rate limiting
- `src/lib/faucet/transaction.ts` — transaction sending service

---

## Swap and Bridge Tracking

The tracking system records all swap and bridge transactions across protocols, with aggregated statistics for analytics.

**Location:** `src/lib/tracking/swaps.ts`

### Database Schema

**SwapTransaction** — individual transaction records:

```typescript
{
  txHash: string
  chainId: number
  blockNumber?: number
  status: 'pending' | 'confirmed' | 'failed'
  protocol: string      // 'uniswap-v4', '1inch', 'lifi', etc.
  commandType: string
  txType: 'swap' | 'bridge'
  walletAddress: string
  tokenIn: string
  tokenOut: string
  amountIn: string      // stored as string for BigInt precision
  amountOut?: string
  gasUsed?: string
  gasPrice?: string
  routeInfo?: Json      // multi-hop route data
  createdAt: DateTime
  confirmedAt?: DateTime
  failedAt?: DateTime
}
```

**ProtocolVolume** — daily aggregates per protocol and chain:

```typescript
{
  date: DateTime        // day boundary
  protocol: string
  chainId: number
  totalTransactions: number
  successfulTxs: number
  failedTxs: number
  uniqueUsers: number
  totalVolumeIn: string
  totalVolumeOut: string
}
```

**UserSwapActivity** — per-user activity:

```typescript
{
  walletAddress: string
  protocol: string
  chainId: number
  totalSwaps: number
  totalBridges: number
  totalVolumeIn: string
  firstTxAt: DateTime
  lastTxAt: DateTime
}
```

### Tracking Service Functions

| Function | Description |
|----------|-------------|
| `trackSwapTransaction(data)` | Records transaction and updates aggregates |
| `updateProtocolVolume(data)` | Upserts daily volume statistics |
| `updateUserActivity(data)` | Updates user-specific metrics |
| `getUserTransactionHistory(wallet, opts)` | Paginated user history |
| `getProtocolVolumeStats(opts)` | Protocol volume data |
| `getGlobalStats()` | Platform-wide statistics |

### Protocol Integration Points

Tracking is called from protocol handlers after successful transaction submission:

| Protocol | Handler file | Lines |
|----------|-------------|-------|
| Uniswap v4 | `src/plugins/uniswap-v4/handlers.ts` | 287-299, 607-620 |
| 1inch | `src/plugins/1inch/handlers.ts` | 149-162 |
| LiFi | `src/plugins/lifi/handlers.ts` | 168-190 |
| Stargate | `src/plugins/stargate/handlers.ts` | 125-147 |
| Wormhole | `src/plugins/wormhole/handlers.ts` | 299-320 |

All tracking calls are wrapped in `.catch()` — tracking failures never affect the swap/bridge flow.

### Analytics API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/analytics/user-history` | GET | Paginated transaction history for a wallet |
| `/api/analytics/protocol-volume` | GET | Volume data with protocol/chain/date filters |
| `/api/analytics/global-stats` | GET | Platform-wide metrics |

**Security note:** These endpoints currently skip authentication. This is a known open item — they should be protected with the same API key gate used on other routes. See [Internal: Security Findings](../internal/security-findings).

---

## Observability

- **Command history** in `ExecutionContext.history` — per-tab, volatile.
- **Standard API envelope** `{ success, data | error }` — consistent structure for error tracking.
- **Faucet audit logs** — structured event history for request lifecycle events.
- **Analytics endpoints** — swap/bridge transaction history and aggregates.

---

## Database Indexes

Key indexes for query performance:

**SwapTransaction:**
- `(walletAddress, createdAt)` — user history queries
- `(protocol, createdAt)` — protocol filtering
- `(chainId, createdAt)` — chain filtering
- `txHash` — transaction lookups

**ProtocolVolume:**
- `(date, protocol, chainId)` — unique constraint for upsert operations

**UserSwapActivity:**
- `(walletAddress, protocol, chainId)` — unique constraint for upsert operations
