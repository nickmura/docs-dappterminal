# dappTerminal Docs

Documentation site for [dappTerminal](https://github.com/nickmura/dappterminal) — a CLI-first DeFi terminal built on a fibered monoid algebraic model.

Built with [Docusaurus](https://docusaurus.io/).

---

## Structure

```
docs/
├── intro.md                    # Project overview and navigation map
├── concepts/                   # Algebraic model, command scopes, execution context
├── architecture/               # Layer breakdown, plugin system, API layer, execution engine
├── protocols/                  # Per-protocol docs (1inch, LiFi, Wormhole, Stargate, Uniswap v4, Aave v3)
├── market-data/                # Market data providers (CoinPaprika, CoinGecko, DexScreener)
├── guides/                     # Getting started, plugin authoring, faucet setup, pipeline DSL
├── reference/                  # TypeScript interfaces, env vars, API routes, command reference
└── internal/                   # Audit log, known issues, security findings, roadmap

notes/                          # Source notes and drafts (not rendered by Docusaurus)
```

---

## Local Development

```bash
pnpm install
pnpm start
```

Opens a live-reloading dev server at `http://localhost:3000`.

## Build

```bash
pnpm build
```

Generates static output into `build/`. The build enforces `onBrokenLinks: 'throw'` — all internal links must resolve.

## Deployment

```bash
GIT_USER=<username> pnpm deploy
```

Builds and pushes to the `gh-pages` branch for GitHub Pages hosting.
