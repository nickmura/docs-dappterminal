---
sidebar_position: 3
title: Security Findings
description: Open and resolved security findings with severity, location, and recommended fixes.
tags: [internal]
---

# Security Findings

:::caution Internal Document
This page tracks active security findings and fix recommendations. Review before deploying to production.
:::

---

## Open Findings

The following issues were identified during the production security audit and have not yet been fully resolved.

### HIGH — Analytics Endpoints Unauthenticated

**Risk:** Anyone can scrape every user's wallet history and protocol stats.

**Location:**
- `src/app/api/analytics/user-history/route.ts:24-83`
- `src/app/api/analytics/protocol-volume/route.ts:17-94`
- `src/app/api/analytics/global-stats/route.ts:17-35`

**Issue:** All three analytics endpoints skip `authenticateRequest`. They expose aggregated swap history and per-wallet protocol volume to unauthenticated callers.

**Fix:** Apply the same `x-api-key` gate and rate limiting used on the 1inch and LiFi routes, or move the aggregation behind server-side-only RPCs.

---

### HIGH — 1inch Proxy Routes Unauthenticated

**Risk:** Anonymous users can burn your 1inch API quota or spam limit-order endpoints under your key.

**Location:**
- `src/app/api/1inch/orderbook/limit/create/route.ts`
- `src/app/api/1inch/orderbook/limit/submit/route.ts`
- `src/app/api/1inch/charts/candle/route.ts`
- `src/app/api/1inch/charts/line/route.ts`
- `src/app/api/1inch/swap/classic/quote/route.ts`
- `src/app/api/1inch/tokens/search/route.ts`

**Issue:** These routes forward requests with `ONEINCH_API_KEY` but do not validate the caller. Logging-only cleanup was applied to chart routes; authentication was not added.

**Fix:** Enforce API key checks and per-IP throttling on all these routes, or proxy through an authenticated backend job.

---

### MEDIUM — Faucet IP Spoofing

**Risk:** Callers can bypass faucet rate limiting by spoofing `x-forwarded-for`.

**Location:** `src/app/api/faucet/request/route.ts:61-70`

**Issue:** The faucet rate limiter reads the client IP from `x-forwarded-for` and `x-real-ip` headers, which are user-controlled. An attacker can rotate fake IPs to bypass all rate limiting.

**Fix:** Use `request.ip` from the hosting platform or a trusted proxy header set by the load balancer. Reject user-controlled forwarded headers.

---

### MEDIUM — In-Memory Rate Limiter Not Shared Across Instances

**Risk:** Rate limits reset on every serverless worker cold start and are not coordinated across instances — effectively no rate limit in production.

**Location:** `src/lib/rate-limit.ts:15-107`

**Issue:** The rate limiter is process-local and uses `setInterval` for cleanup. In a serverless/edge environment, each worker instance maintains its own state. Multiple dangling intervals accumulate on long-lived workers.

**Fix:** Move rate limit state to a shared store (Redis/Upstash) or use the Prisma database as the source of truth for request counts.

---

### MEDIUM — Auth Logging Leaks API Key

**Risk:** A compromised log stream leaks the server's `CLIENT_API_KEY` and the caller's key value.

**Location:** `src/lib/auth.ts:95-104`

**Issue:** The authentication utility logs both the supplied `x-api-key` header and the configured `CLIENT_API_KEY` value on every authenticated request.

**Fix:** Strip key values from logs or wrap them in a debug flag. Redact before emitting.

---

### LOW — BigInt Overflow in Wormhole and Balance Display

**Risk:** Balances and fees silently misreport for positions over 2^53.

**Location:**
- `src/hooks/useTokenBalances.ts:96-107`
- `src/plugins/wormhole/handlers.ts:191-208`

**Issue:** Token balance formatting and Wormhole quote amounts cast `bigint` values to `Number`. JavaScript's `Number` cannot represent integers above 2^53 accurately. Large positions are silently truncated.

**Fix:** Replace `Number(bigintValue)` with `formatUnits(bigintValue, decimals)` from viem throughout these paths. Never cast token amounts to `Number`.

---

### LOW — Unbounded Chart Cache Memory Leak

**Risk:** Switching tokens or time ranges repeatedly leaks browser memory.

**Location:** `src/components/charts/price-chart.tsx:105-158`

**Issue:** `PriceChart` caches every request in an ever-growing `Map` with no eviction policy. Full API responses are also logged, flooding devtools.

**Fix:** Add an LRU eviction policy or size cap (e.g., max 50 entries). Remove the response logging.

---

### LOW — Turbopack Forced in Production Build

**Risk:** Silent optimization regressions vs. the stable compiler.

**Location:** `package.json:6-13`

**Issue:** The build script forces `next build --turbopack`, which is experimental for production bundles.

**Fix:** Use `next build` for production releases. Keep `next dev --turbopack` for development.

---

## Resolved Findings

| Finding | Location | Resolution | Date |
|---------|----------|------------|------|
| Unprotected API routes | `1inch/eth_rpc`, `lifi/routes`, `1inch/gas` | `authenticateRequest` + rate limiting added | 2025-10-24 |
| Arbitrary RPC methods | `1inch/eth_rpc/route.ts` | 14-method allowlist enforced; write methods return 403 | 2025-10-24 |
| Stale closure state drops | `cli.tsx` (4+ `setTabs` calls) | Rewritten with functional update form | 2025-10-24 |
| Commands fail silently during plugin load | `cli.tsx` | Loading state + command queue added | 2025-10-24 |
| Production log leaks wallet data | 4 API routes | Logging gated behind `NODE_ENV === 'development'` | 2025-10-24 |
| Hardcoded chain maps | Multiple plugins | Centralized `src/lib/chains.ts` with 7 chains | 2025-10-24 |

---

## Priority Order for Remaining Fixes

1. Analytics endpoints — HIGH (data exposure, no auth)
2. 1inch proxy routes — HIGH (quota drain, no auth)
3. In-memory rate limiter — MEDIUM (ineffective in serverless)
4. Faucet IP spoofing — MEDIUM (bypass rate limiting)
5. Auth logging — MEDIUM (key leakage in logs)
6. BigInt overflow — LOW (silent precision loss)
7. Chart cache — LOW (browser memory leak)
8. Turbopack in production — LOW (build risk)
