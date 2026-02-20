---
sidebar_position: 2
title: Using the Terminal
description: Navigation, fiber contexts, core commands, history, and tab completion.
---

# Using the Terminal

dappTerminal is a browser-based terminal with multi-tab support and fiber-based protocol contexts. This guide covers the core interaction model.

---

## Prompt Format

The prompt indicates your current context:

```
user@defi>          ← In the global monoid M_G (no active protocol)
user@1inch>         ← Inside the 1inch fiber
user@wormhole>      ← Inside the Wormhole fiber
```

The fiber context determines which protocol commands are available without a namespace prefix.

---

## Entering and Exiting Protocol Fibers

### Enter a fiber

```bash
use <protocol-id>
```

Examples:
```bash
use 1inch
use wormhole
use lifi
use stargate
use coinpaprika
```

After entering, the prompt changes and protocol commands are accessible without the namespace prefix:

```bash
user@defi> use 1inch
user@1inch> swap 1 eth usdc    # resolves to 1inch:swap
user@1inch> quote 0.5 eth usdc
```

### Exit a fiber

```bash
exit
```

Returns to the global monoid:
```bash
user@1inch> exit
user@defi>
```

---

## Core Commands

These commands are always available, regardless of which fiber is active:

| Command | Description |
|---------|-------------|
| `help` | List available commands (fiber-aware) |
| `use <protocol>` | Enter a protocol fiber |
| `exit` | Exit current protocol fiber |
| `history` | Show command execution log |
| `wallet` | Show wallet connection status |
| `whoami` | Display connected wallet address |
| `balance` | Show wallet token balances |
| `price <symbol>` | Get token price (routes to 1inch or CoinPaprika) |
| `chart <type>` | Add chart to analytics panel |
| `clear` | Clear terminal output |

---

## Command Syntax

### Basic command
```bash
command arg1 arg2
```

### Protocol-scoped command (namespace form)
```bash
protocol:command arg1 arg2
```

```bash
1inch:swap 1 eth usdc
wormhole:bridge 0.5 eth optimism arbitrum
coinpaprika:cprice BTC
```

### With flags
```bash
price BTC --protocol coinpaprika
chart BTC --protocol coinpaprika --line
```

---

## Navigation

### Arrow keys
- **Up arrow** — navigate to previous command in history.
- **Down arrow** — navigate forward in history.

### Tab completion
Tab triggers the fuzzy resolver (ρ_f) which suggests matching commands based on what you've typed. Results respect fiber context — inside a fiber, only that fiber's commands are suggested.

---

## Multi-Tab Usage

Each tab has its own independent `ExecutionContext`:

- Different active protocols per tab.
- Separate command history.
- Independent wallet context.

Open a new tab by clicking the **+** button in the tab bar. You can run 1inch commands in one tab while running Wormhole commands in another.

---

## Protocol Commands (When Inside a Fiber)

When you're inside a fiber (after `use <protocol>`), unqualified commands resolve against that fiber first:

```bash
user@defi> use wormhole
user@wormhole> bridge 1 eth optimism arbitrum   # → wormhole:bridge
user@wormhole> quote                            # → wormhole:quote
user@wormhole> status                           # → wormhole:status
user@wormhole> help                             # shows Wormhole commands + global commands
```

Cross-fiber access is blocked when inside a fiber:
```bash
user@wormhole> 1inch:swap 1 eth usdc   # ❌ BLOCKED — cross-fiber access
```

Exit to M_G first:
```bash
user@wormhole> exit
user@defi> 1inch:swap 1 eth usdc       # ✅ Works from global context
```

---

## Wallet Connection

The wallet is connected via RainbowKit (top right of the page). Once connected, wallet state is available to all protocol commands:

```bash
whoami
  → Connected: 0x742d...C3B8
  → Chain: Ethereum Mainnet (1)

balance
  → ETH: 1.245
  → USDC: 5,000.00
```

Some commands (quote, status, search) work without a wallet. Transaction execution always requires a connected wallet.

---

## Fuzzy Matching

If you mistype a command, the fuzzy resolver (ρ_f) suggests the closest match:

```bash
user@1inch> swp 1 eth usdc
  → Did you mean: swap?
```

---

## Getting Help

```bash
help           # Show all available commands in current context
help swap      # Show help for a specific command
```

Inside a fiber, `help` shows that fiber's commands plus essential global commands (help, exit, clear, history, wallet, whoami, balance).
