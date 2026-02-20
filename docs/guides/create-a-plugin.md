---
sidebar_position: 3
title: Create a Plugin
description: Step-by-step guide to building a new protocol plugin for dappTerminal.
---

# Create a Plugin

This guide walks you through creating a new protocol plugin. A plugin creates a protocol fiber (submonoid M_P), registers commands into it, and optionally adds API routes for server-side protocol calls.

**Prerequisites:** Read [Architecture: Plugin System](../architecture/plugin-system.md) and [Concepts: Algebraic Core](../concepts/algebraic-core.md) first.

---

## Step 1: Scaffold from Template

```bash
cp -r src/plugins/_template src/plugins/my-protocol
```

The template provides the standard directory structure:

```
src/plugins/my-protocol/
├── index.ts      # Plugin metadata & initialize()
├── commands.ts   # G_p command implementations
├── types.ts      # Protocol-specific TypeScript types
└── ARCHITECTURE.md
```

---

## Step 2: Define Plugin Metadata

Update `src/plugins/my-protocol/index.ts`:

```typescript
import { createProtocolFiber, addCommandToFiber } from '@/core/monoid'
import type { Plugin, ProtocolFiber } from '@/plugins/types'
import type { ExecutionContext } from '@/core/types'
import { swapCommand, quoteCommand } from './commands'

export const myProtocolPlugin: Plugin = {
  metadata: {
    id: 'my-protocol',         // Must be unique; used as fiber ID and in command registration
    name: 'My Protocol',
    version: '1.0.0',
    description: 'My DeFi protocol integration',
    tags: ['dex', 'swap'],
  },

  defaultConfig: {
    enabled: true,
    rpcUrl: undefined,
  },

  async initialize(context: ExecutionContext): Promise<ProtocolFiber> {
    // Create the fiber (automatically injects protocol-specific identity)
    const fiber = createProtocolFiber('my-protocol', 'My Protocol')

    // Register commands into the fiber
    addCommandToFiber(fiber, swapCommand)
    addCommandToFiber(fiber, quoteCommand)

    return fiber
  },
}
```

**Critical:** `metadata.id` must match the `protocol` field on every command you register and the `fiber.id` returned from `initialize`. The plugin loader enforces this invariant.

---

## Step 3: Define Commands

Update `src/plugins/my-protocol/commands.ts`:

```typescript
import type { Command, CommandResult } from '@/core/types'
import type { SwapResult } from './types'

export const swapCommand: Command<string, SwapResult> = {
  id: 'swap',
  scope: 'G_p',                  // Required — must be 'G_p'
  protocol: 'my-protocol',       // Required — must match plugin metadata.id
  description: 'Swap tokens via My Protocol',

  async run(args: string, context): Promise<CommandResult<SwapResult>> {
    // 1. Parse args
    const [amountStr, tokenIn, tokenOut] = args.split(' ')
    if (!amountStr || !tokenIn || !tokenOut) {
      return {
        success: false,
        error: new Error('Usage: swap <amount> <tokenIn> <tokenOut>'),
      }
    }

    // 2. Guard on wallet connection
    if (!context.wallet.isConnected) {
      return { success: false, error: new Error('Connect a wallet first') }
    }

    // 3. Call API route (keeps secret server-side)
    const response = await fetch('/api/my-protocol/quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tokenIn, tokenOut, amount: amountStr }),
    })
    const result = await response.json()

    if (!result.success) {
      return { success: false, error: new Error(result.error) }
    }

    // 4. Cache state for follow-up commands
    context.protocolState.set('my-protocol', {
      ...context.protocolState.get('my-protocol'),
      lastQuote: result.data,
      lastQuoteAt: Date.now(),
    })

    // 5. Return structured result
    return { success: true, value: result.data }
  },
}

export const quoteCommand: Command<string, SwapResult> = {
  id: 'quote',
  scope: 'G_p',
  protocol: 'my-protocol',
  description: 'Get a swap quote without executing',

  async run(args: string, context): Promise<CommandResult<SwapResult>> {
    // Similar to swap but no execution
    // ...
    return { success: true, value: quoteData }
  },
}
```

**Rules for G_p commands:**
- `scope` must be exactly `'G_p'` (string literal).
- `protocol` must exactly match the plugin's `metadata.id`.
- `addCommandToFiber` will throw if either is wrong.

---

## Step 4: Define Types

Update `src/plugins/my-protocol/types.ts`:

```typescript
export interface SwapResult {
  tokenIn: string
  tokenOut: string
  amountIn: string
  amountOut: string
  fee: string
  route: string
  timestamp: number
}

export interface MyProtocolState {
  lastQuote?: SwapResult
  lastQuoteAt?: number
}
```

---

## Step 5: Add API Routes (Optional)

If your protocol requires server-side API calls (to keep keys secret, normalize responses, or proxy a third-party API):

```bash
mkdir -p src/app/api/my-protocol/quote
```

Create `src/app/api/my-protocol/quote/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth'
import { rateLimiter } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  const authError = authenticateRequest(request)
  if (authError) return authError

  const limitError = await rateLimiter.check(request, 30)
  if (limitError) return limitError

  try {
    const body = await request.json()

    if (!body.tokenIn || !body.tokenOut || !body.amount) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    // Call protocol API using server-side key
    const quote = await fetchMyProtocolQuote(
      body,
      process.env.MY_PROTOCOL_API_KEY
    )

    return NextResponse.json({ success: true, data: quote })
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[my-protocol/quote]', error)
    }
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
```

See [Guides: Add an API Route](./add-an-api-route.md) for the complete route authoring guide.

---

## Step 6: Add a Handler (Optional)

If your command requires wallet interaction (signing, broadcasting), create `src/plugins/my-protocol/handlers.ts`:

```typescript
import type { HandlerMap } from '@/plugins/types'

export const myProtocolHandlers: HandlerMap = {
  'swap': async (result, context, walletClient) => {
    const txData = result.value

    // Present transaction to wallet
    const hash = await walletClient.sendTransaction({
      to: txData.routerAddress,
      data: txData.calldata,
      value: txData.value,
    })

    // Track the transaction
    await trackSwapTransaction({
      protocol: 'my-protocol',
      txHash: hash,
      walletAddress: context.wallet.address,
      tokenIn: txData.tokenIn,
      tokenOut: txData.tokenOut,
      amountIn: txData.amountIn,
    })

    return { success: true, pipelineOutput: { txHash: hash } }
  },
}
```

---

## Step 7: Register the Plugin

Add your plugin to `src/plugins/index.ts`:

```typescript
import { myProtocolPlugin } from './my-protocol'

export const plugins = [
  oneinchPlugin,
  lifiPlugin,
  wormholePlugin,
  stargatePlugin,
  myProtocolPlugin,  // ← Add here
]
```

---

## Step 8: Document Your Plugin

Create `src/plugins/my-protocol/ARCHITECTURE.md` describing:
- What the protocol does.
- The command list and typical flow.
- API route conventions.
- State shape in `protocolState['my-protocol']`.

---

## Verification Checklist

Before submitting:

- [ ] `metadata.id` matches `protocol` on every command.
- [ ] All commands use `scope: 'G_p'`.
- [ ] No secrets in client-side code (all API keys in server routes).
- [ ] Wallet chain checks added before tx execution.
- [ ] `protocolState` cache is serializable (no functions or class instances).
- [ ] Error messages are user-friendly and actionable.
- [ ] Status tracking or explorer links available for transactions.

---

## Testing Your Plugin

```bash
# Start the dev server
pnpm dev

# In the terminal:
use my-protocol
help            # Verify your commands appear
quote 1 eth usdc
swap 1 eth usdc
```

The plugin loader validates the fiber invariant on startup. If `metadata.id !== fiber.id`, you'll see an error in the console.
