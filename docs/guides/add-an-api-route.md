---
sidebar_position: 5
title: Add an API Route
description: Route file conventions, response envelope, authentication, rate limiting, and secrets.
---

# Add an API Route

API routes are the server-side boundary that keeps protocol API keys secure and normalizes responses. This guide covers the conventions and required patterns.

**Reference:** `src/app/api/README.md`

---

## When to Add an API Route

Add a route when:
- A protocol API call requires a secret key.
- The response needs transformation before the client uses it.
- You want rate limiting or authentication on the endpoint.
- An SDK must run server-side (e.g., Wormhole SDK).

Do **not** add a route for:
- Simple public RPC reads (use wagmi/viem directly on the client).
- Data that's already available client-side without a key.

---

## Route File Location

```
src/app/api/[protocol]/[action]/route.ts
```

Examples:
```
src/app/api/my-protocol/quote/route.ts
src/app/api/my-protocol/status/route.ts
src/app/api/my-protocol/tokens/route.ts
```

---

## Minimal Route Template

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth'
import { rateLimiter } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  // 1. Authentication (no-op in development)
  const authError = authenticateRequest(request)
  if (authError) return authError

  // 2. Rate limiting
  const limitError = await rateLimiter.check(request, 30)  // 30 req/min
  if (limitError) return limitError

  try {
    // 3. Parse and validate input
    const body = await request.json()
    if (!body.requiredField) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameter: requiredField' },
        { status: 400 }
      )
    }

    // 4. Call protocol API using server-side secret
    const result = await callProtocolAPI(body, process.env.MY_PROTOCOL_API_KEY)

    // 5. Return standard envelope
    return NextResponse.json({ success: true, data: result })

  } catch (error) {
    // 6. Log errors in development only
    if (process.env.NODE_ENV === 'development') {
      console.error('[my-protocol/quote]', error)
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}
```

---

## Response Envelope

Every route must return one of:

```typescript
// Success
{ success: true, data: T }

// Error (with appropriate HTTP status)
{ success: false, error: string }
```

Never return raw protocol responses without wrapping them in this envelope. The envelope is what allows plugin commands to check `result.success` uniformly.

---

## HTTP Methods

| Method | Use for |
|--------|---------|
| `GET` | Read-only data (price, status, tokens) |
| `POST` | Actions with body data (quote, bridge, swap) |

For GET routes with query parameters:

```typescript
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const symbol = searchParams.get('symbol')

  if (!symbol) {
    return NextResponse.json(
      { success: false, error: 'Missing parameter: symbol' },
      { status: 400 }
    )
  }
  // ...
}
```

For dynamic route segments (e.g., `/api/coinpaprika/ticker/[id]`):

```typescript
// src/app/api/coinpaprika/ticker/[id]/route.ts
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params
  // ...
}
```

---

## Authentication

Import and call `authenticateRequest` from `src/lib/auth`:

```typescript
import { authenticateRequest } from '@/lib/auth'

const authError = authenticateRequest(request)
if (authError) return authError  // Returns NextResponse with 401
```

**Behavior:**
- In development (`NODE_ENV !== 'production'`): bypassed (returns `null`).
- In production: validates `x-api-key` header against `CLIENT_API_KEY` env var.

---

## Rate Limiting

Import and call `rateLimiter.check` from `src/lib/rate-limit`:

```typescript
import { rateLimiter } from '@/lib/rate-limit'

const limitError = await rateLimiter.check(request, 30)  // 30 req/min
if (limitError) return limitError  // Returns NextResponse with 429
```

**Current limits by endpoint type:**

| Endpoint type | Recommended limit |
|--------------|------------------|
| Read-only price/ticker | 100 req/min |
| Quote/route discovery | 30 req/min |
| RPC proxy | 10 req/min |

**Known limitation:** The in-memory rate limiter resets on cold starts and doesn't coordinate across serverless instances. See [Internal: Roadmap](../internal/roadmap) for the Redis migration plan.

---

## Environment Variables and Secrets

Access secrets via `process.env`:

```typescript
const apiKey = process.env.MY_PROTOCOL_API_KEY
if (!apiKey) {
  return NextResponse.json(
    { success: false, error: 'Server configuration error' },
    { status: 500 }
  )
}
```

**Never:**
- Hard-code API keys in route files.
- Log API keys or user data (even in development; use partial redaction if needed).
- Return raw error messages that might contain secret values.

---

## Logging Rules

Only log in development:

```typescript
if (process.env.NODE_ENV === 'development') {
  console.error('[my-protocol/quote] Error:', error.message)  // Not the full stack
}
```

In production, structured logging middleware should handle this. Ad-hoc `console.log` in production routes is a security and performance issue.

---

## Unsigned Transactions Only

API routes **never** sign transactions. They return unsigned transaction payloads for client-side signing:

```typescript
// ✅ Correct — return unsigned tx
return NextResponse.json({
  success: true,
  data: {
    to: routerAddress,
    data: calldata,
    value: '0',
    gasLimit: estimatedGas,
  }
})

// ❌ Wrong — never sign server-side
const hash = await serverWallet.sendTransaction(tx)  // Don't do this
```

The exception is the faucet, which has an explicit server-side signing wallet for testnet distribution.

---

## Document Your Route

If the route is user-facing or called by plugin commands, document it in `src/app/api/README.md`:

```markdown
## my-protocol

### POST /api/my-protocol/quote
Get a swap quote.

**Request body:**
- `tokenIn` (string, required)
- `tokenOut` (string, required)
- `amount` (string, required)

**Response:** `{ success, data: { amountOut, fee, route } }`
```

See [Reference: API Routes](../reference/api-routes) for the full route listing.
