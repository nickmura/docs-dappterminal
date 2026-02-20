import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'dappTerminal',
  tagline: 'A mathematically rigorous, composable CLI for DeFi protocols',
  favicon: 'img/favicon.ico',

  future: {
    v4: true,
  },

  url: 'https://docs.dappterminal.xyz',
  baseUrl: '/',

  organizationName: 'nickmura',
  projectName: 'dappterminal',

  onBrokenLinks: 'throw',
  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/nickmura/dappterminal/tree/main/',
          routeBasePath: '/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/docusaurus-social-card.jpg',
    colorMode: {
      defaultMode: 'dark',
      disableSwitch: true,
      respectPrefersColorScheme: false,
    },
    navbar: {
      title: 'dappTerminal.',
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'mainSidebar',
          position: 'left',
          label: 'Docs',
        },
        {
          href: 'https://github.com/nickmura/dappterminal',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            {
              label: 'Getting Started',
              to: '/guides/getting-started',
            },
            {
              label: 'Architecture',
              to: '/architecture/layers',
            },
            {
              label: 'Concepts',
              to: '/concepts/overview',
            },
          ],
        },
        {
          title: 'Protocols',
          items: [
            {
              label: 'Protocol Overview',
              to: '/protocols/overview',
            },
            {
              label: 'Transaction Lifecycle',
              to: '/protocols/transaction-lifecycle',
            },
          ],
        },
        {
          title: 'More',
          items: [
            {
              label: 'GitHub',
              href: 'https://github.com/nickmura/dappterminal',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} dappTerminal. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.oneDark,
      darkTheme: prismThemes.oneDark,
      additionalLanguages: ['typescript', 'bash'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
