---
sidebar_position: 7
title: Testnet Faucet
description: Setup and usage of the dappTerminal testnet faucet — Sepolia, Holesky, and Optimism Sepolia.
---

# Testnet Faucet

dappTerminal includes a built-in testnet token faucet for Sepolia, Holesky, and Optimism Sepolia. Unlike other protocol plugins, the faucet signs transactions server-side and uses a database-backed rate limiting system to prevent abuse.

**Plugin:** `src/plugins/faucet/`
**Architecture:** `src/plugins/faucet/ARCHITECTURE.md`

---

## Supported Networks

| Network | Chain ID | Default Amount |
|---------|----------|----------------|
| Sepolia | 11155111 | 0.5 ETH |
| Holesky | 17000 | 1.0 ETH |
| Optimism Sepolia | 11155420 | 0.3 ETH |

---

## Setup

### 1. Database Setup

The faucet requires PostgreSQL for rate limiting and audit logging.

```bash
# Create the database
createdb defi_terminal

# Or using psql
psql -U postgres -c "CREATE DATABASE defi_terminal;"

# Run Prisma migrations
pnpm prisma migrate dev

# Seed initial configuration
pnpm prisma db seed
```

### 2. Generate a Faucet Wallet

Create a **dedicated testnet-only wallet** for the faucet:

```javascript
// Run in Node.js REPL
const { Wallet } = require('ethers')
const wallet = Wallet.createRandom()
console.log('Address:', wallet.address)
console.log('Private Key:', wallet.privateKey)
```

**Never use a mainnet wallet as the faucet wallet.**

### 3. Fund the Faucet Wallet

Get testnet ETH from public faucets:
- Sepolia: [sepoliafaucet.com](https://sepoliafaucet.com) or [alchemy.com/faucets/ethereum-sepolia](https://www.alchemy.com/faucets/ethereum-sepolia)
- Holesky: [faucet.quicknode.com/ethereum/holesky](https://faucet.quicknode.com/ethereum/holesky)
- Optimism Sepolia: [app.optimism.io/faucet](https://app.optimism.io/faucet)

Fund each chain you want to support.

### 4. Configure Environment Variables

```bash
cp .env.example .env.local
```

Add the faucet configuration:

```bash
# Required
DATABASE_URL="postgresql://postgres:password@localhost:5432/defi_terminal"
FAUCET_WALLET_PRIVATE_KEY="0xYOUR_TESTNET_PRIVATE_KEY"

# RPC endpoints (defaults provided)
FAUCET_SEPOLIA_RPC="https://rpc.sepolia.org"
FAUCET_HOLESKY_RPC="https://rpc.holesky.ethpandaops.io"
FAUCET_OPTIMISM_SEPOLIA_RPC="https://sepolia.optimism.io"

# Distribution amounts (optional, shown as defaults)
FAUCET_SEPOLIA_AMOUNT="0.5"
FAUCET_HOLESKY_AMOUNT="1.0"
FAUCET_OPTIMISM_SEPOLIA_AMOUNT="0.3"

# Rate limits (optional, shown as defaults)
FAUCET_ADDRESS_COOLDOWN=24   # hours between requests per address
FAUCET_IP_HOURLY_LIMIT=5    # requests per hour from same IP
FAUCET_IP_DAILY_LIMIT=10    # requests per day from same IP
```

---

## Commands

### `request <network> [address]`

Request testnet tokens for a network.

```bash
> request sepolia
  → Requesting 0.5 ETH on Sepolia...
  → Request ID: req_1234abcd
  → Status: PENDING

> request sepolia 0x742d35Cc6634C0532925a3b8D7C3b8F4B1a3c8E
  → Requesting 0.5 ETH for 0x742d...
  → Request ID: req_5678efgh
```

If no address is provided, tokens are sent to the connected wallet address.

### `faucet:status <requestId|txHash>`

Check the status of a faucet request.

```bash
> faucet:status req_1234abcd
  → Status: COMPLETED
  → Tx: 0xabc...def
  → Network: Sepolia
  → Amount: 0.5 ETH
  → Explorer: https://sepolia.etherscan.io/tx/0xabc...def

> faucet:status 0xabc...def
  → Same lookup by tx hash
```

### `faucet:history [address] [network]`

View request history for an address.

```bash
> faucet:history
  → Last 10 requests for 0x742d...

> faucet:history 0x742d... sepolia
  → Sepolia requests for 0x742d...
```

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/faucet/request` | POST | Request tokens |
| `/api/faucet/status` | GET | Check request status |
| `/api/faucet/history` | GET | View request history |
| `/api/faucet/config` | GET | Get faucet configuration (public) |

---

## Rate Limiting

The faucet enforces three rate limiting layers:

| Layer | Limit |
|-------|-------|
| Per-address | 24-hour cooldown per network |
| Per-IP hourly | 5 requests/hour |
| Per-IP daily | 10 requests/day |

All limits are configurable via environment variables and stored in the database (not in-memory), so they survive server restarts and coordinate across instances.

**Security note:** The faucet endpoint currently trusts `x-forwarded-for`/`x-real-ip` headers directly for IP detection. A determined user can spoof these to bypass the IP rate limit. Fixing this requires using the request IP from your hosting platform's trusted source. See [Internal: Security Findings](../internal/security-findings).

---

## Architecture

**Server-side signing:** Unlike DeFi protocols where the client signs, the faucet has a private key on the server. The wallet service (`src/lib/faucet/wallet.ts`) signs and broadcasts transactions server-side.

**Request lifecycle:**
```
request command
  → POST /api/faucet/request
  → Rate limit check (3 layers, DB-backed)
  → Create FaucetRequest record (PENDING)
  → Send transaction via faucet wallet
  → Update FaucetRequest record (COMPLETED/FAILED)
  → Create FaucetAuditLog entry
  → Return request ID
```

**Database models:**
- `FaucetRequest` — full request lifecycle tracking
- `RateLimitRecord` — persistent per-address and per-IP windows
- `FaucetConfig` — per-network configuration (amounts, enabled status)
- `FaucetAuditLog` — structured event trail for all requests

---

## Monitoring

Check faucet wallet balances regularly. The faucet will fail silently if the wallet runs out of funds. Consider setting up alerts on wallet balance below a threshold.

Prisma scripts for maintenance:

```bash
# View recent requests
pnpm prisma studio  # Opens visual database browser

# Check rate limit records
psql $DATABASE_URL -c "SELECT * FROM \"RateLimitRecord\" ORDER BY \"updatedAt\" DESC LIMIT 20;"
```
