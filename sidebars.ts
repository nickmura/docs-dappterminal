import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  mainSidebar: [
    'intro',
    {
      type: 'category',
      label: 'Concepts',
      items: [
        'concepts/overview',
        'concepts/algebraic-core',
        'concepts/command-scopes',
        'concepts/execution-context',
        'concepts/resolution-operators',
      ],
    },
    {
      type: 'category',
      label: 'Architecture',
      items: [
        'architecture/layers',
        'architecture/plugin-system',
        'architecture/api-layer',
        'architecture/execution-engine',
        'architecture/state-and-storage',
      ],
    },
    {
      type: 'category',
      label: 'Protocols',
      items: [
        'protocols/overview',
        'protocols/transaction-lifecycle',
        'protocols/1inch',
        'protocols/lifi',
        'protocols/wormhole',
        'protocols/stargate',
        'protocols/uniswap-v4',
        'protocols/aave-v3',
      ],
    },
    {
      type: 'category',
      label: 'Market Data',
      items: [
        'market-data/overview',
        'market-data/chart-integration',
        'market-data/coinpaprika',
        'market-data/coingecko',
        'market-data/dexscreener',
      ],
    },
    {
      type: 'category',
      label: 'Guides',
      items: [
        'guides/getting-started',
        'guides/using-the-terminal',
        'guides/create-a-plugin',
        'guides/add-a-command',
        'guides/add-an-api-route',
        'guides/pipeline-dsl',
        'guides/testnet-faucet',
      ],
    },
    {
      type: 'category',
      label: 'Reference',
      collapsed: true,
      items: [
        'reference/core-commands',
        'reference/command-interface',
        'reference/plugin-interface',
        'reference/environment-variables',
        'reference/api-routes',
      ],
    },
    {
      type: 'category',
      label: 'Internal Notes',
      collapsed: true,
      items: [
        'internal/known-issues',
        'internal/audit-log',
        'internal/security-findings',
        'internal/roadmap',
        'internal/changelog',
      ],
    },
  ],
};

export default sidebars;
