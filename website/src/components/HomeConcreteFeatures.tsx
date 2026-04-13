import React from 'react';
import { motion } from 'motion/react';
import { FolderTree, Type, Wrench, Terminal, FileCode2 } from 'lucide-react';
import { HomeHighlightedCode } from './HomeHighlightedCode';
import { HomeTerminalFrame } from './HomeTerminalFrame';

const TYPE_SNIPPET = `// ChatInputCommandInteraction from generated command modules
void interaction.options.getUser('target');
void interaction.memberPermissions?.has('BanMembers');`;

const FADE_UP = {
  hidden: { opacity: 0, y: 30, filter: 'blur(4px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0)',
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const },
  },
};

export function HomeConcreteFeatures() {
  return (
    <section className="relative z-10 mx-auto w-full max-w-6xl px-6 py-24 md:py-32">
      <div className="mb-16 text-center">
        <h2 className="text-3xl font-bold tracking-tight text-fh-heading sm:text-4xl md:text-5xl">
          Everything you need to scale.
        </h2>
        <p className="mt-4 text-lg text-fh-muted">
          We handle the boilerplate so you can build features.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        
        {/* Large Feature: File-based Routing */}
        <motion.div 
          variants={FADE_UP}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="col-span-1 flex flex-col justify-between overflow-hidden rounded-3xl border border-fh-edge bg-fh-surface p-8 shadow-2xl md:col-span-2 lg:col-span-2 relative group"
        >
          <div className="relative z-10">
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400">
              <FolderTree className="h-6 w-6" />
            </div>
            <h3 className="text-2xl font-bold text-fh-heading tracking-tight">File-based routing</h3>
            <p className="mt-4 max-w-md text-lg leading-relaxed text-fh-muted">
              Modular and advanced presets set <code>manifest.paths.commandsDir</code> to <code>src/commands</code> and{' '}
              <code>eventsDir</code> to <code>src/events</code> (<span className="text-fh-faint">createManifest</span> in{' '}
              <code className="text-fh-muted">src/manifest.ts</code>). Starters ship <code>ping</code> +{' '}
              <code>clientReady</code>; <code>forgeloop add</code> appends more modules alongside them.
            </p>
          </div>

          <HomeTerminalFrame title="bash" Icon={Terminal} className="relative z-0 mt-8 min-h-48 w-full">
            <div className="p-5 font-mono text-xs leading-relaxed text-slate-400 sm:text-sm">
              <div className="text-slate-500">Typical modular TypeScript tree after scaffold + one add:</div>
              <div className="mt-2 text-slate-400">src/</div>
              <div>├── index.ts</div>
              <div>├── sync-commands.ts</div>
              <div>├── types/commands.ts</div>
              <div>├── config/env.ts</div>
              <div>├── commands/</div>
              <div>
                │   ├── <span className="text-emerald-400">ping.ts</span>{' '}
                <span className="text-slate-600">← renderInitialHandlerFiles</span>
              </div>
              <div>
                │   └── <span className="text-emerald-400">ban.ts</span>{' '}
                <span className="text-slate-600">← forgeloop add command ban</span>
              </div>
              <div>└── events/</div>
              <div className="pl-2">
                └── <span className="text-emerald-400">clientReady.ts</span>
              </div>
            </div>
            <div className="pointer-events-none absolute -bottom-8 -right-8 h-32 w-32 rounded-full bg-blue-500/20 blur-[50px]" />
          </HomeTerminalFrame>
        </motion.div>

        {/* Medium Feature: Type Safety */}
        <motion.div 
          variants={FADE_UP}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          transition={{ delay: 0.1 }}
          className="col-span-1 flex flex-col justify-between overflow-hidden rounded-3xl border border-fh-edge bg-fh-surface p-8 shadow-2xl relative group"
        >
          <div className="relative z-10">
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400">
              <Type className="h-6 w-6" />
            </div>
            <h3 className="text-2xl font-bold text-fh-heading tracking-tight">Type-safe by default</h3>
            <p className="mt-4 text-lg leading-relaxed text-fh-muted">
              Generated commands use <code className="text-fh-heading">import(&quot;discord.js&quot;).ChatInputCommandInteraction</code> in the{' '}
              <code className="text-fh-heading">execute</code> signature (<span className="text-fh-faint">renderCommandTemplate</span> in{' '}
              <code className="text-fh-muted">src/generators/runtime.ts</code>), matching the <code>discord.js</code> version pinned in the scaffold{' '}
              <code className="text-fh-muted">package.json</code>.
            </p>
          </div>

          <HomeTerminalFrame title="types.ts" Icon={FileCode2} className="relative z-0 mt-8 min-h-[12rem] w-full">
            <div className="relative overflow-hidden p-5">
              <HomeHighlightedCode
                code={TYPE_SNIPPET}
                language="typescript"
                showLineNumbers={false}
                syntaxOnDarkPanel
              />
            </div>
            <div className="pointer-events-none absolute -bottom-8 -right-8 h-32 w-32 rounded-full bg-emerald-500/10 blur-[50px]" />
          </HomeTerminalFrame>
        </motion.div>

        {/* Medium Feature: Built-in Checks */}
        <motion.div 
          variants={FADE_UP}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          transition={{ delay: 0.2 }}
          className="col-span-1 flex flex-col justify-between overflow-hidden rounded-3xl border border-fh-edge bg-fh-surface p-8 shadow-2xl md:col-span-1 lg:col-span-3 relative group"
        >
          <div className="relative z-10 md:w-1/2">
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-400">
              <Wrench className="h-6 w-6" />
            </div>
            <h3 className="text-2xl font-bold text-fh-heading tracking-tight">Built-in Diagnostics</h3>
            <p className="mt-4 text-lg leading-relaxed text-fh-muted">
              <code className="text-fh-heading">forgeloop doctor</code> walks a list of paths derived from your{' '}
              <code className="text-fh-heading">forgeloop.config.mjs</code> manifest — config file, <code>src</code> layout, optional DB/Docker/CI
              files — and prints <span className="text-emerald-500">✓ Found …</span> or <span className="text-red-500">x Missing …</span> (
              <span className="text-fh-faint">src/commands/doctor.ts</span>).
            </p>
          </div>

          <div className="absolute right-0 top-0 hidden h-full w-1/2 items-center justify-end p-8 md:flex">
            <HomeTerminalFrame title="bash" Icon={Terminal} className="w-full max-w-sm">
              <div className="p-5 font-mono text-xs leading-relaxed text-slate-400">
                <div>
                  <span className="text-emerald-400">~/my-bot</span> $ npx forgeloop doctor
                </div>
                <div className="mt-3 space-y-1 text-emerald-400">
                  <div>✓ Found forgeloop.config.mjs</div>
                  <div>✓ Found src/commands</div>
                  <div>✓ Found src/events</div>
                </div>
                <div className="mt-3 text-emerald-400">✓ Project looks healthy.</div>
              </div>
            </HomeTerminalFrame>
          </div>
          
          {/* Subtle glow effect */}
          <div className="absolute -right-32 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full bg-purple-500/10 blur-[80px]" />
        </motion.div>

      </div>
    </section>
  );
}
