import { resolveProjectLogging } from '../manifest.js';
import type {
	ForgeLoopManifest,
	InteractionTemplateSpec,
	Language,
} from '../types.js';
import type { FileSpec } from '../utils/fs.js';
import { fileExtension } from './shared.js';

function jsImportPath(importPath: string) {
	return `${importPath}.js`;
}

function typeCommandSupport(language: Language) {
	if (language !== 'ts') {
		return null;
	}

	return `import type {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  Collection,
  ContextMenuCommandBuilder,
  MessageContextMenuCommandInteraction,
  SlashCommandBuilder,
  UserContextMenuCommandInteraction,
} from 'discord.js';

export type AnyExecutableCommandInteraction =
  | ChatInputCommandInteraction
  | UserContextMenuCommandInteraction
  | MessageContextMenuCommandInteraction;

export interface CommandModule {
  data: SlashCommandBuilder | ContextMenuCommandBuilder;
  execute: (
    interaction: AnyExecutableCommandInteraction,
  ) => Promise<void> | void;
  /** Optional: slash commands with \`.setAutocomplete(true)\` options. */
  autocomplete?: (
    interaction: AutocompleteInteraction,
  ) => Promise<void> | void;
}

export type BotClient = import('discord.js').Client & {
  commands: Collection<string, CommandModule>;
};
`;
}

function interactionRouterSharedLogic(sourceExtension: string): string {
	return `import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { handleInteractionError } from '../lib/interaction-errors.js';

// Optional short-lived interaction state: ../lib/interaction-sessions (single process; use Redis for multi-shard).
//
// Per kind: exact customId -> flex routes (RegExp / parseCustomId / matchCustomId)
// sorted by interactionRoutePriority (higher first), then file load order.

function resolveComponentRoute(kindState, customId) {
  const { exact, flexRoutes } = kindState;
  const direct = exact.get(customId);
  if (direct) {
    return { handler: direct, args: [] };
  }

  for (const route of flexRoutes) {
    const hit = route.tryResolve(customId);
    if (hit) {
      return { handler: hit.execute, args: hit.args };
    }
  }

  return null;
}

async function loadInteractionKind(interactionsDir, subdir, ext) {
  const exact = new Map();
  const flexRoutes = [];
  let flexSequence = 0;
  const dir = path.join(interactionsDir, subdir);
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return { exact, flexRoutes };
  }

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(ext)) {
      continue;
    }

    const modulePath = pathToFileURL(path.join(dir, entry.name)).href;
    const mod = await import(modulePath);
    if (typeof mod.execute !== 'function') {
      continue;
    }

    const hasId = typeof mod.customId === 'string' && mod.customId.length > 0;
    const hasRe = mod.customIdRegExp instanceof RegExp;
    const hasParse = typeof mod.parseCustomId === 'function';
    const hasMatch = typeof mod.matchCustomId === 'function';

    if (hasParse && hasMatch) {
      throw new Error(
        \`\${subdir}/\${entry.name}: export parseCustomId or matchCustomId, not both.\`,
      );
    }

    const strategyCount =
      (hasId ? 1 : 0) +
      (hasRe ? 1 : 0) +
      (hasParse ? 1 : 0) +
      (hasMatch ? 1 : 0);

    if (strategyCount !== 1) {
      throw new Error(
        \`\${subdir}/\${entry.name}: export exactly one of customId, customIdRegExp, parseCustomId, or matchCustomId (plus execute).\`,
      );
    }

    if (hasId) {
      exact.set(mod.customId, mod.execute);
      continue;
    }

    const priority = Number(mod.interactionRoutePriority) || 0;
    const order = flexSequence++;

    if (hasRe) {
      flexRoutes.push({
        priority,
        order,
        tryResolve(customId) {
          const m = mod.customIdRegExp.exec(customId);
          if (!m || m[0] !== customId) {
            return null;
          }
          return { execute: mod.execute, args: [m] };
        },
      });
      continue;
    }

    if (hasParse) {
      flexRoutes.push({
        priority,
        order,
        tryResolve(customId) {
          const parsed = mod.parseCustomId(customId);
          if (parsed == null) {
            return null;
          }
          return { execute: mod.execute, args: [parsed] };
        },
      });
      continue;
    }

    flexRoutes.push({
      priority,
      order,
      tryResolve(customId) {
        if (!mod.matchCustomId(customId)) {
          return null;
        }
        return { execute: mod.execute, args: [] };
      },
    });
  }

  flexRoutes.sort((a, b) => {
    if (b.priority !== a.priority) {
      return b.priority - a.priority;
    }
    return a.order - b.order;
  });

  return { exact, flexRoutes };
}

export async function registerInteractionHandlers(client) {
  const interactionsDir = path.dirname(fileURLToPath(import.meta.url));
  const ext = '.${sourceExtension}';
  const modal = await loadInteractionKind(interactionsDir, 'modals', ext);
  const button = await loadInteractionKind(interactionsDir, 'buttons', ext);
  const stringSelect = await loadInteractionKind(
    interactionsDir,
    'selectMenus',
    ext,
  );

  client.on('interactionCreate', async (interaction) => {
    try {
      if (interaction.isAutocomplete()) {
        const command = client.commands.get(interaction.commandName);
        if (command?.autocomplete) {
          await command.autocomplete(interaction);
        } else {
          await interaction.respond([]);
        }
        return;
      }

      if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) {
          await interaction.reply({
            content: 'This command is not registered in the runtime.',
            ephemeral: true,
          });
          return;
        }

        await command.execute(interaction);
        return;
      }

      if (
        interaction.isUserContextMenuCommand() ||
        interaction.isMessageContextMenuCommand()
      ) {
        const command = client.commands.get(interaction.commandName);
        if (!command) {
          await interaction.reply({
            content: 'This command is not registered in the runtime.',
            ephemeral: true,
          });
          return;
        }

        await command.execute(interaction);
        return;
      }

      if (interaction.isModalSubmit()) {
        const resolved = resolveComponentRoute(modal, interaction.customId);
        if (resolved) {
          await resolved.handler(interaction, ...resolved.args);
        }
        return;
      }

      if (interaction.isButton()) {
        const resolved = resolveComponentRoute(button, interaction.customId);
        if (resolved) {
          await resolved.handler(interaction, ...resolved.args);
        }
        return;
      }

      if (interaction.isStringSelectMenu()) {
        const resolved = resolveComponentRoute(stringSelect, interaction.customId);
        if (resolved) {
          await resolved.handler(interaction, ...resolved.args);
        }
      }
    } catch (error) {
      await handleInteractionError(interaction, error);
    }
  });
}
`;
}

function interactionRouterModuleContent(
	sourceExtension: string,
	ts: boolean,
): string {
	if (!ts) {
		return interactionRouterSharedLogic(sourceExtension);
	}

	return `import type { BotClient } from '../types/commands.js';
${interactionRouterSharedLogic(sourceExtension).replace(
		'export async function registerInteractionHandlers(client) {',
		'export async function registerInteractionHandlers(client: BotClient) {',
	)}`;
}

function interactionModuleTypesContent(): string {
	return `import type {
  ButtonInteraction,
  ModalSubmitInteraction,
  StringSelectMenuInteraction,
} from 'discord.js';

/** Optional: higher values run before other flex routes (same kind). */
export type InteractionRoutePriority = {
  interactionRoutePriority?: number;
};

/** Full customId string match (static components). */
export type ExactModalModule = InteractionRoutePriority & {
  customId: string;
  customIdRegExp?: undefined;
  parseCustomId?: undefined;
  matchCustomId?: undefined;
  execute: (interaction: ModalSubmitInteraction) => Promise<void> | void;
};

/** Entire customId must match; \`execute\` receives \`RegExp.prototype.exec\` result. */
export type RegexpModalModule = InteractionRoutePriority & {
  customId?: undefined;
  customIdRegExp: RegExp;
  parseCustomId?: undefined;
  matchCustomId?: undefined;
  execute: (
    interaction: ModalSubmitInteraction,
    match: RegExpExecArray,
  ) => Promise<void> | void;
};

/** Return non-null from \`parseCustomId\` to route; value is passed to \`execute\`. */
export type ParseModalModule<TParsed = unknown> = InteractionRoutePriority & {
  customId?: undefined;
  customIdRegExp?: undefined;
  matchCustomId?: undefined;
  parseCustomId: (customId: string) => TParsed | null;
  execute: (
    interaction: ModalSubmitInteraction,
    parsed: TParsed,
  ) => Promise<void> | void;
};

/** Boolean match — use \`interaction.customId\` inside \`execute\` for parsing. */
export type MatchModalModule = InteractionRoutePriority & {
  customId?: undefined;
  customIdRegExp?: undefined;
  parseCustomId?: undefined;
  matchCustomId: (customId: string) => boolean;
  execute: (interaction: ModalSubmitInteraction) => Promise<void> | void;
};

export type ModalInteractionModule =
  | ExactModalModule
  | RegexpModalModule
  | ParseModalModule
  | MatchModalModule;

export type ExactButtonModule = InteractionRoutePriority & {
  customId: string;
  customIdRegExp?: undefined;
  parseCustomId?: undefined;
  matchCustomId?: undefined;
  execute: (interaction: ButtonInteraction) => Promise<void> | void;
};

export type RegexpButtonModule = InteractionRoutePriority & {
  customId?: undefined;
  customIdRegExp: RegExp;
  parseCustomId?: undefined;
  matchCustomId?: undefined;
  execute: (
    interaction: ButtonInteraction,
    match: RegExpExecArray,
  ) => Promise<void> | void;
};

export type ParseButtonModule<TParsed = unknown> = InteractionRoutePriority & {
  customId?: undefined;
  customIdRegExp?: undefined;
  matchCustomId?: undefined;
  parseCustomId: (customId: string) => TParsed | null;
  execute: (
    interaction: ButtonInteraction,
    parsed: TParsed,
  ) => Promise<void> | void;
};

export type MatchButtonModule = InteractionRoutePriority & {
  customId?: undefined;
  customIdRegExp?: undefined;
  parseCustomId?: undefined;
  matchCustomId: (customId: string) => boolean;
  execute: (interaction: ButtonInteraction) => Promise<void> | void;
};

export type ButtonInteractionModule =
  | ExactButtonModule
  | RegexpButtonModule
  | ParseButtonModule
  | MatchButtonModule;

export type ExactStringSelectModule = InteractionRoutePriority & {
  customId: string;
  customIdRegExp?: undefined;
  parseCustomId?: undefined;
  matchCustomId?: undefined;
  execute: (interaction: StringSelectMenuInteraction) => Promise<void> | void;
};

export type RegexpStringSelectModule = InteractionRoutePriority & {
  customId?: undefined;
  customIdRegExp: RegExp;
  parseCustomId?: undefined;
  matchCustomId?: undefined;
  execute: (
    interaction: StringSelectMenuInteraction,
    match: RegExpExecArray,
  ) => Promise<void> | void;
};

export type ParseStringSelectModule<TParsed = unknown> =
  InteractionRoutePriority & {
    customId?: undefined;
    customIdRegExp?: undefined;
    matchCustomId?: undefined;
    parseCustomId: (customId: string) => TParsed | null;
    execute: (
      interaction: StringSelectMenuInteraction,
      parsed: TParsed,
    ) => Promise<void> | void;
  };

export type MatchStringSelectModule = InteractionRoutePriority & {
  customId?: undefined;
  customIdRegExp?: undefined;
  parseCustomId?: undefined;
  matchCustomId: (customId: string) => boolean;
  execute: (interaction: StringSelectMenuInteraction) => Promise<void> | void;
};

export type StringSelectInteractionModule =
  | ExactStringSelectModule
  | RegexpStringSelectModule
  | ParseStringSelectModule
  | MatchStringSelectModule;
`;
}

function interactionSessionsModuleContent(language: Language): string {
	const typed = language === 'ts';
	if (typed) {
		return `/**
 * Ephemeral in-memory sessions for tokens embedded in component customIds (confirm flows, large payloads).
 *
 * Single Node process only — not shared across shards or replicas. For production multi-shard bots,
 * use Redis or another shared store instead of this module.
 */

import { randomUUID } from 'node:crypto';

type Entry = { payload: unknown; expiresAt: number };

const sessions = new Map<string, Entry>();

function purgeExpired() {
  const now = Date.now();
  for (const [key, entry] of sessions) {
    if (entry.expiresAt <= now) {
      sessions.delete(key);
    }
  }
}

/** Returns a token to embed in a customId (e.g. pair with a RegExp or \`parseCustomId\` handler). */
export function createInteractionSession(
  payload: unknown,
  ttlMs: number,
): string {
  purgeExpired();
  const token = randomUUID();
  sessions.set(token, { payload, expiresAt: Date.now() + ttlMs });
  return token;
}

/** Read without consuming (still enforces expiry). */
export function peekInteractionSession(token: string): unknown | null {
  purgeExpired();
  const entry = sessions.get(token);
  if (!entry) {
    return null;
  }
  if (entry.expiresAt <= Date.now()) {
    sessions.delete(token);
    return null;
  }
  return entry.payload;
}

/** Read once; removes the session. */
export function consumeInteractionSession(token: string): unknown | null {
  const entry = sessions.get(token);
  if (!entry) {
    return null;
  }
  sessions.delete(token);
  if (entry.expiresAt <= Date.now()) {
    return null;
  }
  return entry.payload;
}
`;
	}

	return `/**
 * Ephemeral in-memory sessions for tokens embedded in component customIds (confirm flows, large payloads).
 *
 * Single Node process only — not shared across shards or replicas. For production multi-shard bots,
 * use Redis or another shared store instead of this module.
 */

import { randomUUID } from 'node:crypto';

const sessions = new Map();

function purgeExpired() {
  const now = Date.now();
  for (const [key, entry] of sessions) {
    if (entry.expiresAt <= now) {
      sessions.delete(key);
    }
  }
}

export function createInteractionSession(payload, ttlMs) {
  purgeExpired();
  const token = randomUUID();
  sessions.set(token, { payload, expiresAt: Date.now() + ttlMs });
  return token;
}

export function peekInteractionSession(token) {
  purgeExpired();
  const entry = sessions.get(token);
  if (!entry) {
    return null;
  }
  if (entry.expiresAt <= Date.now()) {
    sessions.delete(token);
    return null;
  }
  return entry.payload;
}

export function consumeInteractionSession(token) {
  const entry = sessions.get(token);
  if (!entry) {
    return null;
  }
  sessions.delete(token);
  if (entry.expiresAt <= Date.now()) {
    return null;
  }
  return entry.payload;
}
`;
}

function exampleRegexButtonContent(language: Language): string {
	if (language === 'ts') {
		return `import type { ButtonInteraction } from 'discord.js';

/**
 * RegExp routing: the entire customId must match \`customIdRegExp\` (see router).
 * Prefer \`^ … $\` so only the full string matches. \`execute\` receives \`RegExp.prototype.exec\` result.
 */
export const interactionRoutePriority = 0;

export const customIdRegExp = /^demo:regex:(\\d+)$/u;

export async function execute(interaction: ButtonInteraction, match: RegExpExecArray) {
  await interaction.reply({
    content: 'Regex example — group 1: ' + match[1],
    ephemeral: true,
  });
}
`;
	}

	return `/**
 * RegExp routing — full customId must match; execute receives exec() result.
 */
export const interactionRoutePriority = 0;

export const customIdRegExp = /^demo:regex:(\\d+)$/u;

export async function execute(interaction, match) {
  await interaction.reply({
    content: 'Regex example — group 1: ' + match[1],
    ephemeral: true,
  });
}
`;
}

function exampleParseButtonContent(language: Language): string {
	if (language === 'ts') {
		return `import type { ButtonInteraction } from 'discord.js';

const PARSE_PREFIX = 'demo:parse:';

export type DemoParsePayload = { slug: string };

/**
 * Parser routing: return non-null from \`parseCustomId\` to handle this interaction.
 * The parsed value is passed as the second argument to \`execute\`.
 */
export const interactionRoutePriority = 0;

export function parseCustomId(id: string): DemoParsePayload | null {
  if (!id.startsWith(PARSE_PREFIX)) {
    return null;
  }
  const slug = id.slice(PARSE_PREFIX.length);
  if (!slug) {
    return null;
  }
  return { slug };
}

export async function execute(
  interaction: ButtonInteraction,
  parsed: DemoParsePayload,
) {
  await interaction.reply({
    content: 'Parse example — slug: ' + parsed.slug,
    ephemeral: true,
  });
}
`;
	}

	return `const PARSE_PREFIX = 'demo:parse:';

export const interactionRoutePriority = 0;

export function parseCustomId(id) {
  if (!id.startsWith(PARSE_PREFIX)) {
    return null;
  }
  const slug = id.slice(PARSE_PREFIX.length);
  if (!slug) {
    return null;
  }
  return { slug };
}

export async function execute(interaction, parsed) {
  await interaction.reply({
    content: 'Parse example — slug: ' + parsed.slug,
    ephemeral: true,
  });
}
`;
}

export function renderInteractionSupportFiles(
	manifest: ForgeLoopManifest,
): FileSpec[] {
	if (!hasHandlers(manifest)) {
		return [];
	}

	const extension = fileExtension(manifest.language);
	const interactionsRoot = manifest.paths.interactionsDir ?? 'src/interactions';
	const files: FileSpec[] = [
		{
			path: `${interactionsRoot}/router.${extension}`,
			content: interactionRouterModuleContent(extension, manifest.language === 'ts'),
		},
		{
			path: `src/lib/interaction-sessions.${extension}`,
			content: interactionSessionsModuleContent(manifest.language),
		},
		{
			path: `${interactionsRoot}/buttons/example-regex.${extension}`,
			content: exampleRegexButtonContent(manifest.language),
		},
		{
			path: `${interactionsRoot}/buttons/example-parse.${extension}`,
			content: exampleParseButtonContent(manifest.language),
		},
	];

	if (manifest.language === 'ts') {
		files.push({
			path: 'src/types/interactions.ts',
			content: interactionModuleTypesContent(),
		});
	}

	return files;
}

function commandLoaderFunction(
	sourceExtension: string,
	directoryExpression: string,
) {
	return `async function loadCommands() {
  const commandsDir = ${directoryExpression};
  const entries = await readdir(commandsDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.${sourceExtension}')) {
      continue;
    }

    const modulePath = pathToFileURL(path.join(commandsDir, entry.name)).href;
    const commandModule = await import(modulePath);
    client.commands.set(commandModule.data.name, commandModule);
  }
}`;
}

function eventLoaderFunction(
	sourceExtension: string,
	directoryExpression: string,
	ts: boolean,
) {
	return `async function loadEvents() {
  const eventsDir = ${directoryExpression};
  const entries = await readdir(eventsDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.${sourceExtension}')) {
      continue;
    }

    const modulePath = pathToFileURL(path.join(eventsDir, entry.name)).href;
    const eventModule${ts ? ': LoadedEvent' : ''} = await import(modulePath);
    const handler = (...args${ts ? ': unknown[]' : ''}) => eventModule.execute(...args);
    if (eventModule.once) {
      client.once(eventModule.name, handler);
    } else {
      client.on(eventModule.name, handler);
    }
  }
}`;
}

function loaderModuleContent(
	sourceExtension: string,
	directorySuffix: string,
	logStatement: string,
	tsImportLine: string,
	tsParameter: string,
	tsHandlerSuffix: string,
) {
	return `import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { logScope } from '../../lib/logger.js';
${tsImportLine}

export async function ${directorySuffix === 'commands' ? 'loadCommands' : 'loadEvents'}(client${tsParameter}, runtimeDir${tsParameter ? ': string' : ''}) {
  const ${directorySuffix}Dir = path.join(runtimeDir, '..', '..', '${directorySuffix}');
  const entries = await readdir(${directorySuffix}Dir, { withFileTypes: true });
${directorySuffix === 'events' ? '  let loadedEvents = 0;\n' : ''}
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.${sourceExtension}')) {
      continue;
    }

    const modulePath = pathToFileURL(path.join(${directorySuffix}Dir, entry.name)).href;
    const ${directorySuffix === 'commands' ? 'commandModule' : 'eventModule'} = await import(modulePath);
${directorySuffix === 'commands'
		? '    client.commands.set(commandModule.data.name, commandModule);'
		: `    const handler = (...args${tsHandlerSuffix}) => eventModule.execute(...args);
    if (eventModule.once) {
      client.once(eventModule.name, handler);
    } else {
      client.on(eventModule.name, handler);
    }
    loadedEvents += 1;`}
  }

  ${logStatement}
}
`;
}

function basicBootstrap(manifest: ForgeLoopManifest) {
	const databaseImport = manifest.features.database
		? `import { connectDatabase } from '${jsImportPath('./lib/database')}';\n`
		: '';
	const databaseInit = manifest.features.database
		? '\nawait connectDatabase();'
		: '';
	return `import { Client, GatewayIntentBits, SlashCommandBuilder } from 'discord.js';
import { config } from 'dotenv';
import { assertRequiredEnv } from '${jsImportPath('./config/env')}';
${databaseImport}

config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

const pingCommand = new SlashCommandBuilder()
  .setName('ping')
  .setDescription('Check whether the bot is responding.');

client.once('clientReady', () => {
  console.log(\`Logged in as \${client.user?.tag ?? 'unknown user'}\`);
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) {
    return;
  }

  if (interaction.commandName === pingCommand.name) {
    await interaction.reply('ping is wired up.');
  }
});

${databaseInit}
await client.login(assertRequiredEnv('DISCORD_TOKEN'));
`;
}

function modularBootstrap(manifest: ForgeLoopManifest) {
	const sourceExtension = fileExtension(manifest.language);
	const ts = manifest.language === 'ts';
	const typeImports = ts ? ', type ClientEvents' : '';
	const databaseImport = manifest.features.database
		? `import { connectDatabase } from '${jsImportPath('./lib/database')}';\n`
		: '';
	const databaseInit = manifest.features.database
		? '\nawait connectDatabase();'
		: '';
	const eventTypeAlias = ts
		? `
type CommandModule = import('./types/commands.js').CommandModule;
type LoadedEvent = {
  name: keyof ClientEvents;
  once?: boolean;
  execute: (...args: unknown[]) => Promise<void> | void;
};
`
		: '';

	return `import { Client, Collection, GatewayIntentBits${typeImports} } from 'discord.js';
import { config } from 'dotenv';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { assertRequiredEnv } from '${jsImportPath('./config/env')}';
${databaseImport}import { syncCommands } from '${jsImportPath('./sync-commands')}';
import { registerInteractionHandlers } from '${jsImportPath('./interactions/router')}';
${ts ? "import type { BotClient } from './types/commands.js';" : ''}

config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

${eventTypeAlias}
const client${ts ? ': BotClient' : ''} = new Client({
  intents: [GatewayIntentBits.Guilds],
})${ts ? ' as BotClient' : ''};

client.commands = new Collection${ts ? '<string, CommandModule>' : ''}();

${commandLoaderFunction(sourceExtension, "path.join(__dirname, 'commands')")}

${eventLoaderFunction(sourceExtension, "path.join(__dirname, 'events')", ts)}

await loadCommands();
await syncCommands(client);
await loadEvents();
await registerInteractionHandlers(client);
${databaseInit}
await client.login(assertRequiredEnv('DISCORD_TOKEN'));
`;
}

function advancedIndex() {
	return `import { startBot } from './core/runtime/start-bot.js';

await startBot();
`;
}

function syncCommandsTemplate(
	ts: boolean,
	typeImportPath: string,
	envImportPath: string,
	loggerImport: string,
	logGlobal: string,
	logGuild: string,
) {
	return `import { REST, Routes } from 'discord.js';
${ts ? `import type { BotClient } from '${typeImportPath}';\n` : ''}${loggerImport}import { assertRequiredEnv } from '${envImportPath}';

export async function syncCommands(client${ts ? ': BotClient' : ''}) {
  const commandPayload = [...client.commands.values()].map((command) => command.data.toJSON());
  const token = assertRequiredEnv('DISCORD_TOKEN');
  const clientId = assertRequiredEnv('CLIENT_ID');
  const rest = new REST({ version: '10' }).setToken(token);

  if (process.env.NODE_ENV === 'production') {
    await rest.put(Routes.applicationCommands(clientId), {
      body: commandPayload,
    });
    ${logGlobal}
    return;
  }

  const guildId = assertRequiredEnv('GUILD_ID');
  await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
    body: commandPayload,
  });
  ${logGuild}
}
`;
}

function modularSyncCommands(manifest: ForgeLoopManifest) {
	const ts = manifest.language === 'ts';
	return syncCommandsTemplate(
		ts,
		'./types/commands.js',
		'./config/env.js',
		"import { logScope } from './lib/logger.js';\n",
		"logScope('commands', `Synced ${commandPayload.length} commands globally`);",
		"logScope('commands', `Synced ${commandPayload.length} commands to guild ${guildId}`);",
	);
}

function libLoggerModuleContent(manifest: ForgeLoopManifest): string {
	const ts = manifest.language === 'ts';
	const mode = resolveProjectLogging(manifest);

	if (mode === 'json') {
		if (ts) {
			return `export function logScope(scope: string, message: string): void {
  console.log(
    JSON.stringify({ level: 'info', scope, message, t: Date.now() }),
  );
}

export function logError(scope: string, error: unknown): void {
  const err =
    error instanceof Error
      ? { name: error.name, message: error.message, stack: error.stack }
      : { value: String(error) };
  console.error(
    JSON.stringify({ level: 'error', scope, error: err, t: Date.now() }),
  );
}
`;
		}

		return `export function logScope(scope, message) {
  console.log(
    JSON.stringify({ level: 'info', scope, message, t: Date.now() }),
  );
}

export function logError(scope, error) {
  const err =
    error instanceof Error
      ? { name: error.name, message: error.message, stack: error.stack }
      : { value: String(error) };
  console.error(
    JSON.stringify({ level: 'error', scope, error: err, t: Date.now() }),
  );
}
`;
	}

	if (ts) {
		return `export function logScope(scope: string, message: string): void {
  console.log(\`[\${scope}] \${message}\`);
}

export function logError(scope: string, error: unknown): void {
  const text =
    error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(\`[\${scope}]\`, text);
}
`;
	}

	return `export function logScope(scope, message) {
  console.log(\`[\${scope}] \${message}\`);
}

export function logError(scope, error) {
  const text =
    error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(\`[\${scope}]\`, text);
}
`;
}

function interactionErrorsModuleContent(ts: boolean): string {
	if (ts) {
		return `import type { Interaction } from 'discord.js';
import { logError } from './logger.js';

export async function handleInteractionError(
  interaction: Interaction,
  error: unknown,
): Promise<void> {
  logError('interactions', error);
  try {
    if (interaction.isAutocomplete()) {
      await interaction.respond([]);
      return;
    }
    if (interaction.isRepliable()) {
      const payload = { content: 'Something went wrong.', ephemeral: true };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(payload).catch(() => {});
      } else {
        await interaction.reply(payload).catch(() => {});
      }
    }
  } catch {
    // Secondary failures are intentionally ignored.
  }
}
`;
	}

	return `import { logError } from './logger.js';

export async function handleInteractionError(interaction, error) {
  logError('interactions', error);
  try {
    if (interaction.isAutocomplete()) {
      await interaction.respond([]);
      return;
    }
    if (interaction.isRepliable()) {
      const payload = { content: 'Something went wrong.', ephemeral: true };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(payload).catch(() => {});
      } else {
        await interaction.reply(payload).catch(() => {});
      }
    }
  } catch {
    // Secondary failures are intentionally ignored.
  }
}
`;
}

export function hasHandlers(manifest: ForgeLoopManifest) {
	return Boolean(manifest.paths.commandsDir && manifest.paths.eventsDir);
}

export function renderHandlerSupportFiles(
	manifest: ForgeLoopManifest,
): FileSpec[] {
	if (!hasHandlers(manifest)) {
		return [];
	}

	const ext = fileExtension(manifest.language);
	return [
		{
			path: `src/lib/logger.${ext}`,
			content: libLoggerModuleContent(manifest),
		},
		{
			path: `src/lib/interaction-errors.${ext}`,
			content: interactionErrorsModuleContent(manifest.language === 'ts'),
		},
	];
}

export function isClientReadyEvent(eventName: string) {
	return eventName === 'clientReady';
}

export type CommandTemplateOptions = {
	subcommands?: boolean;
	autocomplete?: boolean;
};

export function renderCommandTemplate(
	language: Language,
	commandName: string,
	description?: string,
	options?: CommandTemplateOptions,
) {
	const resolvedDescription =
		description && description.trim().length > 0
			? description.trim()
			: 'No description provided yet.';
	const esc = resolvedDescription.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
	const sub = Boolean(options?.subcommands);
	const auto = Boolean(options?.autocomplete);
	const ts = language === 'ts';
	const chatTy = ts ? ': import("discord.js").ChatInputCommandInteraction' : '';
	const autoTy = ts ? ': import("discord.js").AutocompleteInteraction' : '';

	if (sub && auto) {
		return `import { SlashCommandBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('${commandName}')
  .setDescription('${esc}')
  .addSubcommandGroup((group) =>
    group
      .setName('demo')
      .setDescription('Example subcommand group')
      .addSubcommand((sub) =>
        sub
          .setName('find')
          .setDescription('Sample subcommand with autocomplete')
          .addStringOption((opt) =>
            opt
              .setName('query')
              .setDescription('Type to search')
              .setRequired(true)
              .setAutocomplete(true),
          ),
      ),
  );

export async function autocomplete(interaction${autoTy}) {
  const focused = interaction.options.getFocused(true);
  if (focused.name === 'query') {
    await interaction.respond([{ name: 'Example choice', value: 'example' }]);
  }
}

export async function execute(interaction${chatTy}) {
  await interaction.reply({
    content: \`Handled demo/find — query: \${interaction.options.getString('query', true)}\`,
    ephemeral: true,
  });
}
`;
	}

	if (sub) {
		return `import { SlashCommandBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('${commandName}')
  .setDescription('${esc}')
  .addSubcommandGroup((group) =>
    group
      .setName('demo')
      .setDescription('Example subcommand group')
      .addSubcommand((sub) =>
        sub.setName('hello').setDescription('Sample nested subcommand'),
      ),
  );

export async function execute(interaction${chatTy}) {
  const group = interaction.options.getSubcommandGroup(false);
  const sub = interaction.options.getSubcommand();
  await interaction.reply({
    content: \`Subcommand: \${group ?? '—'}/\${sub}\`,
    ephemeral: true,
  });
}
`;
	}

	if (auto) {
		return `import { SlashCommandBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('${commandName}')
  .setDescription('${esc}')
  .addStringOption((opt) =>
    opt
      .setName('query')
      .setDescription('Type to search')
      .setRequired(true)
      .setAutocomplete(true),
  );

export async function autocomplete(interaction${autoTy}) {
  const focused = interaction.options.getFocused(true);
  if (focused.name === 'query') {
    await interaction.respond([{ name: 'Example choice', value: 'example' }]);
  }
}

export async function execute(interaction${chatTy}) {
  await interaction.reply({
    content: \`You picked: \${interaction.options.getString('query', true)}\`,
    ephemeral: true,
  });
}
`;
	}

	return `import { SlashCommandBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('${commandName}')
  .setDescription('${esc}');

export async function execute(interaction${chatTy}) {
  await interaction.reply('${commandName} is wired up.');
}
`;
}

export function renderContextMenuCommandTemplate(
	language: Language,
	commandName: string,
	target: 'user' | 'message',
) {
	const ts = language === 'ts';
	const appType =
		target === 'user' ? 'ApplicationCommandType.User' : 'ApplicationCommandType.Message';
	const intTy =
		target === 'user'
			? 'import("discord.js").UserContextMenuCommandInteraction'
			: 'import("discord.js").MessageContextMenuCommandInteraction';

	return `import { ApplicationCommandType, ContextMenuCommandBuilder } from 'discord.js';

export const data = new ContextMenuCommandBuilder()
  .setName('${commandName.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}')
  .setType(${appType});

export async function execute(interaction${ts ? `: ${intTy}` : ''}) {
  await interaction.reply({
    content: '${commandName.replace(/\\/g, '\\\\').replace(/'/g, "\\'")} is wired up.',
    ephemeral: true,
  });
}
`;
}

export function renderEventTemplate(
	language: Language,
	eventName: string,
	once: boolean,
) {
	const argsSignature =
		isClientReadyEvent(eventName)
			? language === 'ts'
				? 'client: import("discord.js").Client<true>'
				: 'client'
			: language === 'ts'
				? '...args: unknown[]'
				: '...args';

	return `export const name = '${eventName}';
export const once = ${once};

export async function execute(${argsSignature}) {
  ${isClientReadyEvent(eventName) ? 'console.log(`Logged in as ${client.user.tag}`);' : 'void args;'}
}
`;
}

function escapeJsSingleQuotedString(value: string): string {
	return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function renderRegexpInteractionTemplate(
	language: Language,
	spec: Extract<InteractionTemplateSpec, { match: 'regexp' }>,
	tsImport: string,
	tsInteractionType: string,
): string {
	const pat = escapeJsSingleQuotedString(spec.pattern);
	const flags = escapeJsSingleQuotedString(spec.flags);
	if (language === 'ts') {
		return `${tsImport}export const customIdRegExp = new RegExp('${pat}', '${flags}');

export async function execute(interaction: ${tsInteractionType}, match: RegExpExecArray) {
  void match[0];
  await interaction.reply({
    content: 'Handler wired up (RegExp full-string match).',
    ephemeral: true,
  });
}
`;
	}

	return `export const customIdRegExp = new RegExp('${pat}', '${flags}');

export async function execute(interaction, match) {
  void match[0];
  await interaction.reply({
    content: 'Handler wired up (RegExp full-string match).',
    ephemeral: true,
  });
}
`;
}

export function renderModalTemplate(
	language: Language,
	spec: InteractionTemplateSpec,
) {
	if (spec.match === 'regexp') {
		return renderRegexpInteractionTemplate(
			language,
			spec,
			language === 'ts'
				? "import type { ModalSubmitInteraction } from 'discord.js';\n\n"
				: '',
			'ModalSubmitInteraction',
		);
	}

	const id = escapeJsSingleQuotedString(spec.value);
	if (language === 'ts') {
		return `import type { ModalSubmitInteraction } from 'discord.js';

export const customId = '${id}';

export async function execute(interaction: ModalSubmitInteraction) {
  await interaction.reply({
    content: 'Modal handler is wired up.',
    ephemeral: true,
  });
}
`;
	}

	return `export const customId = '${id}';

export async function execute(interaction) {
  await interaction.reply({
    content: 'Modal handler is wired up.',
    ephemeral: true,
  });
}
`;
}

export function renderButtonTemplate(
	language: Language,
	spec: InteractionTemplateSpec,
) {
	if (spec.match === 'regexp') {
		return renderRegexpInteractionTemplate(
			language,
			spec,
			language === 'ts'
				? "import type { ButtonInteraction } from 'discord.js';\n\n"
				: '',
			'ButtonInteraction',
		);
	}

	const id = escapeJsSingleQuotedString(spec.value);
	if (language === 'ts') {
		return `import type { ButtonInteraction } from 'discord.js';

export const customId = '${id}';

export async function execute(interaction: ButtonInteraction) {
  await interaction.reply({
    content: 'Button handler is wired up.',
    ephemeral: true,
  });
}
`;
	}

	return `export const customId = '${id}';

export async function execute(interaction) {
  await interaction.reply({
    content: 'Button handler is wired up.',
    ephemeral: true,
  });
}
`;
}

export function renderSelectMenuTemplate(
	language: Language,
	spec: InteractionTemplateSpec,
) {
	if (spec.match === 'regexp') {
		return renderRegexpInteractionTemplate(
			language,
			spec,
			language === 'ts'
				? "import type { StringSelectMenuInteraction } from 'discord.js';\n\n"
				: '',
			'StringSelectMenuInteraction',
		);
	}

	const id = escapeJsSingleQuotedString(spec.value);
	if (language === 'ts') {
		return `import type { StringSelectMenuInteraction } from 'discord.js';

export const customId = '${id}';

export async function execute(interaction: StringSelectMenuInteraction) {
  await interaction.reply({
    content: 'Select menu handler is wired up.',
    ephemeral: true,
  });
}
`;
	}

	return `export const customId = '${id}';

export async function execute(interaction) {
  await interaction.reply({
    content: 'Select menu handler is wired up.',
    ephemeral: true,
  });
}
`;
}

export function renderEntryFile(manifest: ForgeLoopManifest) {
	if (manifest.preset === 'basic') {
		return basicBootstrap(manifest);
	}

	if (manifest.preset === 'advanced') {
		return advancedIndex();
	}

	return modularBootstrap(manifest);
}

export function renderInitialHandlerFiles(manifest: ForgeLoopManifest): FileSpec[] {
	if (!hasHandlers(manifest)) {
		return [];
	}

	const extension = fileExtension(manifest.language);
	return [
		{
			path: `${manifest.paths.commandsDir!}/ping.${extension}`,
			content: renderCommandTemplate(
				manifest.language,
				'ping',
				'Check whether the bot is responding.',
			),
		},
		{
			path: `${manifest.paths.eventsDir!}/clientReady.${extension}`,
			content: renderEventTemplate(manifest.language, 'clientReady', true),
		},
	];
}

export function renderStarterRuntimeFiles(
	manifest: ForgeLoopManifest,
): FileSpec[] {
	const files: FileSpec[] = [];
	const extension = fileExtension(manifest.language);
	const sourceExtension = fileExtension(manifest.language);
	const ts = manifest.language === 'ts';

	if (ts && manifest.preset !== 'basic') {
		files.push({
			path: 'src/types/commands.ts',
			content: typeCommandSupport('ts')!,
		});
	}

	if (manifest.preset === 'modular') {
		files.push({
			path: `src/sync-commands.${extension}`,
			content: modularSyncCommands(manifest),
		});
		return files;
	}

	if (manifest.preset !== 'advanced') {
		return files;
	}

	const eventHandlerSuffix = ts ? ': unknown[]' : '';
	files.push(
		{
			path: `src/core/client/create-client.${extension}`,
			content: `import { Client, Collection, GatewayIntentBits } from 'discord.js';
${ts ? "import type { BotClient, CommandModule } from '../../types/commands.js';\n" : ''}

export function createClient() {
  const client${ts ? ': BotClient' : ''} = new Client({
    intents: [GatewayIntentBits.Guilds],
  })${ts ? ' as BotClient' : ''};

  client.commands = new Collection${ts ? '<string, CommandModule>' : ''}();
  return client;
}
`,
		},
		{
			path: `src/core/loaders/load-commands.${extension}`,
			content: loaderModuleContent(
				sourceExtension,
				'commands',
				"logScope('commands', `Loaded ${client.commands.size} command modules`);",
				ts ? "import type { BotClient } from '../../types/commands.js';\n" : '',
				ts ? ': BotClient' : '',
				eventHandlerSuffix,
			),
		},
		{
			path: `src/core/loaders/load-events.${extension}`,
			content: loaderModuleContent(
				sourceExtension,
				'events',
				"logScope('events', `Loaded ${loadedEvents} event modules`);",
				ts ? "import type { BotClient } from '../../types/commands.js';\n" : '',
				ts ? ': BotClient' : '',
				eventHandlerSuffix,
			),
		},
		{
			path: `src/core/runtime/start-bot.${extension}`,
			content: `import { config } from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '../client/create-client.js';
${manifest.features.database ? `import { connectDatabase } from '../database/client.js';\n` : ''}import { loadCommands } from '../loaders/load-commands.js';
import { loadEvents } from '../loaders/load-events.js';
import { logScope } from '../../lib/logger.js';
import { syncCommands } from './sync-commands.js';
import { assertRequiredEnv } from '../../config/env.js';
import { registerInteractionHandlers } from '../../interactions/router.js';

config();

export async function startBot() {
  const client = createClient();
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  await loadCommands(client, __dirname);
  await syncCommands(client);
  await loadEvents(client, __dirname);
  await registerInteractionHandlers(client);
  ${manifest.features.database ? 'await connectDatabase();' : ''}
  logScope('runtime', 'Starting Discord client');
  await client.login(assertRequiredEnv('DISCORD_TOKEN'));
}
`,
		},
		{
			path: `src/core/runtime/sync-commands.${extension}`,
			content: syncCommandsTemplate(
				ts,
				'../../types/commands.js',
				'../../config/env.js',
				"import { logScope } from '../../lib/logger.js';\n",
				"logScope('commands', `Synced ${commandPayload.length} commands globally`);",
				"logScope('commands', `Synced ${commandPayload.length} commands to guild ${guildId}`);",
			),
		},
	);

	return files;
}
