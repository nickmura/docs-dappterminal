---
sidebar_position: 1
title: Protocol Overview
description: DeFi protocol comparison table and how each integration differs in the fibered monoid runtime.
---

# Protocol Overview

All protocol integrations fit the same monoid runtime (M, ∘, e), but they diverge in how quotes are built, how transactions are prepared, and where state lives.

---

## Protocol Comparison

| Protocol | Type | Commands | State Location | Signing |
|----------|------|----------|----------------|---------|
| **1inch** | DEX aggregator | `swap`, `quote`, `chains`, `tokens`, `price`, `chart` | `protocolState['1inch']` | Client (wagmi) |
| **LiFi** | Bridge aggregator | `bridge`, `routes`, `quote`, `execute`, `status`, `chains` | `protocolState['lifi']` | Client (wagmi) via proxy app |
| **Wormhole** | Cross-chain bridge | `bridge`, `quote`, `routes` | `protocolState['wormhole']` | Client (wagmi) |
| **Stargate** | LayerZero bridge | `bridge`, `quote`, `chains` | `protocolState['stargate']` | Client (wagmi) |
| **CoinPaprika** | Market data | `cprice`, `coinsearch`, `cchart` | None (stateless) | N/A |
| **Uniswap v4** | DEX | `swap`, `quote`, `positions` | `protocolState['uniswap-v4']` | Client (wagmi) |
| **Aave v3** | Lending | `supply`, `withdraw`, `positions`, `markets` | `protocolState['aave-v3']` | Client (wagmi) |
| **Faucet** | Testnet distribution | `request`, `status`, `history` | Prisma DB | Server-side |

---

## LiFi (Bridge Aggregator)

**Commands:** `bridge <amount> <token0> <token1> <network0> <network1>`
(token1 optional for some token pairs like USDC or ETH)

**Why it is different:** API key must stay server-side; advanced route planning.

**Architecture:** CLI plugin + separate proxy app (`../lifi-api-nextjs`).

**Flow:**
1. Quote routes via `/api/lifi/routes`.
2. Prepare per-step tx via `/api/lifi/step-transaction`.
3. Execute steps (manual signing or SDK delegated).
4. Track status via LiFi status endpoint.

**State:** cached route + per-step execution metadata.

**Docs:** `src/plugins/lifi/ARCHITECTURE.md`

---

## Wormhole (Bridge)

**Commands:** `bridge <amount> <token0> <token1> <network0> <network1>`
(token1 optional for some token pairs like USDC or ETH)

**Why it is different:** SDK-backed route discovery with multiple route types (AutomaticCCTPRoute, etc.).

**Architecture:** API routes build serialized transfer context; CLI signs.

**Flow:**
1. Quote via `/api/wormhole/quote` (best route + route list).
2. Build tx list via `/api/wormhole/bridge`.
3. CLI signs and sends ordered txs.

**State:** selected route + serialized transfer request.

**Docs:** `src/plugins/wormhole/ARCHITECTURE.md`

---

## Stargate (Bridge)

**Commands:** `bridge <token0> <network0> <network1>`
(stablecoin-only, same-token transfers with current API calls)

**Why it is different:** stablecoin-only flow with API-driven steps and slippage calc.

**Architecture:** server-side quote from Stargate API; CLI executes steps.

**Flow:**
1. Quote via `/api/stargate/quote`.
2. Receive approval + bridge tx steps.
3. CLI signs and submits in order.

**State:** cached quote with `stargateSteps`.

**Docs:** `src/plugins/stargate/ARCHITECTURE.md`

---

## 1inch (DEX Aggregator)

**Commands:** `swap`, `quote`, `chains`, `tokens`, `price`, `chart`

**Why it is different:** DEX aggregator with on-chain price discovery; also serves as the default price and chart provider.

**Architecture:** API routes proxy 1inch REST API; RPC proxy enforces method allowlist.

**Flow:**
1. Quote via 1inch Swap API.
2. CLI displays quote summary.
3. User confirms; wagmi signs and broadcasts.

**State:** last quote in `protocolState['1inch']`.

**Docs:** `src/plugins/1inch/ARCHITECTURE.md`

---

## Faucet (Testnet Distribution)

**Why it is different:** internal stateful service with rate limiting and audit logs. Server-side signing (not client-side).

**Architecture:** database-backed request tracking + wallet service.

**Flow:**
1. Request via `/api/faucet/request`.
2. Server signs and broadcasts.
3. Status and history via `/api/faucet/status` and `/api/faucet/history`.

**State:** persisted in Prisma models.

**Docs:** `src/plugins/faucet/ARCHITECTURE.md`

---

## Uniswap v4 (In Progress)

**Commands (planned):** `swap`, `quote`, `positions`, `discover`

**Why it is different:** Universal Router calldata for v4 hook-aware routing; complex approval flow.

**Architecture:** client-side swap command builds calldata; signing happens via wagmi.

**Status:** 🚧 In progress

**Docs:** `src/plugins/uniswap-v4/architecture.md`

---

## Aave v3 (Planned)

**Commands (planned):** `supply <token> <amount>`, `withdraw <token> <amount>`, `positions`, `markets`, `rates`

**Why it is different:** lending lifecycle requires richer state and health factor checks before execution.

**Architecture (planned):** contract helpers + GraphQL/REST data sources.

**Flow (planned):**
1. Read market + reserve data.
2. Plan txs (supply, borrow, repay, withdraw).
3. Validate health factor before execution.

**State:** cached reserves and user positions.

**Status:** 📋 Planned

**Docs:** `src/plugins/aave-v3/ARCHITECTURE.md`

---

## Common Architecture Pattern

All DeFi protocols follow the same monoid runtime:
- Commands are G_p with `scope: 'G_p'` and `protocol: '<id>'`.
- State is cached in `ExecutionContext.protocolState['<id>']`.
- API routes handle secrets and return unsigned transaction data.
- The client signs and broadcasts.

The differences are in protocol-specific flows, quote data shapes, and the number of transaction steps. See [Transaction Lifecycle](./transaction-lifecycle.md) for the common pattern.
