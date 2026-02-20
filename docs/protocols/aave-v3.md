---
sidebar_position: 8
title: Aave v3
description: Aave v3 lending protocol — planned supply/borrow/withdraw flows with health factor checks.
---

# Aave v3

:::info Work in Progress
The Aave v3 plugin architecture is defined and the handler flow is documented. Full implementation is planned but not yet complete. This page describes the intended design.
:::

**Plugin:** `src/plugins/aave-v3/`
**Docs:** `src/plugins/aave-v3/ARCHITECTURE.md`

---

## Planned Commands

### `supply <token> <amount>`

Supply tokens to Aave lending pool.

```bash
user@aave-v3> supply usdc 1000
  → Checking pool health...
  → Supply: 1000 USDC to Aave v3 (Ethereum)
  → Estimated APY: 4.5%
  → [Wallet confirmation]
```

### `withdraw <token> <amount>`

Withdraw previously supplied tokens.

### `borrow <token> <amount>`

Borrow tokens against supplied collateral. Requires health factor check.

### `repay <token> <amount>`

Repay borrowed tokens.

### `positions`

Show current supply/borrow positions and health factor.

```bash
user@aave-v3> positions
  Supplied:   1000 USDC ($1,000)
  Borrowed:   0.5 ETH ($1,700)
  Health Factor: 1.42 ⚠️ (Warning: below 1.5)
```

### `markets`

List available Aave v3 markets with APY and utilization rates.

### `rates`

Show current supply and borrow APRs for key assets.

---

## Architecture (Planned)

**Data sources:**
- Contract helpers for on-chain reads (via viem/wagmi)
- GraphQL/REST for aggregate market data
- Aave v3 Protocol Data Provider for efficient multi-asset reads

**Health factor checks:** Before executing borrow or withdraw, the command validates the resulting health factor. If it would drop below a safe threshold (e.g., 1.1), the command aborts with a warning.

**Lending lifecycle:**
1. Read market data (APY, utilization, available liquidity)
2. Plan transaction (supply/borrow/repay/withdraw)
3. Validate health factor
4. Build tx via contract helpers
5. Client signs and broadcasts

**Protocol state:**
```typescript
protocolState['aave-v3'] = {
  cachedMarkets?: AaveMarket[]
  userPositions?: AavePosition[]
  lastUpdated?: number
}
```

---

## Current Status

The `aave-v3` supply and withdraw handler architecture is implemented and appears coherent in the codebase. However, the full command surface (borrow, repay, positions, markets) is not yet wired up. The plugin is better aligned with the fibered monoid model than some other integrations.

See `src/plugins/aave-v3/ARCHITECTURE.md` for the current implementation notes.
