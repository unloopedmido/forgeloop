import React from 'react';
import { motion } from 'motion/react';
import Link from '@docusaurus/Link';
import { Terminal, Copy, Check, ArrowRight } from 'lucide-react';
import { HomeTerminalFrame } from './HomeTerminalFrame';

export function HomeHero() {
  const [copied, setCopied] = React.useState(false);

  const copyCommand = () => {
    navigator.clipboard.writeText('npm create forgeloop@latest my-bot');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="relative z-10 mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-12 px-6 pb-20 pt-32 lg:flex-row lg:items-start lg:pb-32 lg:pt-48">
      {/* Left: Text Content */}
      <div className="flex flex-col items-center text-center lg:items-start lg:text-left lg:w-1/2">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="font-display text-5xl font-bold tracking-tight text-fh-heading md:text-6xl lg:text-[4.5rem] lg:leading-[1.1]"
        >
          The structured framework for{' '}
          <span className="text-blue-400">Discord.js</span> bots.
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mt-6 max-w-xl text-lg leading-relaxed text-fh-muted"
        >
          Stop wrestling with boilerplate and monolithic files. ForgeLoop provides file-based routing, CLI generators, and structural checks so your Discord.js bot scales cleanly.
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mt-10 flex w-full max-w-xl flex-col items-stretch gap-3 sm:max-w-none sm:flex-row sm:items-center sm:gap-3 lg:max-w-none lg:items-start"
        >
          <motion.div
            whileHover={{ y: -2, scale: 1.01 }}
            whileTap={{ scale: 0.985 }}
            className="relative w-full sm:w-auto"
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 -z-10 rounded-full blur-xl"
              style={{ background: 'color-mix(in srgb, var(--fh-hero-docs-border-hover) 26%, transparent)' }}
            />
            <Link
              to="/docs/intro"
              className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border px-5 text-[0.88rem] font-semibold tracking-[0.01em] text-fh-heading no-underline backdrop-blur-[14px] sm:w-auto sm:px-6 sm:text-[0.94rem]"
              style={{
                backgroundImage:
                  'linear-gradient(165deg, color-mix(in srgb, var(--ifm-color-primary) 22%, transparent) 0%, color-mix(in srgb, var(--fh-surface) 84%, white 16%) 100%)',
                borderColor: 'color-mix(in srgb, var(--ifm-color-primary) 48%, var(--fh-edge))',
                boxShadow:
                  '0 1px 0 color-mix(in srgb, white 24%, transparent) inset, 0 14px 38px -20px color-mix(in srgb, var(--ifm-color-primary) 46%, transparent)',
              }}
            >
              <span>Documentation</span>
              <motion.span
                whileHover={{ x: 2 }}
                className="inline-flex h-6 w-6 items-center justify-center rounded-full border"
                style={{
                  borderColor: 'color-mix(in srgb, var(--ifm-color-primary) 46%, transparent)',
                  background: 'color-mix(in srgb, var(--ifm-color-primary) 16%, transparent)',
                }}
              >
                <ArrowRight className="h-3.5 w-3.5 opacity-95" strokeWidth={2.2} />
              </motion.span>
            </Link>
          </motion.div>

          <motion.div
            whileHover={{ y: -1.5 }}
            className="relative flex min-h-12 w-full min-w-0 max-w-full flex-1 items-center gap-2 rounded-full border px-2 py-1 sm:w-auto sm:max-w-[34rem] sm:flex-none sm:gap-2.5 sm:px-[0.85rem] sm:py-[0.35rem]"
            style={{
              backgroundImage: 'var(--fh-hero-cmd-bg)',
              borderColor: 'var(--fh-hero-cmd-border)',
              boxShadow: 'var(--fh-hero-cmd-glow)',
            }}
          >
            <span
              aria-hidden
              className="h-[1.35rem] w-[3px] shrink-0 rounded-[2px] opacity-90"
              style={{
                background: 'var(--fh-hero-cmd-accent)',
                boxShadow: '0 0 12px color-mix(in srgb, var(--fh-hero-cmd-accent) 45%, transparent)',
              }}
            />
            <span className="min-w-0 flex-1 overflow-x-auto py-1 font-mono text-[0.75rem] leading-[1.45] whitespace-nowrap sm:text-sm">
              <span className="text-[var(--fh-hero-cmd-keyword)]">npm</span>{' '}
              <span className="text-[var(--fh-hero-cmd-keyword)]">create</span>{' '}
              <span className="text-[var(--fh-hero-cmd-pkg)]">forgeloop@latest</span>{' '}
              <span className="text-[var(--fh-hero-cmd-string)]">my-bot</span>
            </span>
            <motion.button
              type="button"
              onClick={copyCommand}
              whileHover={{ scale: 1.05, rotate: -4 }}
              whileTap={{ scale: 0.95, rotate: 0 }}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border sm:h-[2.375rem] sm:w-[2.375rem]"
              aria-label={copied ? 'Copied' : 'Copy install command'}
              style={{
                borderColor: 'var(--fh-hero-copy-border)',
                backgroundColor: 'var(--fh-hero-copy-bg)',
                color: 'var(--fh-muted)',
              }}
            >
              {copied ? (
                <motion.span initial={{ scale: 0.7, opacity: 0.4 }} animate={{ scale: 1, opacity: 1 }}>
                  <Check className="h-4 w-4 text-[var(--fh-hero-cmd-accent)]" strokeWidth={2.25} />
                </motion.span>
              ) : (
                <Copy className="h-4 w-4" strokeWidth={2} />
              )}
            </motion.button>
          </motion.div>
        </motion.div>
      </div>

      {/* Right: Terminal Visual */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
        animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
        transition={{ delay: 0.4, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-lg lg:w-1/2"
      >
        <HomeTerminalFrame title="bash" Icon={Terminal}>
          {/* Terminal: mirrors src/commands/init.ts + modular TS scaffold (src/generators/*) */}
          <div className="p-5 font-mono text-xs leading-relaxed sm:text-sm">
            <div className="text-slate-400">
              <span className="text-emerald-400">~</span> $ npm create forgeloop@latest my-bot
            </div>
            <p className="mt-3 text-slate-500">
              (runs <span className="text-slate-400">create-forgeloop</span> →{' '}
              <span className="text-slate-400">forgeloop init my-bot</span> with your choices)
            </p>

            <pre className="forge-terminal-pre mt-3 whitespace-pre text-slate-500">
{`┌──────────────────────────────────────────────┐
│ ForgeLoop init                               │
└──────────────────────────────────────────────┘
  Scaffolding my-bot in my-bot`}
            </pre>

            <div className="mt-3 text-fuchsia-300/90">Project profile</div>
            <div className="mt-1 space-y-0.5 text-slate-400">
              <div>
                <span className="text-blue-400">•</span> Language{' '}
                <span className="text-slate-500">ts</span>
              </div>
              <div>
                <span className="text-blue-400">•</span> Preset{' '}
                <span className="text-slate-500">modular</span>
              </div>
              <div>
                <span className="text-blue-400">•</span> Package manager{' '}
                <span className="text-slate-500">npm</span>
              </div>
              <div>
                <span className="text-blue-400">•</span> Database{' '}
                <span className="text-slate-500">none</span>
              </div>
              <div>
                <span className="text-blue-400">•</span> Tooling{' '}
                <span className="text-slate-500">eslint-prettier</span>
              </div>
              <div>
                <span className="text-blue-400">•</span> Git{' '}
                <span className="text-slate-500">disabled</span>
              </div>
              <div>
                <span className="text-blue-400">•</span> Docker{' '}
                <span className="text-slate-500">disabled</span>
              </div>
              <div>
                <span className="text-blue-400">•</span> CI{' '}
                <span className="text-slate-500">disabled</span>
              </div>
            </div>

            <div className="mt-3 text-emerald-400">
              ✓ Project ready at my-bot
            </div>

            <div className="mt-3 text-amber-200/90">Next steps</div>
            <div className="mt-1 space-y-0.5 text-slate-500">
              <div>
                <span className="text-slate-600">│</span> cd my-bot
              </div>
              <div>
                <span className="text-slate-600">│</span> npm install
              </div>
              <div>
                <span className="text-slate-600">│</span> Rename .env.example to .env
              </div>
              <div>
                <span className="text-slate-600">│</span> Fill in DISCORD_TOKEN, CLIENT_ID, and GUILD_ID in .env
              </div>
              <div>
                <span className="text-slate-600">│</span> npm run dev
              </div>
            </div>

            <div className="mt-4 border-l-2 border-slate-700 pl-3 text-slate-500">
              <div className="text-slate-400">my-bot/</div>
              <div>├── forgeloop.config.mjs</div>
              <div>├── package.json</div>
              <div>├── .env.example</div>
              <div>└── src/</div>
              <div className="pl-2">├── index.ts</div>
              <div className="pl-2">├── sync-commands.ts</div>
              <div className="pl-2">├── types/commands.ts</div>
              <div className="pl-2">├── config/env.ts</div>
              <div className="pl-2">├── commands/ping.ts</div>
              <div className="pl-2">└── events/clientReady.ts</div>
            </div>

            <div className="mt-4 flex items-center gap-2 text-slate-500">
              <span className="text-emerald-400">~/my-bot</span>
              <motion.span
                animate={{ opacity: [1, 0.25, 1] }}
                transition={{ duration: 1.2, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
              >
                _
              </motion.span>
            </div>
          </div>
        </HomeTerminalFrame>
      </motion.div>
    </section>
  );
}
