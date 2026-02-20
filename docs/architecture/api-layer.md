---
sidebar_position: 3
title: API Layer
description: Next.js API routes, the response envelope pattern, and the security model.
---

# API Layer

The API layer is the server-side boundary between the browser and external services. It keeps secrets server-side, normalizes responses, and enforces authentication and rate limiting.

**Primary surface:** `src/app/api/`

---

## Design Principles

1. **Protocol isolation** — each protocol has its own `/api/[protocol]/` namespace.
2. **Standard format** — all routes return `{ success, data | error }`.
3. **No direct wallet access** — routes return transaction data; the client signs.
4. **Stateless** — session state managed in ExecutionContext (client-side), not server-side.

---

## Route Organization

```
src/app/api/
├── 1inch/
│   ├── gas/route.ts
│   ├── eth_rpc/route.ts          # RPC proxy with method allowlist
│   ├── swap/classic/quote/route.ts
│   ├── charts/candle/route.ts
│   ├── charts/line/route.ts
│   ├── tokens/search/route.ts
│   └── orderbook/limit/...
├── lifi/
│   ├── routes/route.ts
│   ├── step-transaction/route.ts
│   ├── test-key/route.ts
│   └── status/route.ts
├── wormhole/
│   ├── quote/route.ts
│   └── bridge/route.ts
├── stargate/
│   └── quote/route.ts
├── coinpaprika/
│   ├── ticker/[id]/route.ts
│   └── ohlcv/[id]/route.ts
├── analytics/
│   ├── user-history/route.ts
│   ├── protocol-volume/route.ts
│   └── global-stats/route.ts
└── faucet/
    ├── request/route.ts
    ├── status/route.ts
    └── history/route.ts
```

---

## Response Envelope

Every route returns one of two shapes:

```typescript
// Success
{ success: true, data: T }

// Error
{ success: false, error: string }
```

Commands calling API routes check `response.success` before using the data:

```typescript
const response = await fetch('/api/1inch/gas')
const result = await response.json()

if (!result.success) {
  return { success: false, error: result.error }
}

return { success: true, value: result.data }
```

---

## Example Route

```typescript
// src/app/api/my-protocol/quote/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth'
import { rateLimiter } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  // Authentication (skipped in development)
  const authError = authenticateRequest(request)
  if (authError) return authError

  // Rate limiting
  const limitError = await rateLimiter.check(request, 30)  // 30 req/min
  if (limitError) return limitError

  try {
    const body = await request.json()

    // Validate required parameters
    if (!body.tokenIn || !body.tokenOut) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters: tokenIn, tokenOut' },
        { status: 400 }
      )
    }

    // Call protocol API/SDK using server-side secrets
    const quote = await fetchProtocolQuote(body, process.env.MY_PROTOCOL_API_KEY)

    // Return standard envelope
    return NextResponse.json({ success: true, data: quote })

  } catch (error) {
    // Log in development only
    if (process.env.NODE_ENV === 'development') {
      console.error('Quote error:', error)
    }
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
```

---

## Authentication

**Implementation:** `src/lib/auth.ts`

Routes call `authenticateRequest(request)` which:
- In **development** (`NODE_ENV !== 'production'`): returns `null` (bypassed).
- In **production**: validates the `x-api-key` header against `CLIENT_API_KEY` env var.

```typescript
export function authenticateRequest(request: NextRequest): NextResponse | null {
  if (process.env.NODE_ENV !== 'production') return null

  const apiKey = request.headers.get('x-api-key')
  if (!apiKey || apiKey !== process.env.CLIENT_API_KEY) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    )
  }

  return null  // null means authenticated
}
```

Client code must include `'x-api-key': CLIENT_API_KEY` in production fetch calls.

---

## Rate Limiting

**Implementation:** `src/lib/rate-limit.ts`

In-memory rate limiter with configurable limits per endpoint:

| Endpoint | Limit |
|----------|-------|
| `1inch/eth_rpc` | 10 req/min |
| `lifi/routes` | 30 req/min |
| `1inch/gas` | 100 req/min |

**Known limitation:** The current rate limiter is process-local. In a serverless environment (Vercel), each worker instance has its own in-memory store, so limits effectively reset on cold starts and don't coordinate across instances. A Redis/Upstash migration is documented in [Internal: Roadmap](../internal/roadmap).

---

## RPC Proxy Allowlist

The 1inch RPC proxy (`/api/1inch/eth_rpc`) enforces an explicit allowlist of read-only Ethereum methods:

```typescript
const ALLOWED_METHODS = [
  'eth_call',
  'eth_getBalance',
  'eth_getCode',
  'eth_getStorageAt',
  'eth_blockNumber',
  'eth_getBlockByHash',
  'eth_getBlockByNumber',
  'eth_getTransactionCount',
  'eth_getTransactionByHash',
  'eth_getTransactionReceipt',
  'eth_estimateGas',
  'eth_gasPrice',
  'eth_maxPriorityFeePerGas',
  'net_version',
]
// eth_sendRawTransaction and all write methods are blocked → 403
```

---

## Adding a New Route

1. Create `src/app/api/[protocol]/[action]/route.ts`.
2. Add authentication and rate limiting using shared utilities.
3. Validate inputs and return `{ success, data | error }`.
4. Use `process.env.NODE_ENV === 'development'` guards around all logging.
5. Never sign transactions server-side — return unsigned payloads only.
6. Document in `src/app/api/README.md` if the route is user-facing.

See [Guides: Add an API Route](../guides/add-an-api-route.md) for the full walkthrough.
