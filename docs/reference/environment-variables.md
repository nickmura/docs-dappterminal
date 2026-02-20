---
sidebar_position: 4
title: Environment Variables
description: All .env keys grouped by concern with descriptions and required/optional status.
---

# Environment Variables

All environment variables for dappTerminal. Copy `.env.example` as a starting point.

---

## Database

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Required (faucet/analytics) | PostgreSQL connection string. Format: `postgresql://user:password@host:port/dbname` |
| `POSTGRES_URL` | Alternative | Alternative name for `DATABASE_URL` (same value) |

---

## Protocol API Keys

| Variable | Required | Description |
|----------|----------|-------------|
| `ONEINCH_API_KEY` | Required | 1inch API key. Get from [portal.1inch.dev](https://portal.1inch.dev). Used server-side only. |
| `LIFI_API_KEY` | Optional | LiFi API key for the proxy app. |

---

## Security

| Variable | Required | Description |
|----------|----------|-------------|
| `CLIENT_API_KEY` | Required (production) | Secret key for API route authentication. Set to a secure random string (e.g., `openssl rand -hex 32`). |
| `NODE_ENV` | Required (production) | Set to `production` to enable API authentication and disable development logging. |

**In development** (`NODE_ENV !== 'production'`), API authentication is bypassed. All routes are open.

**In production**, client code must include `x-api-key: <CLIENT_API_KEY>` in every API request.

---

## Faucet

| Variable | Required | Description |
|----------|----------|-------------|
| `FAUCET_WALLET_PRIVATE_KEY` | Required (faucet) | Private key for the faucet signing wallet. Testnet only — never use mainnet keys. |
| `FAUCET_SEPOLIA_RPC` | Optional | Sepolia RPC endpoint. Default: `https://rpc.sepolia.org` |
| `FAUCET_HOLESKY_RPC` | Optional | Holesky RPC endpoint. Default: `https://rpc.holesky.ethpandaops.io` |
| `FAUCET_OPTIMISM_SEPOLIA_RPC` | Optional | Optimism Sepolia RPC endpoint. Default: `https://sepolia.optimism.io` |
| `FAUCET_SEPOLIA_AMOUNT` | Optional | ETH amount to distribute on Sepolia. Default: `0.5` |
| `FAUCET_HOLESKY_AMOUNT` | Optional | ETH amount to distribute on Holesky. Default: `1.0` |
| `FAUCET_OPTIMISM_SEPOLIA_AMOUNT` | Optional | ETH amount on Optimism Sepolia. Default: `0.3` |
| `FAUCET_ADDRESS_COOLDOWN` | Optional | Hours between requests per address. Default: `24` |
| `FAUCET_IP_HOURLY_LIMIT` | Optional | Max requests per hour from same IP. Default: `5` |
| `FAUCET_IP_DAILY_LIMIT` | Optional | Max requests per day from same IP. Default: `10` |

---

## RPC Endpoints

| Variable | Required | Description |
|----------|----------|-------------|
| `SEPOLIA_RPC_URL` | Optional | Sepolia RPC (alternative to `FAUCET_SEPOLIA_RPC`) |
| `BASE_SEPOLIA_RPC_URL` | Optional | Base Sepolia RPC |

---

## Deployment Checklist

Before deploying to production:

- [ ] Set `NODE_ENV=production`
- [ ] Set `ONEINCH_API_KEY`
- [ ] Set `CLIENT_API_KEY` to a secure random string
- [ ] Set `DATABASE_URL` pointing to production PostgreSQL
- [ ] Run `pnpm prisma migrate deploy` against production DB
- [ ] Update client code to include `x-api-key` header on API calls
- [ ] Verify no sensitive data in server logs
- [ ] Set `FAUCET_WALLET_PRIVATE_KEY` if running the faucet
- [ ] Fund faucet wallet on each testnet

---

## Example `.env.local`

```bash
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/defi_terminal"

# Protocol keys
ONEINCH_API_KEY="your-1inch-api-key"

# Security (required in production)
CLIENT_API_KEY="your-secure-random-secret"
NODE_ENV="development"

# Faucet (optional)
FAUCET_WALLET_PRIVATE_KEY="0x..."
FAUCET_SEPOLIA_RPC="https://rpc.sepolia.org"
FAUCET_SEPOLIA_AMOUNT="0.5"
FAUCET_ADDRESS_COOLDOWN=24
FAUCET_IP_HOURLY_LIMIT=5
FAUCET_IP_DAILY_LIMIT=10
```
