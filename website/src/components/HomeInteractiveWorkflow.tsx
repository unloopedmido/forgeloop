import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Terminal, FileCode2, CheckCircle2 } from 'lucide-react';
import { HomeHighlightedCode } from './HomeHighlightedCode';
import { HomeTerminalFrame } from './HomeTerminalFrame';

// Matches src/generators/runtime.ts renderCommandTemplate('ts', 'ban', 'Bans a user from the server.')
const BAN_COMMAND_SOURCE = `import { SlashCommandBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('ban')
  .setDescription('Bans a user from the server.');

export async function execute(interaction: import("discord.js").ChatInputCommandInteraction) {
  await interaction.reply('ban is wired up.');
}
`;

const WORKFLOW_STEPS = [
  {
    id: 'add',
    title: '1. Add a slash command',
    desc:
      'Same behavior as `runAdd` in the CLI: writes `src/commands/<name>.ts` using `renderCommandFile` (modular or advanced presets only; basic keeps commands inline).',
    icon: Terminal,
    content: (
      <div className="font-mono text-xs leading-relaxed text-slate-400 sm:text-sm">
        <div>
          <span className="text-emerald-400">~/my-bot</span> $ npx forgeloop add command ban --description &quot;Bans a user from the server.&quot;
        </div>
        <p className="mt-3 text-xs text-slate-500">
          pnpm / yarn use the local binary:{' '}
          <span className="text-slate-400">pnpm forgeloop add command ban ...</span>
        </p>
        <div className="mt-4 text-emerald-400">
          ✓ Added command &quot;ban&quot; to my-bot/src/commands/ban.ts
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Success line matches <span className="text-slate-400">output.success</span> in{' '}
          <span className="text-slate-400">add.ts</span> (path is absolute when you run it; shown here relative for readability).
        </p>
      </div>
    ),
  },
  {
    id: 'code',
    title: '2. Generated module',
    desc:
      'This is the exact template from renderCommandTemplate — swap the placeholder reply for your ban logic.',
    icon: FileCode2,
    content: (
      <HomeHighlightedCode code={BAN_COMMAND_SOURCE} language="typescript" syntaxOnDarkPanel />
    ),
  },
  {
    id: 'doctor',
    title: '3. Run doctor',
    desc:
      'The `doctor` subcommand reads your manifest and verifies expected paths exist (config, src layout, tooling files). Filesystem checks only — no intent sniffing.',
    icon: CheckCircle2,
    content: (
      <div className="font-mono text-xs leading-relaxed text-slate-400 sm:text-sm">
        <div>
          <span className="text-emerald-400">~/my-bot</span> $ npx forgeloop doctor
        </div>
        <pre className="forge-terminal-pre mt-3 whitespace-pre text-slate-500">
{`┌──────────────────────────────────────────────┐
│ ForgeLoop doctor                             │
└──────────────────────────────────────────────┘
  Inspecting .../my-bot`}
        </pre>
        <div className="mt-3 space-y-1 text-emerald-400">
          <div>✓ Found forgeloop.config.mjs</div>
          <div>✓ Found src</div>
          <div>✓ Found src/config</div>
          <div>✓ Found src/commands</div>
          <div>✓ Found src/events</div>
          <div>✓ Found eslint.config.js</div>
          <div>✓ Found .prettierrc.json</div>
        </div>
        <div className="mt-3 text-emerald-400">✓ Project looks healthy.</div>
        <p className="mt-3 text-xs text-slate-500">
          Run from elsewhere with <span className="text-slate-400">npx forgeloop doctor --dir ./my-bot</span> (optional{' '}
          <span className="text-slate-400">--dir</span> flag; default is the current working directory).
        </p>
      </div>
    ),
  },
];

export function HomeInteractiveWorkflow() {
  const [activeStep, setActiveStep] = useState(WORKFLOW_STEPS[0]);

  return (
    <section className="relative z-10 mx-auto w-full max-w-6xl px-6 py-24 md:py-32">
      <div className="mb-16 text-center">
        <h2 className="text-3xl font-bold tracking-tight text-fh-heading sm:text-4xl md:text-5xl">
          The developer experience you deserve.
        </h2>
        <p className="mt-4 text-lg text-fh-muted">
          Add handlers with the CLI, edit the generated modules, then run <code className="text-fh-heading">doctor</code> to
          catch missing scaffold files.
        </p>
      </div>

      <div className="flex flex-col gap-12 lg:flex-row lg:items-center lg:gap-16">
        <div className="flex flex-col gap-4 lg:w-1/3">
          {WORKFLOW_STEPS.map((step) => {
            const Icon = step.icon;
            const isActive = activeStep.id === step.id;
            return (
              <motion.button
                key={step.id}
                type="button"
                onClick={() => setActiveStep(step)}
                whileHover={{ y: -1, scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className={`flex flex-col items-start gap-2 rounded-2xl border p-6 text-left ${
                  isActive
                    ? 'border-blue-500/30 bg-blue-500/10 shadow-[0_0_30px_rgba(59,130,246,0.1)]'
                    : 'border-fh-edge2 bg-fh-panel hover:bg-fh-install'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full ${
                      isActive ? 'bg-blue-500/20 text-blue-400' : 'bg-fh-install text-fh-muted'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className={`text-lg font-bold ${isActive ? 'text-fh-heading' : 'text-fh-subtle'}`}>{step.title}</h3>
                </div>
                <p className={`mt-2 text-sm ${isActive ? 'text-blue-500' : 'text-fh-muted'}`}>{step.desc}</p>
              </motion.button>
            );
          })}
        </div>

        <div className="lg:w-2/3">
          <HomeTerminalFrame
            className="relative flex h-[400px] flex-col"
            title={activeStep.id === 'code' ? 'src/commands/ban.ts' : 'bash'}
            Icon={activeStep.id === 'code' ? FileCode2 : Terminal}
          >
            <div className="relative min-h-0 flex-1 overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeStep.id}
                  initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: -10, filter: 'blur(4px)' }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute inset-0 overflow-y-auto p-5"
                >
                  {activeStep.content}
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="pointer-events-none absolute -bottom-32 -right-32 h-64 w-64 rounded-full bg-blue-500/10 blur-[80px]" />
          </HomeTerminalFrame>
        </div>
      </div>
    </section>
  );
}
