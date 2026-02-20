---
sidebar_position: 5
title: Wormhole
description: Wormhole cross-chain bridge — SDK-backed multi-route discovery and client-side signing.
---

# Wormhole

Wormhole is a cross-chain bridge protocol with multiple route types (AutomaticCCTPRoute, Manual, etc.). The integration uses the Wormhole SDK for route discovery and serializes transfer requests for client-side signing.

:::warning Known Issues
The `quote` and `routes` commands currently produce placeholder TODO outputs rather than live data. Only the `bridge` command is fully implemented. See [Internal: Known Issues](../internal/known-issues).
:::

**Plugin:** `src/plugins/wormhole/`
**API routes:** `src/app/api/wormhole/`
**Docs:** `src/plugins/wormhole/ARCHITECTURE.md`

---

## Commands

### `bridge <amount> <token0> [token1] <network0> <network1>`

Discover routes, select the best one, and initiate a Wormhole bridge.

```bash
user@wormhole> bridge 1 eth optimism arbitrum
  → Querying Wormhole routes...
  → Best route: AutomaticCCTPRoute
  → Amount: 1 ETH | Fee: 0.05% | ETA: ~2 min
  → Step 1: Approve ETH transfer
  → [Wallet confirmation]
  → Step 2: Initiate bridge
  → [Wallet confirmation]
  → ✓ Bridge initiated (tx: 0xabc...)
```

`token1` is optional for native tokens (ETH) and same-token stablecoin pairs.

### `quote`

Get a quote for the most recent cached route. Returns placeholder output in the current implementation.

### `routes <amount> <token0> <network0> <network1>`

List available Wormhole routes. Returns placeholder output in the current implementation.

---

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/wormhole/quote` | POST | Discover routes via Wormhole SDK (best route + full list) |
| `/api/wormhole/bridge` | POST | Build ordered tx list from serialized transfer request |

---

## Architecture

**SDK-backed:** Route discovery uses the Wormhole SDK (`@wormhole-foundation/sdk`). The SDK runs server-side in the API routes, which serializes the transfer context and returns it to the CLI.

**Client-side signing:** The bridge command receives an ordered list of unsigned transactions and presents each to wagmi for user confirmation.

**Route types:** Wormhole supports multiple route strategies:
- `AutomaticCCTPRoute` — CCTP-based USDC transfer, fully automatic
- `ManualCCTPRoute` — manual redemption required
- `TokenBridgeRoute` — Wormhole token bridge (wrapped assets)

The `quote` API selects the best route based on fees and ETA and caches the selected route + serialized transfer request in `protocolState`.

**Shared libs:** `src/lib/wormhole.ts`, `src/lib/wormhole-sdk.ts`

---

## Protocol State

```typescript
protocolState['wormhole'] = {
  lastQuote?: {
    bestRoute: string
    quotes: WormholeRoute[]
    transferRequest: SerializedTransferRequest
  }
  selectedRouteType?: string    // e.g., 'AutomaticCCTPRoute'
  lastTxHashes?: string[]
}
```

---

## BigInt Precision Note

Token balance formatting and Wormhole quote amounts cast `bigint` values to `Number` in some paths (`src/plugins/wormhole/handlers.ts:191-208`). This can silently misreport balances/fees for large positions (overflow past 2^53). The fix is to use `formatUnits` from viem throughout. See [Internal: Security Findings](../internal/security-findings).
