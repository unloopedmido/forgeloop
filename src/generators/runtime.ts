import type { ForgeLoopManifest, Language } from '../types.js';
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
  ChatInputCommandInteraction,
  Collection,
  SlashCommandBuilder,
} from 'discord.js';

export interface CommandModule {
  data: SlashCommandBuilder;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void> | void;
}

export type BotClient = import('discord.js').Client & {
  commands: Collection<string, CommandModule>;
};
`;
}

function modularInteractionBlock(sourceExtension: string) {
	return `const modalHandlers = new Map();
const buttonHandlers = new Map();
const stringSelectHandlers = new Map();

async function loadInteractionHandlers() {
  const base = path.join(__dirname, 'interactions');

  async function loadMap(subdir, map) {
    const dir = path.join(base, subdir);
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.${sourceExtension}')) {
        continue;
      }

      const modulePath = pathToFileURL(path.join(dir, entry.name)).href;
      const mod = await import(modulePath);
      if (typeof mod.customId === 'string' && typeof mod.execute === 'function') {
        map.set(mod.customId, mod.execute);
      }
    }
  }

  await loadMap('modals', modalHandlers);
  await loadMap('buttons', buttonHandlers);
  await loadMap('selectMenus', stringSelectHandlers);
}

client.on('interactionCreate', async (interaction) => {
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

  if (interaction.isModalSubmit()) {
    const handler = modalHandlers.get(interaction.customId);
    if (handler) {
      await handler(interaction);
    }
    return;
  }

  if (interaction.isButton()) {
    const handler = buttonHandlers.get(interaction.customId);
    if (handler) {
      await handler(interaction);
    }
    return;
  }

  if (interaction.isStringSelectMenu()) {
    const handler = stringSelectHandlers.get(interaction.customId);
    if (handler) {
      await handler(interaction);
    }
  }
});`;
}

function advancedInteractionBlock(sourceExtension: string) {
	return `const modalHandlers = new Map();
const buttonHandlers = new Map();
const stringSelectHandlers = new Map();

async function loadInteractionHandlers() {
  const base = path.join(__dirname, '..', '..', 'interactions');

  async function loadMap(subdir, map) {
    const dir = path.join(base, subdir);
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.${sourceExtension}')) {
        continue;
      }

      const modulePath = pathToFileURL(path.join(dir, entry.name)).href;
      const mod = await import(modulePath);
      if (typeof mod.customId === 'string' && typeof mod.execute === 'function') {
        map.set(mod.customId, mod.execute);
      }
    }
  }

  await loadMap('modals', modalHandlers);
  await loadMap('buttons', buttonHandlers);
  await loadMap('selectMenus', stringSelectHandlers);
}

client.on('interactionCreate', async (interaction) => {
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

  if (interaction.isModalSubmit()) {
    const handler = modalHandlers.get(interaction.customId);
    if (handler) {
      await handler(interaction);
    }
    return;
  }

  if (interaction.isButton()) {
    const handler = buttonHandlers.get(interaction.customId);
    if (handler) {
      await handler(interaction);
    }
    return;
  }

  if (interaction.isStringSelectMenu()) {
    const handler = stringSelectHandlers.get(interaction.customId);
    if (handler) {
      await handler(interaction);
    }
  }
});`;
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
import { logScope } from '../logging/logger.js';
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

${modularInteractionBlock(sourceExtension)}

await loadCommands();
await syncCommands(client);
await loadEvents();
await loadInteractionHandlers();
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
		'',
		"console.log(`Synced ${commandPayload.length} commands globally.`);",
		"console.log(`Synced ${commandPayload.length} commands to guild ${guildId}.`);",
	);
}

export function hasHandlers(manifest: ForgeLoopManifest) {
	return Boolean(manifest.paths.commandsDir && manifest.paths.eventsDir);
}

export function isClientReadyEvent(eventName: string) {
	return eventName === 'clientReady';
}

export function renderCommandTemplate(
	language: Language,
	commandName: string,
	description?: string,
) {
	const resolvedDescription =
		description && description.trim().length > 0
			? description.trim()
			: 'No description provided yet.';
	return `import { SlashCommandBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('${commandName}')
  .setDescription('${resolvedDescription.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}');

export async function execute(interaction${language === 'ts' ? ': import("discord.js").ChatInputCommandInteraction' : ''}) {
  await interaction.reply('${commandName} is wired up.');
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

export function renderModalTemplate(language: Language, customId: string) {
	const id = escapeJsSingleQuotedString(customId);
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

export function renderButtonTemplate(language: Language, customId: string) {
	const id = escapeJsSingleQuotedString(customId);
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

export function renderSelectMenuTemplate(language: Language, customId: string) {
	const id = escapeJsSingleQuotedString(customId);
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
			path: `src/core/logging/logger.${extension}`,
			content: `export function logScope(scope${ts ? ': string' : ''}, message${ts ? ': string' : ''}) {
  console.log(\`[\${scope}] \${message}\`);
}
`,
		},
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
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createClient } from '../client/create-client.js';
${manifest.features.database ? `import { connectDatabase } from '../database/client.js';\n` : ''}import { loadCommands } from '../loaders/load-commands.js';
import { loadEvents } from '../loaders/load-events.js';
import { logScope } from '../logging/logger.js';
import { syncCommands } from './sync-commands.js';
import { assertRequiredEnv } from '../../config/env.js';

config();

export async function startBot() {
  const client = createClient();
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  ${advancedInteractionBlock(sourceExtension)}

  await loadCommands(client, __dirname);
  await syncCommands(client);
  await loadEvents(client, __dirname);
  await loadInteractionHandlers();
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
				"import { logScope } from '../logging/logger.js';\n",
				"logScope('commands', `Synced ${commandPayload.length} commands globally`);",
				"logScope('commands', `Synced ${commandPayload.length} commands to guild ${guildId}`);",
			),
		},
	);

	return files;
}
