---
sidebar_position: 1
title: Core Commands
description: Complete reference for all G_core commands with syntax, arguments, and context behavior.
---

# Core Commands

G_core commands are always available regardless of which protocol fiber is active. They form the backbone of the terminal experience.

**Implementation:** `src/core/commands.ts`

---

## help

Show available commands in the current context.

```
help
help <command>
```

**Context behavior:** Inside a protocol fiber, shows that fiber's commands plus essential global commands (help, exit, clear, history, wallet, whoami, balance). In M_G, shows all commands.

**Examples:**
```bash
help
help swap
help bridge
```

---

## use

Enter a protocol fiber. Sets `ExecutionContext.activeProtocol`.

```
use <protocol-id>
```

| Argument | Description |
|----------|-------------|
| `protocol-id` | ID of the registered protocol (e.g., `1inch`, `wormhole`, `lifi`, `stargate`, `coinpaprika`) |

**Examples:**
```bash
use 1inch       # Enter 1inch fiber → prompt: user@1inch>
use wormhole    # Enter Wormhole fiber
use coinpaprika # Enter CoinPaprika fiber
```

**Effect on resolution:** After `use <protocol>`, unqualified commands resolve against that fiber before falling back to G_core.

---

## exit

Exit the current protocol fiber. Clears `ExecutionContext.activeProtocol`.

```
exit
```

Returns to M_G (global monoid): `user@defi>`

---

## history

Display the command execution log from `ExecutionContext.history`.

```
history
history <n>       # Show last n entries
```

**Known limitation:** Commands that go through the handler dispatch path (transaction signing) may not appear in history consistently. See [Internal: Known Issues](../internal/known-issues).

---

## wallet

Show wallet connection status.

```
wallet
```

**Output:**
```
Wallet: Connected
Address: 0x742d35Cc6634C0532925a3b8D7C3b8F4B1a3c8E
Chain: Ethereum Mainnet (1)
```

---

## whoami

Display the connected wallet address.

```
whoami
```

**Output:**
```
0x742d35Cc6634C0532925a3b8D7C3b8F4B1a3c8E
```

---

## balance

Show token balances for the connected wallet.

```
balance
balance <token>
```

**Examples:**
```bash
balance         # Show all token balances
balance ETH     # Show ETH balance only
balance USDC    # Show USDC balance only
```

---

## price

Get the current price for a token. Routes to 1inch by default, falls back to CoinPaprika.

```
price <symbol> [--protocol <provider>]
```

| Argument | Description |
|----------|-------------|
| `symbol` | Token ticker (e.g., ETH, BTC, USDC) |
| `--protocol` | Override provider: `1inch`, `coinpaprika`, `coingecko`, `dexscreener` |

**Priority order (no flag):**
1. Explicit `--protocol` flag
2. Active protocol context
3. User preference
4. Default: 1inch
5. Fallback: CoinPaprika

**Examples:**
```bash
price ETH
price BTC --protocol coinpaprika
price SOL --protocol coinpaprika
```

See [Market Data: Overview](../market-data/overview.md) for the full routing details.

---

## chart

Add a chart to the analytics panel.

```
chart <type-or-symbol> [--protocol <provider>] [--line]
```

| Argument | Description |
|----------|-------------|
| `type-or-symbol` | Built-in chart type or token symbol |
| `--protocol` | Override chart provider |
| `--line` | Use line chart mode instead of candlestick |

**Built-in charts (no provider):**
```bash
chart performance    # App performance metrics
chart network        # Network graph
chart portfolio      # Wallet portfolio
chart balances       # Token balance history
```

**Token charts (provider-routed):**
```bash
chart BTC --protocol coinpaprika     # CoinPaprika OHLCV
chart WBTC --protocol 1inch          # 1inch DEX chart
```

See [Market Data: Chart Integration](../market-data/chart-integration.md) for routing logic.

---

## clear

Clear terminal output.

```
clear
```

---

## cprice

Get cryptocurrency price directly from CoinPaprika. Shorthand for `price <symbol> --protocol coinpaprika`.

```
cprice <symbol>
```

**Examples:**
```bash
cprice BTC
cprice ETH
cprice SOL
```

---

## coinsearch

Search for cryptocurrencies by name or symbol in the CoinPaprika database (56K+ coins).

```
coinsearch <query>
```

**Examples:**
```bash
coinsearch bitcoin
coinsearch ethereum
coinsearch doge
coinsearch stable    # Find stablecoins
```

---

## cchart

Add a CoinPaprika OHLCV chart to the analytics panel. Shorthand for `chart <symbol> --protocol coinpaprika`.

```
cchart <symbol> [--line]
```

**Examples:**
```bash
cchart BTC          # 30-day candlestick chart
cchart ETH --line   # 30-day line chart
cchart SOL
cchart DOGE
```

---

## request (Faucet)

Request testnet tokens.

```
request <network> [address]
```

| Argument | Description |
|----------|-------------|
| `network` | `sepolia`, `holesky`, or `optimism-sepolia` |
| `address` | Target address (optional, defaults to connected wallet) |

**Examples:**
```bash
request sepolia
request holesky 0x742d...
```

See [Guides: Testnet Faucet](../guides/testnet-faucet.md).
