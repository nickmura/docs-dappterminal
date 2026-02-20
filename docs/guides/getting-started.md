---
sidebar_position: 1
title: Getting Started
description: Prerequisites, clone, install, environment setup, and your first commands.
---

# Getting Started

:::caution Early Stage Documentation
These docs are in an early stage. Content may change quickly and some details may be volatile or inaccurate.
For questions or issues, contact the maintainer on Telegram: [t.me/nickmura2](https://t.me/nickmura2).
:::

This guide walks you through setting up dappTerminal locally and running your first commands.

---

## Prerequisites

- **Node.js** 20.0+ (or use `nvm`)
- **pnpm** (recommended) or npm
- **PostgreSQL** — required for the faucet and analytics tracking features
- A browser wallet (MetaMask, Coinbase Wallet, or any RainbowKit-supported wallet)

---

## Installation

```bash
# Clone the repository
git clone https://github.com/nickmura/dappterminal
cd dappterminal

# Install dependencies
pnpm install
```

---

## Environment Setup

Copy the example environment file and fill in your values:

```bash
cp .env.example .env.local
```

### Required Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `ONEINCH_API_KEY` | 1inch API key (get from [1inch dev portal](https://portal.1inch.dev)) |

### Optional Variables (recommended for production)

| Variable | Description |
|----------|-------------|
| `CLIENT_API_KEY` | Secret key for API route authentication |
| `LIFI_API_KEY` | LiFi API key |
| `NODE_ENV` | Set to `production` to enable API authentication |

### Faucet Variables (required for faucet feature)

| Variable | Description |
|----------|-------------|
| `FAUCET_PRIVATE_KEY` | Private key for the faucet wallet (testnet only) |
| `SEPOLIA_RPC_URL` | Sepolia testnet RPC URL |
| `BASE_SEPOLIA_RPC_URL` | Base Sepolia RPC URL |

See [Reference: Environment Variables](../reference/environment-variables) for the complete list.

---

## Database Setup

Run Prisma migrations to set up the database schema:

```bash
pnpm prisma migrate dev
```

If you're not using the faucet or analytics features, you can skip this step and run without a database.

---

## Run the Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## First Commands

Once the app is running, try these commands in the terminal:

### Check wallet status
```bash
wallet
```

### Connect your wallet
Click the **Connect Wallet** button in the top right, then:
```bash
whoami
```

### Get a token price
```bash
price ETH
price BTC --protocol coinpaprika
```

### Search for a coin (Not very useful currently)
```bash
coinsearch solana
```

### Enter a protocol fiber
```bash
use 1inch
help
```

### Get a swap quote
```bash
use 1inch
quote 1 eth usdc
```

### Exit the protocol fiber
```bash
exit
```

---

## Build for Production

```bash
pnpm build
pnpm start
```

Before deploying:
- Set `NODE_ENV=production`
- Set `CLIENT_API_KEY` to a secure random string
- Set `ONEINCH_API_KEY` in the deployment environment
- Update client code to include the `x-api-key` header on API calls
- Run `pnpm prisma migrate deploy` against your production database

See [Reference: Environment Variables](../reference/environment-variables) for the full deployment checklist.
