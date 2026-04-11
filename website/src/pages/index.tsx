import type { ReactNode } from 'react';
import Head from '@docusaurus/Head';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import { CliExample } from '../components/docs/CliExample';

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
          'Maintenance-first CLI scaffolding for discord.js bots with generators and project health checks.',
        url: siteRoot,
        downloadUrl: 'https://www.npmjs.com/package/create-forgeloop',
      },
    ],
  };

  return (
    <Layout
      title="ForgeLoop"
      description="Scaffold and maintain Discord.js bots without carrying around unnecessary template weight."
    >
      <Head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </Head>
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-16 px-6 py-16 md:py-24">
        <section className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
          <div className="space-y-6">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ifm-color-primary)]">
              ForgeLoop
            </p>
            <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-[var(--ifm-heading-color)] md:text-6xl">
              Scaffold Discord.js bots, then keep the project maintainable.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-[var(--ifm-color-content-secondary)]">
              ForgeLoop stays focused on the useful path: generate a bot, add handlers later,
              inspect command payloads, and run structural health checks without carrying a lot
              of platform baggage.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                className="button button--primary button--lg"
                to="/docs/quickstart"
              >
                Quickstart
              </Link>
              <Link
                className="button button--secondary button--lg"
                to="/docs/commands/init"
              >
                Command reference
              </Link>
            </div>
          </div>

          <CliExample
            title="Create a project"
            command="npm create forgeloop@latest my-bot"
            output={`┌──────────────────────────────────────────────┐
│ ForgeLoop init                               │
└──────────────────────────────────────────────┘
  Scaffolding my-bot in my-bot

Project profile
  • Language          ts
  • Preset            modular
  • Package manager   npm
  • Database          none
  • Tooling           eslint-prettier
  • Git               disabled
  • Docker            disabled
  • CI                disabled
✓ Project ready at my-bot`}
          />
        </section>

        <section className="grid gap-6 md:grid-cols-3">
          <article className="rounded-2xl border border-[var(--ifm-toc-border-color)] bg-[var(--ifm-card-background-color)] p-6">
            <h2 className="text-xl font-semibold text-[var(--ifm-heading-color)]">Direct scaffolds</h2>
            <p className="mt-3 text-sm leading-7 text-[var(--ifm-color-content-secondary)]">
              `init` writes a project you can read without learning a framework-specific config
              layer first.
            </p>
          </article>
          <article className="rounded-2xl border border-[var(--ifm-toc-border-color)] bg-[var(--ifm-card-background-color)] p-6">
            <h2 className="text-xl font-semibold text-[var(--ifm-heading-color)]">Useful follow-up commands</h2>
            <p className="mt-3 text-sm leading-7 text-[var(--ifm-color-content-secondary)]">
              `add`, `remove`, `commands`, `info`, and `doctor` keep the CLI relevant after the
              first scaffold.
            </p>
          </article>
          <article className="rounded-2xl border border-[var(--ifm-toc-border-color)] bg-[var(--ifm-card-background-color)] p-6">
            <h2 className="text-xl font-semibold text-[var(--ifm-heading-color)]">Less compatibility drag</h2>
            <p className="mt-3 text-sm leading-7 text-[var(--ifm-color-content-secondary)]">
              The generated config now has one file shape and one export style, which makes the
              project easier to inspect and the CLI easier to maintain.
            </p>
          </article>
        </section>
      </main>
    </Layout>
  );
}
