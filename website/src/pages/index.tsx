import { lazy, Suspense, type ReactNode } from 'react';
import Head from '@docusaurus/Head';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';

import { HomeHero } from '../components/HomeHero';
const HomeProblemSolution = lazy(() =>
  import('../components/HomeProblemSolution').then((module) => ({ default: module.HomeProblemSolution })),
);
const HomeInteractiveWorkflow = lazy(() =>
  import('../components/HomeInteractiveWorkflow').then((module) => ({
    default: module.HomeInteractiveWorkflow,
  })),
);
const HomeConcreteFeatures = lazy(() =>
  import('../components/HomeConcreteFeatures').then((module) => ({ default: module.HomeConcreteFeatures })),
);
const HomeTrustCta = lazy(() =>
  import('../components/HomeTrustCta').then((module) => ({ default: module.HomeTrustCta })),
);

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
          <div
            className="absolute inset-0 [background-size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] [-webkit-mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"
            style={{
              backgroundImage:
                'linear-gradient(to right, color-mix(in srgb, var(--fh-gutter) 18%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in srgb, var(--fh-gutter) 18%, transparent) 1px, transparent 1px)',
            }}
          />
          <div
            className="absolute left-1/2 top-0 h-[500px] w-[1000px] -translate-x-1/2 -translate-y-1/2 rounded-[100%] blur-[120px]"
            style={{ background: 'radial-gradient(circle, var(--fh-hero-glow) 0%, transparent 70%)' }}
          />
        </div>

        <HomeHero />
        
        {/* Subtle separator */}
        <div className="mx-auto h-[1px] w-full max-w-6xl bg-linear-to-r from-transparent via-[var(--fh-separator)] to-transparent" />
        
        <Suspense fallback={null}>
          <HomeProblemSolution />
          <HomeInteractiveWorkflow />
          <HomeConcreteFeatures />
          <HomeTrustCta />
        </Suspense>

      </main>
    </Layout>
  );
}
