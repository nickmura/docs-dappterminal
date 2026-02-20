---
sidebar_position: 1
title: Introduction
description: dappTerminal — a terminal-based interface for DeFi protocols built on a fibered monoid algebraic foundation.
---

# dappTerminal

:::caution Early Stage Documentation
These docs are in an early stage. Content may change quickly and some details may be volatile or inaccurate.
For questions or issues, contact the maintainer on Telegram: [t.me/nickmura2](https://t.me/nickmura2).
:::

dappTerminal is a Next.js application that provides a terminal-based interface for interacting with multiple DeFi protocols. It is built on a **fibered monoid** algebraic structure that gives the command system provable isolation, composability, and extensibility guarantees.

## What it is

A composable CLI for DeFi. You type commands in a terminal, the system resolves them against a typed command registry, and protocol plugins execute them — fetching quotes, building transactions, and returning structured results. Every tab has its own execution context so you can run independent protocol sessions simultaneously.

```
user@defi> use 1inch
user@1inch> swap 1 eth usdc
  → Quote: 1 ETH → 3,412 USDC (fee: 0.3%)
  → Confirm transaction? [y/n]
```

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, React 19, TypeScript |
| Styling | Tailwind CSS 4 |
| Wallet | RainbowKit + wagmi + viem |
| State | React hooks + ExecutionContext |
| Architecture | Fibered Monoid (algebraic structure) |
| Database | PostgreSQL via Prisma |

## Implemented Protocols

| Protocol | Type | Status |
|----------|------|--------|
| 1inch | DEX aggregator | ✅ Complete |
| LiFi | Bridge aggregator | ✅ Complete |
| Wormhole | Cross-chain bridge | ✅ Complete |
| Stargate | LayerZero bridge | ✅ Complete |
| CoinPaprika | Market data (56K+ coins) | ✅ Complete |
| Uniswap v4 | DEX | 🚧 In progress |
| Aave v3 | Lending | 📋 Planned |

## How to Navigate These Docs

**New to dappTerminal?**
Start with [Concepts: Overview](./concepts/overview.md) for the non-math mental model, then [Guides: Getting Started](./guides/getting-started.md) to run it locally.

**Building a plugin?**
Read [Architecture: Plugin System](./architecture/plugin-system.md), then follow [Guides: Create a Plugin](./guides/create-a-plugin.md).

**Curious about the math?**
[Concepts: Algebraic Core](./concepts/algebraic-core.md) covers the fibered monoid specification. [Concepts: Resolution Operators](./concepts/resolution-operators.md) covers π, σ, ρ, ρ_f.

**Integrating a DeFi protocol?**
[Protocols: Overview](./protocols/overview.md) has the comparison table. [Protocols: Transaction Lifecycle](./protocols/transaction-lifecycle.md) documents the common quote → execute → status pattern.

**Looking for market data commands?**
[Market Data: Overview](./market-data/overview.md) explains the `--protocol` flag and provider hierarchy.

**Need command or API reference?**
[Reference: Core Commands](./reference/core-commands) and [Reference: API Routes](./reference/api-routes).

## Key Design Decisions

**Why a terminal UI?** A terminal naturally maps to the command registry model: one input, one resolved command, one structured result. The algebraic structure (fibered monoid) was chosen specifically because it makes the type-safety and isolation properties of this model provable.

**Why a fibered monoid?** Each DeFi protocol is independent — you don't want a bug in Wormhole to affect 1inch commands. The fibered monoid gives each protocol its own submonoid (fiber), with mathematical closure and isolation guarantees. See [Concepts: Algebraic Core](./concepts/algebraic-core.md).

**Why Next.js API routes?** API keys must stay server-side. Routing protocol calls through `/api/[protocol]/[action]` keeps secrets off the client and provides a consistent authentication and rate-limiting boundary.
