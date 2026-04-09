import type { ReactNode } from 'react';
import Head from '@docusaurus/Head';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';

import { HomeHero } from '../components/HomeHero';
import { HomeProblemSolution } from '../components/HomeProblemSolution';
import { HomeInteractiveWorkflow } from '../components/HomeInteractiveWorkflow';
import { HomeConcreteFeatures } from '../components/HomeConcreteFeatures';
import { HomeTrustCta } from '../components/HomeTrustCta';

export default function Home(): ReactNode {
  const { siteConfig } = useDocusaurusContext();
  const siteRoot = new URL(
    siteConfig.baseUrl,
    siteConfig.url.endsWith('/') ? siteConfig.url : `${siteConfig.url}/`,
  ).href;

  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'SoftwareApplication',
        name: 'ForgeLoop',
        applicationCategory: 'DeveloperApplication',
        operatingSystem: 'Any',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        description:
          'Maintenance-first CLI scaffolding for discord.js bots with file-based routing, generators, and health checks.',
        url: siteRoot,
        downloadUrl: 'https://www.npmjs.com/package/create-forgeloop',
      },
      {
        '@type': 'Organization',
        name: 'ForgeLoop',
        url: siteRoot,
        sameAs: [
          'https://github.com/unloopedmido/forgeloop',
          'https://www.npmjs.com/package/create-forgeloop',
        ],
      },
    ],
  };

  return (
    <Layout
      title="The Structured Framework for Discord.js"
      description="Scaffold and maintain Discord.js bots without the boilerplate mess. ForgeLoop adds file-based routing, CLI generators, and structural checks so your project scales cleanly."
    >
      <Head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </Head>
      <main className="forge-home relative min-h-[calc(100vh-60px)] w-full overflow-hidden bg-fh-page font-sans selection:bg-[var(--fh-selection-bg)] selection:text-[var(--fh-selection-fg)]">
        
        {/* Abstract background elements */}
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
          <div className="forge-home-hero-grid absolute inset-0" />
          <div className="forge-home-hero-glow absolute left-1/2 top-0 h-[500px] w-[1000px] -translate-x-1/2 -translate-y-1/2 rounded-[100%] blur-[120px]" />
        </div>

        <HomeHero />
        
        {/* Subtle separator */}
        <div className="mx-auto h-[1px] w-full max-w-6xl bg-linear-to-r from-transparent via-[var(--fh-separator)] to-transparent" />
        
        <HomeProblemSolution />
        <HomeInteractiveWorkflow />
        <HomeConcreteFeatures />
        <HomeTrustCta />

      </main>
    </Layout>
  );
}
