import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import styles from './index.module.css';

const NAV_SECTIONS = [
  {
    label: 'Concepts',
    description: 'Algebraic model, command scopes, execution context',
    href: '/concepts/overview',
  },
  {
    label: 'Architecture',
    description: 'Layer breakdown, plugin system, API layer',
    href: '/architecture/layers',
  },
  {
    label: 'Protocols',
    description: '1inch, LiFi, Wormhole, Stargate, Uniswap v4, Aave v3',
    href: '/protocols/overview',
  },
  {
    label: 'Market Data',
    description: 'CoinPaprika, CoinGecko, DexScreener, 1inch charts',
    href: '/market-data/overview',
  },
  {
    label: 'Guides',
    description: 'Getting started, plugin authoring, faucet setup',
    href: '/guides/getting-started',
  },
  {
    label: 'Reference',
    description: 'TypeScript interfaces, env vars, API routes',
    href: '/reference/core-commands',
  },
];

const TERMINAL_LINES = [
  { prompt: true,  text: 'use 1inch' },
  { prompt: false, text: 'switching context → 1inch' },
  { prompt: true,  text: 'swap 1 eth usdc' },
  { prompt: false, text: '→ fetching best route...' },
  { prompt: false, text: '→ quote: 1 ETH → 3,412 USDC  (via Uniswap + Curve)' },
  { prompt: false, text: '→ confirm? [y/n] y' },
  { prompt: false, text: '✓ tx submitted  0xabc...def' },
  { prompt: true,  text: 'use wormhole' },
  { prompt: false, text: 'switching context → wormhole' },
  { prompt: true,  text: 'bridge 1 eth optimism arbitrum' },
  { prompt: false, text: '→ best route: AutomaticCCTPRoute  (~2 min)' },
  { prompt: false, text: '→ [wallet confirmation]' },
  { prompt: false, text: '✓ bridge initiated  0x123...789' },
];

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();

  return (
    <Layout title={siteConfig.title} description={siteConfig.tagline}>
      <main className={styles.main}>

        {/* ── Hero ─────────────────────────────── */}
        <section className={styles.hero}>
          <div className={styles.heroInner}>
            <p className={styles.eyebrow}>documentation</p>
            <h1 className={styles.title}>dappTerminal.</h1>
            <p className={styles.tagline}>{siteConfig.tagline}</p>
            <div className={styles.cta}>
              <Link className={styles.ctaPrimary} to="/guides/getting-started">
                Get started →
              </Link>
              <Link className={styles.ctaSecondary} to="/concepts/overview">
                Concepts
              </Link>
            </div>
          </div>
        </section>

        {/* ── Terminal preview (hidden) ─────────── */}
        {/* <section className={styles.terminalSection}>
          <div className={styles.terminalWindow}>
            <div className={styles.terminalBar}>
              <span className={styles.terminalDot} />
              <span className={styles.terminalDot} />
              <span className={styles.terminalDot} />
              <span className={styles.terminalTitle}>dappTerminal</span>
            </div>
            <div className={styles.terminalBody}>
              {TERMINAL_LINES.map((line, i) => (
                <div key={i} className={styles.terminalLine}>
                  {line.prompt ? (
                    <>
                      <span className={styles.terminalPrompt}>user@dappterminal&gt;</span>
                      <span className={styles.terminalCmd}>{line.text}</span>
                    </>
                  ) : (
                    <span className={styles.terminalOut}>{line.text}</span>
                  )}
                </div>
              ))}
              <div className={styles.terminalLine}>
                <span className={styles.terminalPrompt}>user@dappterminal&gt;</span>
                <span className={styles.terminalCursor} />
              </div>
            </div>
          </div>
        </section> */}

        {/* ── Navigation grid ───────────────────── */}
        <section className={styles.grid}>
          <div className={styles.gridInner}>
            {NAV_SECTIONS.map((s) => (
              <Link key={s.label} className={styles.card} to={s.href}>
                <span className={styles.cardLabel}>{s.label} →</span>
                <span className={styles.cardDesc}>{s.description}</span>
              </Link>
            ))}
          </div>
        </section>

      </main>
    </Layout>
  );
}
