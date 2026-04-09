import type { ReactNode } from 'react';
import Layout from '@theme/Layout';

import { HomeHero } from '../components/HomeHero';
import { HomeProblemSolution } from '../components/HomeProblemSolution';
import { HomeInteractiveWorkflow } from '../components/HomeInteractiveWorkflow';
import { HomeConcreteFeatures } from '../components/HomeConcreteFeatures';
import { HomeTrustCta } from '../components/HomeTrustCta';

export default function Home(): ReactNode {
  return (
    <Layout
      title="ForgeLoop | The Structured Framework for Discord.js"
      description="Stop wrestling with boilerplate and monolithic files. ForgeLoop provides file-based routing, CLI generators, and structural checks so your Discord.js bot scales cleanly."
    >
      <main className="forge-home relative min-h-[calc(100vh-60px)] w-full overflow-hidden bg-fh-page font-sans selection:bg-[var(--fh-selection-bg)] selection:text-[var(--fh-selection-fg)]">
        
        {/* Abstract background elements */}
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
          <div className="forge-home-hero-grid absolute inset-0" />
          <div className="forge-home-hero-glow absolute left-1/2 top-0 h-[500px] w-[1000px] -translate-x-1/2 -translate-y-1/2 rounded-[100%] blur-[120px]" />
        </div>

        <HomeHero />
        
        {/* Subtle separator */}
        <div className="mx-auto h-[1px] w-full max-w-6xl bg-gradient-to-r from-transparent via-[var(--fh-separator)] to-transparent" />
        
        <HomeProblemSolution />
        <HomeInteractiveWorkflow />
        <HomeConcreteFeatures />
        <HomeTrustCta />

      </main>
    </Layout>
  );
}
