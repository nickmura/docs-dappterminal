---
sidebar_position: 4
title: LiFi
description: LiFi bridge aggregator — multi-route cross-chain bridging with step transaction execution.
---

# LiFi

LiFi is a bridge aggregator that finds the best route across multiple bridge protocols. The integration uses a separate proxy application to keep the API key server-side.

:::warning Known Issues
The `execute` command path has an incomplete handler binding. See [Internal: Known Issues](../internal/known-issues) for details. Use the `bridge` command for the primary flow.
:::

**Plugin:** `src/plugins/lifi/`
**API routes:** `src/app/api/lifi/`
**Docs:** `src/plugins/lifi/ARCHITECTURE.md`

---

## Commands

### `bridge <amount> <token0> [token1] <network0> <network1>`

Find routes and initiate a cross-chain bridge.

```bash
user@lifi> bridge 100 usdc ethereum arbitrum
  → Fetching routes...
  → Best route: Stargate (100 USDC, ~2 min, fee: 0.2%)
  → Confirm? [y/n]
```

`token1` is optional for same-token pairs (USDC, ETH) where the output token matches the input.

### `routes <amount> <token0> <network0> <network1>`

List all available routes without committing.

```bash
user@lifi> routes 100 usdc ethereum optimism
  → 3 routes found:
    1. Stargate — 100 USDC, ~2 min, fee: 0.2%
    2. Hop Protocol — 99.8 USDC, ~5 min, fee: 0.4%
    3. Across — 99.9 USDC, ~3 min, fee: 0.3%
```

### `quote`

Get a quote using cached state from a previous `routes` command.

### `status`

Check the status of the most recent bridge transaction.

```bash
user@lifi> status
  → Status: PENDING
  → Source: Ethereum (0xabc...) ✓
  → Destination: Arbitrum ⏳
```

### `chains`

List LiFi-supported chains.

---

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/lifi/routes` | GET | Fetch available bridge routes |
| `/api/lifi/step-transaction` | POST | Prepare a step transaction |
| `/api/lifi/status` | GET | Check bridge status |
| `/api/lifi/test-key` | GET | Validate API key |

---

## Architecture

**Proxy app:** The LiFi API key must stay server-side. The integration uses a dedicated proxy app (`../lifi-api-nextjs`) in addition to the Next.js API routes. Commands communicate with this proxy for step-transaction preparation.

**Multi-step flow:**
1. Route discovery via `/api/lifi/routes` — returns a list of routes, each with step definitions.
2. Per-step transaction preparation via `/api/lifi/step-transaction` — builds the unsigned transaction for one step.
3. CLI presents each step for wallet confirmation.
4. Status tracking via `/api/lifi/status`.

**Rate limiting:** The `/api/lifi/routes` endpoint is rate-limited but intentionally unauthenticated (LiFi's public API design).

---

## Protocol State

```typescript
protocolState['lifi'] = {
  selectedRoute?: {
    id: string
    steps: LifiStep[]
    fees: object
  }
  execution?: {
    stepHashes: string[]
    updatedAt: number
  }
}
```

---

## Known Issue: execute Command

The `execute` command returns a `lifiTransferRequest` payload but has no handler bound to it. The CLI dispatch looks up handlers by command ID, and only `bridge` is mapped in the handler registry. As a result, the `execute` command cannot complete the LiFi transaction flow.

**Workaround:** Use `bridge` directly — it runs the full flow including route selection and execution.

**Fix required:** Map `execute` to a handler or merge it into `bridge` semantics. See [Internal: Known Issues](../internal/known-issues).
