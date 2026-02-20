---
sidebar_position: 1
title: Market Data Overview
description: Why market data providers exist separately from DeFi protocols, and how the --protocol flag routes across providers.
---

# Market Data Overview

Market data providers are a distinct category from DeFi execution protocols. They provide price discovery, charting, and coin search without requiring wallet connections or executing transactions.

---

## Why a Separate Category?

DeFi protocols (1inch, LiFi, Wormhole, Stargate) exist to execute transactions. Market data providers exist to answer questions:

- What is the current price of ETH?
- What was BTC's price 30 days ago?
- How does the price of this token compare to yesterday?

While 1inch provides price data as a side effect of its DEX aggregation, CoinPaprika, CoinGecko, and DexScreener are purpose-built for market data. They cover far more assets (56K+ vs ~10K) and are chain-agnostic.

---

## Providers

| Provider | Coverage | Data Type | Rate Limits | Status |
|----------|----------|-----------|-------------|--------|
| **1inch** | ~10K tokens | Real-time DEX (on-chain) | Generous | ✅ Implemented |
| **CoinPaprika** | 56K+ coins | Market aggregated (100+ exchanges) | 25K req/month free | ✅ Implemented |
| **CoinGecko** | ~13K coins | Market aggregated | Free tier / Pro | ℹ️ Not yet implemented |
| **DexScreener** | On-chain pairs | Real-time DEX (pair-based) | Rate limited | ℹ️ Not yet implemented |

---

## The `--protocol` Flag

The `price` and `chart` alias commands accept a `--protocol` flag to select which provider to use:

```bash
price BTC --protocol coinpaprika
price ETH --protocol 1inch
chart BTC --protocol coinpaprika
chart WBTC --protocol 1inch
```

### Priority Order for `price`

When you run `price <symbol>` without a `--protocol` flag, the system tries providers in this order:

1. **Explicit `--protocol` flag** — if specified, use that provider exclusively.
2. **Active protocol context** — if you've run `use coinpaprika`, use CoinPaprika.
3. **User preference** — saved preference for the price command.
4. **Default: 1inch** — chain-specific DEX price data.
5. **Fallback: CoinPaprika** — if 1inch doesn't have the token, try CoinPaprika.

```bash
# Uses 1inch (default)
price ETH

# Uses CoinPaprika explicitly
price BTC --protocol coinpaprika

# Uses CoinPaprika (1inch doesn't have this token; falls back automatically)
price DOGE
```

### Priority Order for `chart`

The `chart` alias routes based on both the `--protocol` flag and whether the symbol is a built-in chart type:

```bash
# Built-in charts (always available, no provider needed)
chart performance
chart network
chart portfolio

# Token charts — routed by --protocol flag
chart WBTC --protocol 1inch       # DEX price chart
chart BTC --protocol coinpaprika  # Market aggregated OHLCV
chart ETH --protocol coingecko    # CoinGecko data (when implemented)
chart TOKEN/SOL --protocol dexscreener  # On-chain pair data (when implemented)
```

---

## When to Use Which Provider

### Use 1inch when:
- Getting DEX prices for tokens actively traded on-chain.
- You need real-time on-chain liquidity data.
- The token is on Ethereum mainnet or a major EVM chain.

### Use CoinPaprika when:
- Looking up any coin from 56K+ options.
- Getting market aggregated prices (multi-exchange average).
- Checking coins not available on 1inch (e.g., Solana ecosystem tokens).
- Viewing 30-day OHLCV chart history.

### Use CoinGecko when (once implemented):
- You prefer CoinGecko's specific coin ID system.
- You need CoinGecko-specific metadata (categories, tags, social data).

### Use DexScreener when (once implemented):
- Looking up a specific trading pair on a DEX.
- You have a token contract address and want real on-chain pair data.
- Analyzing a newly listed token not yet in CoinPaprika.

---

## Provider-Specific Commands

Each provider has its own native commands in addition to the shared `price` and `chart` aliases:

| Provider | Native Commands |
|----------|----------------|
| CoinPaprika | `cprice <symbol>`, `coinsearch <query>`, `cchart <symbol>` |
| 1inch | `price` (default), `chart` (default for DEX charts) |
| CoinGecko | (when implemented) |
| DexScreener | (when implemented) |

See the individual provider pages for command details and examples.
