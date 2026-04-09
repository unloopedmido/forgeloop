import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldAlert, Zap, FileCode2 } from 'lucide-react';
import { HomeTerminalFrame } from './HomeTerminalFrame';
import { HomeHighlightedCode } from './HomeHighlightedCode';

const RAW_CODE = `// The Monolith (Raw Discord.js)
import { Client, GatewayIntentBits } from 'discord.js';

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  // The dreaded nested if/else statements
  if (interaction.commandName === 'ping') {
    await interaction.reply('Pong!');
  } else if (interaction.commandName === 'ban') {
    if (!interaction.memberPermissions.has('BanMembers')) {
      await interaction.reply({ content: 'No permissions', ephemeral: true });
      return;
    }
    // ... 50 more lines of logic
  } else if (interaction.commandName === 'kick') {
    // ...
  }
  // Imagine 50 commands in this one file...
});

client.login('TOKEN');`;

// Matches src/generators/runtime.ts renderCommandTemplate (TypeScript)
const FORGELOOP_CODE = `// src/commands/ban.ts (from: npx forgeloop add command ban --description "...")
import { SlashCommandBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('ban')
  .setDescription('Bans a user from the server.');

export async function execute(interaction: import("discord.js").ChatInputCommandInteraction) {
  await interaction.reply('ban is wired up.');
}`;

export function HomeProblemSolution() {
  const [activeTab, setActiveTab] = useState<'raw' | 'forgeloop'>('forgeloop');
  const rawLines = useMemo(() => RAW_CODE.split('\n'), []);

  return (
    <section className="relative z-10 mx-auto w-full max-w-6xl px-6 py-24 md:py-32">
      <div className="flex flex-col items-center text-center">
        <h2 className="text-3xl font-bold tracking-tight text-fh-heading sm:text-4xl md:text-5xl">
          Stop writing monolithic bots.
        </h2>
        <p className="mt-4 max-w-2xl text-lg text-fh-muted">
          Raw Discord.js is powerful but lacks opinions. As your bot grows, an <code>index.js</code> file with dozens of commands and nested if-statements becomes impossible to maintain.
        </p>
      </div>

      <div className="mt-16 mx-auto max-w-5xl">
        <div className="flex items-center justify-center gap-4 mb-8">
          <button
            onClick={() => setActiveTab('raw')}
            className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-all duration-300 ${
              activeTab === 'raw'
                ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                : 'bg-fh-panel text-fh-muted border border-fh-edge2 hover:bg-fh-install hover:text-fh-heading'
            }`}
          >
            <ShieldAlert className="h-4 w-4" />
            Raw Discord.js
          </button>
          <button
            onClick={() => setActiveTab('forgeloop')}
            className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-all duration-300 ${
              activeTab === 'forgeloop'
                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.15)]'
                : 'bg-fh-panel text-fh-muted border border-fh-edge2 hover:bg-fh-install hover:text-fh-heading'
            }`}
          >
            <Zap className="h-4 w-4" />
            ForgeLoop
          </button>
        </div>

        <HomeTerminalFrame
          title={activeTab === 'raw' ? 'index.js' : 'src/commands/ban.ts'}
          Icon={FileCode2}
        >
          <div className="relative p-5 text-sm font-mono md:text-base">
            <AnimatePresence mode="wait">
              {activeTab === 'raw' && (
                <motion.div
                  key="raw"
                  initial={{ opacity: 0, filter: 'blur(4px)' }}
                  animate={{ opacity: 1, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, filter: 'blur(4px)' }}
                  transition={{ duration: 0.3 }}
                >
                  <HomeHighlightedCode
                    code={RAW_CODE}
                    language="javascript"
                    syntaxOnDarkPanel
                    getLineClassName={(i) =>
                      rawLines[i]?.includes('if/else')
                        ? 'rounded-sm bg-red-500/10 ring-1 ring-red-500/25'
                        : undefined
                    }
                  />
                </motion.div>
              )}
              {activeTab === 'forgeloop' && (
                <motion.div
                  key="forgeloop"
                  initial={{ opacity: 0, filter: 'blur(4px)' }}
                  animate={{ opacity: 1, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, filter: 'blur(4px)' }}
                  transition={{ duration: 0.3 }}
                >
                  <HomeHighlightedCode
                    code={FORGELOOP_CODE}
                    language="typescript"
                    syntaxOnDarkPanel
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </HomeTerminalFrame>
      </div>
    </section>
  );
}
