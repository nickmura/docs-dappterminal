---
sidebar_position: 5
title: Resolution Operators
description: The four operators (π, σ, ρ, ρ_f) that map user input to commands in dappTerminal.
---

# Resolution Operators

Four algebraic operators handle the mapping from user input to executable commands. They are implemented in `src/core/command-registry.ts`.

---

## π (Projection)

**Signature:** `π: M → Protocols ∪ {⊥}`

**Definition:** Maps a command to its protocol namespace, or returns ⊥ (undefined) if the command is not protocol-specific.

**Behavior:**
- If `command.scope === 'G_p'`, returns `command.protocol`
- Otherwise, returns `⊥` (undefined)

**Implementation:**

```typescript
// src/core/command-registry.ts:102
π(command: Command): ProtocolId | undefined {
  if (command.scope !== 'G_p') return undefined
  return command.protocol
}
```

**Property:** For fiber M_P, all commands m ∈ M_P satisfy π(m) = P.

**Example:**

```
π(1inch:swap)      = '1inch'
π(wormhole:bridge) = 'wormhole'
π(help)            = ⊥  (G_core command)
π(swap alias)      = ⊥  (G_alias command)
```

---

## σ (Section)

**Signature:** `σ: Protocols → M_P`

**Definition:** Returns the fiber (command set) for a given protocol.

**Behavior:**
- `σ(P)` returns the `ProtocolFiber` object containing all commands in M_P.
- Returns `undefined` if the protocol is not registered.

**Implementation:**

```typescript
// src/core/command-registry.ts:118
σ(protocol: ProtocolId): ProtocolFiber | undefined {
  return this.protocolFibers.get(protocol)
}
```

**Section law:** For a properly registered plugin, `π(σ(P)) = P`. This invariant is enforced by the plugin loader:

```typescript
// src/plugins/plugin-loader.ts:64
if (fiber.id !== plugin.metadata.id) {
  throw new Error(`Plugin invariant violated: fiber.id !== plugin.metadata.id`)
}
```

**Note on spec vs implementation:** The formal spec defines `σ: Protocols → P(M)` (power set — all subsets/compositions). The implementation returns a single fiber. Power set semantics are deferred to v2.0 for workflow discovery.

---

## ρ (Exact Resolver)

**Signature:** `ρ: (Protocols ∪ G) → M ∪ {⊥}`

**Definition:** Deterministically resolves a command string to a command.

**Resolution order:**

1. **Alias resolution** — check global alias map and protocol-local aliases
2. **G_core check** — return core command if found
3. **G_alias check** — return aliased command if found
4. **G_p check** — resolve protocol-scoped command in priority order:
   - a. Explicit `--protocol <P>` flag
   - b. Namespaced form `P:command`
   - c. Active protocol context (`activeProtocol`)
   - d. User preferences

**Implementation:**

```typescript
// src/core/command-registry.ts:130
ρ(context: ResolutionContext): ResolvedCommand | undefined {
  const input = context.input.trim()

  // Resolve aliases (global + protocol-local)
  let resolvedId = this.aliases.get(input) || input

  // Protocol-local alias resolution
  if (!this.aliases.has(input) && context.executionContext.activeProtocol) {
    const protocolAlias = `${context.executionContext.activeProtocol}:${input}`
    const protocolResolvedId = this.aliases.get(protocolAlias)
    if (protocolResolvedId) resolvedId = protocolResolvedId
  }

  // 1. Check G_core
  const coreCommand = this.coreCommands.get(resolvedId)
  if (coreCommand) return { command: coreCommand, resolutionMethod: 'exact' }

  // 2. Check G_alias
  // ... bind protocol at runtime ...

  // 3. Check G_p
  // ... explicit flag → namespace → active context → preferences ...
}
```

**Worked examples:**

```bash
# In M_G (no active protocol)
ρ("help")                    → identityCommand (G_core)
ρ("1inch:swap 1 eth usdc")   → 1inch:swap (G_p, namespace)
ρ("swap 1 eth usdc")         → ⊥  (no active protocol, G_alias not implemented)

# In M_1inch (activeProtocol = '1inch')
ρ("help")                    → help (G_core, always available)
ρ("swap 1 eth usdc")         → 1inch:swap (G_p, from active protocol)
ρ("s 1 eth usdc")            → 1inch:swap (protocol-local alias 's' → 'swap')
ρ("uniswap:swap 1 eth usdc") → ⊥  (cross-fiber access blocked)
ρ("1inch:swap 1 eth usdc")   → 1inch:swap (same fiber, allowed)
```

**Fiber isolation in ρ:**

```typescript
// When active protocol is set, namespace access to other protocols is blocked:
const namespacedMatch = input.match(/^([^:]+):(.+)$/)
if (namespacedMatch) {
  const [, protocol, commandId] = namespacedMatch
  if (context.executionContext.activeProtocol &&
      protocol !== context.executionContext.activeProtocol) {
    return undefined  // Cross-fiber access blocked
  }
}
```

---

## ρ_f (Fuzzy Resolver)

**Signature:** `ρ_f: (Protocols ∪ G) × ℝ → [ResolvedCommand]`

**Definition:** Fuzzy command matching using Levenshtein distance. Returns all commands with similarity ≥ threshold, sorted by confidence.

**Parameters:**
- `context` — resolution context including input and active protocol
- `threshold` — similarity threshold (default: 0.6)

**Behavior:**
- Returns a ranked list of matching commands, highest confidence first.
- Respects fiber isolation: when inside a fiber, only shows that fiber's commands plus G_core.
- Used for tab completion and typo correction.

**Implementation:**

```typescript
// src/core/command-registry.ts:208
ρ_f(context: ResolutionContext, threshold: number = 0.6): ResolvedCommand[] {
  const input = context.input.trim().toLowerCase()
  const matches: ResolvedCommand[] = []

  // Levenshtein similarity
  const similarity = (a: string, b: string): number => {
    const longer = a.length > b.length ? a : b
    const shorter = a.length > b.length ? b : a
    if (longer.length === 0) return 1.0
    const editDistance = this.levenshteinDistance(longer, shorter)
    return (longer.length - editDistance) / longer.length
  }

  // Collect candidates (respecting fiber isolation)
  if (context.executionContext.activeProtocol) {
    // Inside a fiber: only show current fiber's commands + G_core
    const activeFiber = this.σ(context.executionContext.activeProtocol)
    // ...
  } else {
    // In M_G: show all commands
    // ...
  }

  return matches.sort((a, b) => (b.confidence || 0) - (a.confidence || 0))
}
```

**Example — typo correction:**

```bash
user@defi> swp 1 eth usdc
# ρ_f("swp") returns [{ command: swap, confidence: 0.67 }]
# Terminal suggests: Did you mean 'swap'?

user@1inch> rout
# ρ_f("rout") with activeProtocol='1inch' returns [
#   { command: 1inch:quote, confidence: 0.80 },  # if 'quote' is registered
# ]
```

**Tab completion:** The terminal uses ρ_f with a low threshold (0.4–0.5) to suggest completions as you type. Results are filtered to the active fiber context.

---

## Operator Relationships

```
Input string
     │
     ▼
  ρ(input, context)
     │
     ├─→ G_core match → return immediately
     │
     ├─→ G_alias match → resolve protocol → return
     │
     └─→ G_p resolution:
              │
              ├─ --protocol flag → σ(P).get(commandId)
              ├─ P:command syntax → σ(P).get(commandId)  [fiber isolated]
              └─ activeProtocol → σ(activeProtocol).get(commandId)

  π(command) = command.protocol (or ⊥)
  σ(protocol) = fiber (command set)
  ρ_f(input, threshold) = [ranked matches]
```

The projection operator π is primarily used for validation and invariant checking. The section operator σ is the internal lookup mechanism for ρ. The fuzzy resolver ρ_f is the UX layer on top of ρ, used for autocomplete and error recovery.
