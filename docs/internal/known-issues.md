---
sidebar_position: 1
title: Known Issues
tags: [internal]
description: Tracked bugs, architectural gaps, and risk-rated issues from plugin system and core audits.
---

# Known Issues

:::caution Internal Document
This page tracks unresolved issues identified in code reviews and audits. It is intended for contributors and maintainers, not end users.
:::

**Sources:** `PLUGIN_SYSTEM_AUDIT.md` (2026-02-01), `review_overview_feb13.md` (2026-02-14), `CORE_PLUGIN_INTEGRATION_AUDIT.md` (2026-02-04)

---

## Critical Risk

### 1. Alias command protocol mismatch vs handler selection

**Rating:** Critical | **File:** `src/core/command-registry.ts`, `src/core/commands.ts`, `src/components/cli.tsx`

`CommandRegistry.ρ` returns `resolved.protocol` for G_alias commands based on preference/active context, not on the protocol that the alias command ultimately executes. Alias commands then perform their own fallback protocol search and may run a different protocol command internally. The CLI handler dispatch depends on `resolved.protocol + resolved.command.id`, so the wrong handler can be selected — or no handler runs for a request payload that requires one.

**Risk:** Incorrect signing flows, wrong chain assumptions, silent execution failures.

**Fix:** Normalize the alias execution contract — the resolver should return the *actual* selected protocol, or alias commands should return protocol metadata consumed by the dispatch layer.

---

### 2. `lifi:execute` produces payload but has no handler

**Rating:** Critical | **File:** `src/plugins/lifi/commands.ts:474-529`, `src/plugins/lifi/handlers.ts:229-230`

The `execute` command returns a `lifiTransferRequest` payload, but the LiFi handler registry only maps `bridge`. The CLI dispatch looks up handlers by command ID, so `execute` cannot complete the transaction flow even when cached quote/route state exists.

**Workaround:** Use `bridge` directly for the full LiFi flow.

**Fix:** Map `execute` to a handler, or merge `execute` semantics into `bridge`.

---

## High Risk

### 3. Plugin lifecycle is global while execution contexts are per-tab

**Rating:** High | **File:** `src/plugins/plugin-loader.ts`, `src/components/cli.tsx`

Tabs create independent `ExecutionContext` objects, but the plugin loader is a global singleton and fibers are registered into the global command registry. New tabs repeatedly call `loadPlugin()` into the same loader without guarding for already-loaded plugins, causing repeated initialization and potential overwrites of the same registry entries.

**Risk:** Tab isolation is partial. Lifecycle semantics are ambiguous (per-tab state, global plugin/fiber registry).

**Fix:** Decide and enforce one lifecycle boundary — either per-tab loader+registry or global loader with explicitly shared semantics.

---

### 4. Handler path bypasses `ExecutionContext.history` updates

**Rating:** High | **File:** `src/components/cli.tsx`

The non-handler path updates context via `updateExecutionContext()`. The handler path returns early before this update. As a result, `ExecutionContext.history` and the terminal-rendered history can diverge.

**Risk:** The `history` G_core command shows incomplete history. Pipeline DSL (planned) depends on complete history.

**Fix:** Ensure handler path calls `updateExecutionContext` consistently after execution.

---

### 5. Namespaced alias (`protocol:s`) shadowed by global alias resolution

**Rating:** High | **File:** `src/core/command-registry.ts:152, 189`, `src/core/commands.ts:741-746`

Alias map lookup runs before namespace parsing. `registerCoreCommands()` adds a global `s → swap` alias which can intercept the user's intent for a namespaced alias. Behavior differs from intended explicit namespace semantics.

---

## Medium Risk

### 6. Plugin unload does not deregister commands

**Rating:** Medium | **File:** `src/plugins/plugin-loader.ts:129-134`

`unloadPlugin` removes the plugin entry but does not deregister fiber commands. After "unloading", the command registry still resolves the plugin's commands.

**Risk:** False sense of removal. Useful for dynamic plugin reloading or plugin security isolation.

---

### 7. Hybrid core/plugin model for CoinPaprika and Faucet

**Rating:** Medium | **File:** `src/plugins/coinpaprika/index.ts`, `src/plugins/faucet/index.ts`, `src/core/commands.ts`

Core imports commands directly from the CoinPaprika and Faucet plugin folders. These commands have `scope: 'G_core'` but are also attempted as plugin fiber commands. This breaks the scope invariant and would throw at runtime if these plugins are ever loaded as true protocol plugins.

**Risk:** These features are not truly plugin-modular; they are effectively core utilities stored under `plugins/`.

**Fix:** Choose one model — either promote to core-only utilities and remove the plugin registration, or keep as proper plugins with `G_p` scope and optional G_core aliases.

---

### 8. Test/typecheck pipeline is not wired

**Rating:** Medium | **File:** `src/core/__tests__/alias-resolution.test.ts`, `src/core/monoid.test.ts`

`pnpm exec tsc --noEmit` fails due to missing test runner globals/types. Static typecheck cannot be used as a reliable CI gate in the current repo state.

**Fix:** Add/align test runner config (vitest/jest) and isolate test tsconfig.

---

## Low Risk

### 9. Excessive debug logging in critical runtime paths

**Rating:** Low | **File:** `src/components/cli.tsx:422, 428, 661, 1142`

Frequent `console.log` calls in CLI/tab lifecycle and command flow. Produces noisy logs, makes debugging harder, and potentially leaks runtime context (wallet state, protocol selection, tab names) in production.

**Fix:** Guard all logging behind `process.env.NODE_ENV === 'development'` and use structured logging.

---

### 10. Dual registration of CoinPaprika/Faucet commands

**Rating:** Low | **File:** `src/plugins/coinpaprika/commands.ts`, `src/plugins/faucet/commands.ts`

These commands have `scope: 'G_core'` but are also passed to `addCommandToFiber` in the plugin's `initialize()`. The fiber validator will throw if these plugins are ever loaded as standard protocol plugins.

---

## Recommendations

| Priority | Fix |
|----------|-----|
| 1 | Normalize alias execution contract (Critical #1) |
| 2 | Fix LiFi execute handler binding (Critical #2) |
| 3 | Enforce one plugin lifecycle boundary (High #3) |
| 4 | Ensure handler path updates history (High #4) |
| 5 | Resolve core-vs-plugin boundary for CoinPaprika/Faucet (Medium #7) |
| 6 | Fix test runner config and typecheck pipeline (Medium #8) |
