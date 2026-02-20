---
sidebar_position: 5
title: Changelog
description: Version history of significant architecture changes, security fixes, and audit milestones.
tags: [internal]
---

# Changelog

:::caution Internal Document
This page records significant changes to the dappTerminal architecture, security posture, and plugin system. It is intended for maintainers, not end users.
:::

---

## 2026-02-14 — CLI Hardening Audit

**Source:** `notes_feb14.md`

- Identified 5 blockers preventing safe pipeline DSL rollout.
- Established Phase 0 hardening plan: `HandlerResult`, unified context update, per-tab FIFO queue, `ExecutionEngine` extraction, typed event model.
- Defined target architecture: headless execution kernel + CLI/GUI adapters.
- Pipeline DSL rollout deferred until Phase 0 complete.

---

## 2026-02-13 — Core Plugin Integration Audit

**Source:** `CORE_PLUGIN_INTEGRATION_AUDIT.md`, `review_overview_feb13.md`

- Identified 10 tracked issues across critical/high/medium/low risk tiers.
- Critical findings: alias resolution mismatch, missing LiFi execute handler.
- High findings: plugin lifecycle vs. per-tab context boundary, handler path history bypass.
- Medium findings: unload does not deregister, hybrid core/plugin model, broken typecheck pipeline.
- See [Known Issues](./known-issues) for full tracking.

---

## 2026-02-01 — Plugin System Audit

**Source:** `PLUGIN_SYSTEM_AUDIT.md`

- First structured audit of the plugin system's fiber isolation model.
- Confirmed `addCommandToFiber` scope validation is present but incomplete.
- Noted repeated `loadPlugin()` calls across tab creation.
- Identified hybrid core/plugin boundary issue with CoinPaprika and Faucet.

---

## 2025-10-24 — Production Security Audit — Implementation

**Source:** `AUDIT_IMPLEMENTATION_SUMMARY.md`, `SECURITY_FIXES.md`

- Added `src/lib/auth.ts` — `authenticateRequest` utility with `x-api-key` validation.
- Added `src/lib/rate-limit.ts` — in-memory per-IP rate limiter.
- Added `src/lib/chains.ts` — centralized chain config with 7 chains and protocol mappings.
- Secured `/api/1inch/eth_rpc`, `/api/lifi/routes`, `/api/1inch/gas` with auth + rate limiting.
- Added 14-method RPC allowlist to `/api/1inch/eth_rpc`; write methods return 403.
- Fixed stale closure state management in `cli.tsx` (4+ `setTabs` calls).
- Added plugin loading state and command queue to prevent silent failures on startup.
- Gated production logging to `NODE_ENV === 'development'` in 4 API routes.
- Added `.env.example` and deployment checklist.

**Open items from this audit:** Analytics endpoints, 1inch proxy routes, faucet IP spoofing, in-memory rate limiter — see [Security Findings](./security-findings).

---

## 2025-09-XX — Fibered Monoid Spec Formalized

**Source:** `FIBERED-MONOID-SPEC.md`

- Formal specification of the fibered monoid algebraic model.
- Defined: command monoid (M, ∘, e), protocol submonoids M_P, command scopes (G_core, G_alias, G_p).
- Specified: resolution operators π, σ, ρ, ρ_f with typed contracts.
- Defined: fiber isolation invariant, partition invariant, associativity laws.
- Added: proof sketches for monoid laws, implementation compliance tables.

---

## 2025-09-XX — Initial Architecture

**Source:** `ARCHITECTURE.md`

- Established 4-layer architecture: core monoid / plugin system / Next.js API layer / React frontend.
- Initial protocol integrations: 1inch DEX aggregator, LiFi bridge, Wormhole bridge, Stargate bridge.
- Client-side signing model via wagmi; API routes handle secrets server-side.
- CoinPaprika as the default fallback price provider (56K+ coins).
- Faucet system with Prisma-backed rate limiting and server-side signing.
