import type { ForgeLoopManifest, Language } from '../types.js';
import type { FileSpec } from '../utils/fs.js';

function ext(language: Language) {
	return language === 'ts' ? 'ts' : 'js';
}

function packageManagerInstallHint(
	packageManager: ForgeLoopManifest['packageManager'],
) {
	if (packageManager === 'yarn') {
		return 'yarn install';
	}

	return `${packageManager} install`;
}

function packageManagerRunCommand(
	packageManager: ForgeLoopManifest['packageManager'],
	scriptName: string,
) {
	if (packageManager === 'yarn') {
		return `yarn ${scriptName}`;
	}

	return `${packageManager} run ${scriptName}`;
}

function packageManagerField(
	packageManager: ForgeLoopManifest['packageManager'],
) {
	const versions: Record<ForgeLoopManifest['packageManager'], string> = {
		npm: 'npm@10',
		pnpm: 'pnpm@9',
		yarn: 'yarn@1.22.22',
		bun: 'bun@1.3.11',
	};

	return versions[packageManager];
}

function relativeImportPath(language: Language, importPath: string) {
	if (language === 'ts') {
		return `${importPath}.js`;
	}

	return `${importPath}.js`;
}

function sourceFileExtension(language: Language) {
	return language === 'ts' ? 'ts' : 'js';
}

function hasHandlers(manifest: ForgeLoopManifest) {
	return Boolean(manifest.paths.commandsDir && manifest.paths.eventsDir);
}

function packageJson(manifest: ForgeLoopManifest) {
	const isTs = manifest.language === 'ts';
	const mainFile = `src/index.${sourceFileExtension(manifest.language)}`;
	const scripts: Record<string, string> = {
		dev: isTs ? `tsx ${mainFile}` : `node ${mainFile}`,
		start: isTs ? `node --import tsx ${mainFile}` : `node ${mainFile}`,
	};
	const dependencies: Record<string, string> = {
		'discord.js': '^14.22.1',
		dotenv: '^17.2.3',
	};
	const devDependencies: Record<string, string> = isTs
		? {
				'@types/node': '^24.7.2',
				tsx: '^4.20.6',
				typescript: '^5.9.3',
			}
		: {};

	if (manifest.features.tooling === 'eslint-prettier') {
		scripts.lint = 'eslint .';
		scripts.format = 'prettier --write .';
		Object.assign(devDependencies, {
			eslint: '^9.38.0',
			globals: '^16.4.0',
			prettier: '^3.6.2',
		});
		if (isTs) {
			Object.assign(devDependencies, {
				'typescript-eslint': '^8.46.2',
			});
		}
	}

	if (manifest.features.tooling === 'biome') {
		scripts.lint = 'biome check .';
		scripts.format = 'biome format --write .';
		Object.assign(devDependencies, {
			'@biomejs/biome': '^1.9.4',
		});
	}

	if (manifest.features.database?.orm === 'prisma') {
		scripts['db:generate'] = 'prisma generate';
		scripts['db:migrate'] = 'prisma migrate dev';
		Object.assign(dependencies, {
			'@prisma/client': '^6.7.0',
		});
		Object.assign(devDependencies, {
			prisma: '^6.7.0',
		});
	}

	const packageJsonObject = {
		name: manifest.projectName,
		version: '0.1.0',
		private: true,
		type: 'module',
		packageManager: packageManagerField(manifest.packageManager),
		scripts,
		dependencies,
		devDependencies:
			Object.keys(devDependencies).length > 0 ? devDependencies : undefined,
	};

	return JSON.stringify(packageJsonObject, null, 2);
}

function tsconfig(manifest: ForgeLoopManifest) {
	if (manifest.language !== 'ts') {
		return null;
	}

	return JSON.stringify(
		{
			compilerOptions: {
				target: 'ES2022',
				module: 'NodeNext',
				moduleResolution: 'NodeNext',
				outDir: 'dist',
				rootDir: 'src',
				strict: true,
				resolveJsonModule: true,
				esModuleInterop: true,
				skipLibCheck: true,
			},
			include: ['src/**/*.ts'],
		},
		null,
		2,
	);
}

function eslintConfig(manifest: ForgeLoopManifest) {
	if (manifest.features.tooling !== 'eslint-prettier') {
		return null;
	}

	return manifest.language === 'ts'
		? `import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import { defineConfig } from 'eslint/config';

export default defineConfig([
  {
    files: ['**/*.{ts,mts,cts}'],
    plugins: { js },
    extends: ['js/recommended'],
    languageOptions: {
      globals: globals.node,
    },
  },
  ...tseslint.configs.recommended,
]);
`
		: `import js from '@eslint/js';
import globals from 'globals';
import { defineConfig } from 'eslint/config';

export default defineConfig([
  {
    files: ['**/*.{js,mjs,cjs}'],
    plugins: { js },
    extends: ['js/recommended'],
    languageOptions: {
      sourceType: 'module',
      globals: globals.node,
    },
  },
]);
`;
}

function prettierConfig(manifest: ForgeLoopManifest) {
	if (manifest.features.tooling !== 'eslint-prettier') {
		return null;
	}

	return JSON.stringify(
		{
			useTabs: true,
			singleQuote: true,
			trailingComma: 'es5',
		},
		null,
		2,
	);
}

function biomeConfig(manifest: ForgeLoopManifest) {
	if (manifest.features.tooling !== 'biome') {
		return null;
	}

	return JSON.stringify(
		{
			$schema: 'https://biomejs.dev/schemas/1.9.4/schema.json',
			formatter: {
				enabled: true,
				indentStyle: 'tab',
			},
			linter: {
				enabled: true,
				rules: {
					recommended: true,
				},
			},
			javascript: {
				formatter: {
					quoteStyle: 'single',
				},
			},
		},
		null,
		2,
	);
}

function envExample(manifest: ForgeLoopManifest) {
	const lines = [
		'DISCORD_TOKEN=replace-me',
		'CLIENT_ID=replace-me',
		'GUILD_ID=replace-me',
	];
	if (manifest.features.database?.provider === 'sqlite') {
		lines.push('DATABASE_URL="file:./dev.db"');
	}
	if (manifest.features.database?.provider === 'postgresql') {
		lines.push(
			'DATABASE_URL="postgresql://user:password@localhost:5432/forgeloop"',
		);
	}

	return `${lines.join('\n')}\n`;
}

function commandTemplate(
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
  .setDescription('${resolvedDescription.replace(/'/g, "\\'")}');

export async function execute(interaction${language === 'ts' ? ': import("discord.js").ChatInputCommandInteraction' : ''}) {
  await interaction.reply('${commandName} is wired up.');
}
`;
}

function commandTypes(language: Language) {
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

function eventTemplate(language: Language, eventName: string, once: boolean) {
	const eventExport = `export const name = '${eventName}';\nexport const once = ${once};\n`;
	const argsSignature =
		eventName === 'ready'
			? language === 'ts'
				? 'client: import("discord.js").Client<true>'
				: 'client'
			: language === 'ts'
				? '...args: unknown[]'
				: '...args';

	return `${eventExport}
export async function execute(${argsSignature}) {
  ${eventName === 'ready' ? 'console.log(`Logged in as ${client.user.tag}`);' : 'void args;'}
}
`;
}

function basicBootstrap(manifest: ForgeLoopManifest) {
	return `import { Client, GatewayIntentBits, SlashCommandBuilder } from 'discord.js';
import { config } from 'dotenv';
import { assertRequiredEnv } from '${relativeImportPath(manifest.language, './config/env')}';

config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

const pingCommand = new SlashCommandBuilder()
  .setName('ping')
  .setDescription('Check whether the bot is responding.');

client.once('ready', () => {
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

await client.login(assertRequiredEnv('DISCORD_TOKEN'));
`;
}

function modularBootstrap(manifest: ForgeLoopManifest) {
	const sourceExtension = sourceFileExtension(manifest.language);
	const typeImports = manifest.language === 'ts' ? ', type ClientEvents' : '';
	const eventTypeAlias =
		manifest.language === 'ts'
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
import { assertRequiredEnv } from '${relativeImportPath(manifest.language, './config/env')}';
${manifest.language === 'ts' ? "import type { BotClient } from './types/commands.js';" : ''}

config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

${typeImports ? eventTypeAlias : ''}
const client${manifest.language === 'ts' ? ': BotClient' : ''} = new Client({
  intents: [GatewayIntentBits.Guilds],
})${manifest.language === 'ts' ? ' as BotClient' : ''};

client.commands = new Collection${manifest.language === 'ts' ? '<string, CommandModule>' : ''}();

async function loadCommands() {
  const commandsDir = path.join(__dirname, 'commands');
  const entries = await readdir(commandsDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.${sourceExtension}')) {
      continue;
    }

    const modulePath = pathToFileURL(path.join(commandsDir, entry.name)).href;
    const commandModule = await import(modulePath);
    client.commands.set(commandModule.data.name, commandModule);
  }
}

async function loadEvents() {
  const eventsDir = path.join(__dirname, 'events');
  const entries = await readdir(eventsDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.${sourceExtension}')) {
      continue;
    }

    const modulePath = pathToFileURL(path.join(eventsDir, entry.name)).href;
    const eventModule${typeImports ? ': LoadedEvent' : ''} = await import(modulePath);
    const handler = (...args${manifest.language === 'ts' ? ': unknown[]' : ''}) => eventModule.execute(...args);
    if (eventModule.once) {
      client.once(eventModule.name, handler);
    } else {
      client.on(eventModule.name, handler);
    }
  }
}

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) {
    return;
  }

  const command = client.commands.get(interaction.commandName);
  if (!command) {
    await interaction.reply({
      content: 'This command is not registered in the runtime.',
      ephemeral: true,
    });
    return;
  }

  await command.execute(interaction);
});

await loadCommands();
await loadEvents();
await client.login(assertRequiredEnv('DISCORD_TOKEN'));
`;
}

function advancedIndex(manifest: ForgeLoopManifest) {
	return `import { startBot } from '${relativeImportPath(manifest.language, './core/runtime/start-bot')}';

await startBot();
`;
}

function envConfig(language: Language) {
	return `export function assertRequiredEnv(key${language === 'ts' ? ': string' : ''})${language === 'ts' ? ': string' : ''} {
  const value = process.env[key];
  if (!value) {
    throw new Error(\`Missing required environment variable: \${key}\`);
  }

  return value;
}
`;
}

function modularExtras(manifest: ForgeLoopManifest): FileSpec[] {
	if (manifest.preset !== 'modular') {
		return [];
	}

	const fileExtension = ext(manifest.language);
	return [
		{
			path: `src/lib/logger.${fileExtension}`,
			content: `export function logScope(scope${manifest.language === 'ts' ? ': string' : ''}, message${manifest.language === 'ts' ? ': string' : ''}) {
  console.log(\`[\${scope}] \${message}\`);
}
`,
		},
	];
}

function advancedCoreFiles(manifest: ForgeLoopManifest): FileSpec[] {
	if (manifest.preset !== 'advanced') {
		return [];
	}

	const fileExtension = ext(manifest.language);
	const sourceExtension = sourceFileExtension(manifest.language);
	const ts = manifest.language === 'ts';
	return [
		...(ts
			? [
					{
						path: 'src/types/commands.ts',
						content: `${commandTypes('ts')!}`,
					},
				]
			: []),
		{
			path: `src/core/logging/logger.${fileExtension}`,
			content: `export function logScope(scope${ts ? ': string' : ''}, message${ts ? ': string' : ''}) {
  console.log(\`[\${scope}] \${message}\`);
}
`,
		},
		{
			path: `src/core/client/create-client.${fileExtension}`,
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
			path: `src/core/loaders/load-commands.${fileExtension}`,
			content: `import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { logScope } from '${relativeImportPath(manifest.language, '../logging/logger')}';
${ts ? "import type { BotClient } from '../../types/commands.js';\n" : ''}

export async function loadCommands(client${ts ? ': BotClient' : ''}, runtimeDir${ts ? ': string' : ''}) {
  const commandsDir = path.join(runtimeDir, '..', '..', 'commands');
  const entries = await readdir(commandsDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.${sourceExtension}')) {
      continue;
    }

    const modulePath = pathToFileURL(path.join(commandsDir, entry.name)).href;
    const commandModule = await import(modulePath);
    client.commands.set(commandModule.data.name, commandModule);
  }

  logScope('commands', \`Loaded \${client.commands.size} command modules\`);
}
`,
		},
		{
			path: `src/core/loaders/load-events.${fileExtension}`,
			content: `import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { logScope } from '${relativeImportPath(manifest.language, '../logging/logger')}';
${ts ? "import type { BotClient } from '../../types/commands.js';\n" : ''}

export async function loadEvents(client${ts ? ': BotClient' : ''}, runtimeDir${ts ? ': string' : ''}) {
  const eventsDir = path.join(runtimeDir, '..', '..', 'events');
  const entries = await readdir(eventsDir, { withFileTypes: true });
  let loadedEvents = 0;

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.${sourceExtension}')) {
      continue;
    }

    const modulePath = pathToFileURL(path.join(eventsDir, entry.name)).href;
    const eventModule = await import(modulePath);
    const handler = (...args${ts ? ': unknown[]' : ''}) => eventModule.execute(...args);
    if (eventModule.once) {
      client.once(eventModule.name, handler);
    } else {
      client.on(eventModule.name, handler);
    }
    loadedEvents += 1;
  }

  logScope('events', \`Loaded \${loadedEvents} event modules\`);
}
`,
		},
		{
			path: `src/core/runtime/start-bot.${fileExtension}`,
			content: `import { config } from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '${relativeImportPath(manifest.language, '../client/create-client')}';
import { loadCommands } from '${relativeImportPath(manifest.language, '../loaders/load-commands')}';
import { loadEvents } from '${relativeImportPath(manifest.language, '../loaders/load-events')}';
import { logScope } from '${relativeImportPath(manifest.language, '../logging/logger')}';
import { assertRequiredEnv } from '${relativeImportPath(manifest.language, '../../config/env')}';

config();

export async function startBot() {
  const client = createClient();
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) {
      return;
    }

    const command = client.commands.get(interaction.commandName);
    if (!command) {
      await interaction.reply({
        content: 'This command is not registered in the runtime.',
        ephemeral: true,
      });
      return;
    }

    await command.execute(interaction);
  });

  await loadCommands(client, __dirname);
  await loadEvents(client, __dirname);
  logScope('runtime', 'Starting Discord client');
  await client.login(assertRequiredEnv('DISCORD_TOKEN'));
}
`,
		},
	];
}

function prismaFiles(manifest: ForgeLoopManifest): FileSpec[] {
	if (!manifest.features.database) {
		return [];
	}

	const provider = manifest.features.database.provider;
	return [
		{
			path: 'prisma/schema.prisma',
			content: `generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "${provider}"
  url      = env("DATABASE_URL")
}

model Healthcheck {
  id        Int      @id @default(autoincrement())
  label     String   @default("ready")
  createdAt DateTime @default(now())
}
`,
		},
	];
}

function dockerFiles(manifest: ForgeLoopManifest): FileSpec[] {
	if (!manifest.features.docker) {
		return [];
	}

	const installCommand =
		manifest.packageManager === 'pnpm'
			? 'corepack enable && pnpm install'
			: manifest.packageManager === 'yarn'
				? 'corepack enable && yarn install'
				: manifest.packageManager === 'bun'
					? 'bun install'
					: 'npm install';
	const startCommand =
		manifest.packageManager === 'yarn'
			? '["yarn", "start"]'
			: manifest.packageManager === 'bun'
				? '["bun", "run", "start"]'
				: `["${manifest.packageManager}", "run", "start"]`;
	const baseImage =
		manifest.packageManager === 'bun' ? 'oven/bun:1' : 'node:22-alpine';

	return [
		{
			path: 'Dockerfile',
			content: `FROM ${baseImage}

WORKDIR /app
COPY package.json ./
RUN ${installCommand}
COPY . .

CMD ${startCommand}
`,
		},
		{
			path: '.dockerignore',
			content: `node_modules
dist
.env
`,
		},
	];
}

function ciFiles(manifest: ForgeLoopManifest): FileSpec[] {
	if (!manifest.features.ci) {
		return [];
	}

	const lintCommand =
		manifest.features.tooling === 'none'
			? `      - run: node -e "console.log('No lint or formatter configured')"`
			: `      - run: ${packageManagerRunCommand(manifest.packageManager, 'lint')}`;
	const installStep =
		manifest.packageManager === 'pnpm'
			? `      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: corepack enable
      - run: pnpm install`
			: manifest.packageManager === 'yarn'
				? `      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: yarn
      - run: corepack enable
      - run: yarn install`
				: manifest.packageManager === 'bun'
					? `      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: 1.3.11
      - run: bun install`
					: `      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm install`;
	const validationStep =
		lintCommand;

	return [
		{
			path: '.github/workflows/ci.yml',
			content: `name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
${installStep}
${validationStep}
`,
		},
	];
}

export function renderProjectFiles(manifest: ForgeLoopManifest): FileSpec[] {
	const fileExtension = ext(manifest.language);
	const files: FileSpec[] = [
		{
			path: 'package.json',
			content: `${packageJson(manifest)}\n`,
		},
		{
			path: '.env.example',
			content: envExample(manifest),
		},
		{
			path: 'README.md',
			content: `# ${manifest.projectName}

Generated by ForgeLoop.

Project shape: ${manifest.preset}

## Commands

\`\`\`bash
${packageManagerInstallHint(manifest.packageManager)}
${manifest.packageManager} run dev
\`\`\`

## Managed by ForgeLoop

This project includes ${manifest.$schema} and is expected to be maintained with ForgeLoop commands.
`,
		},
		{
			path: 'forgeloop.json',
			content: `${JSON.stringify(manifest, null, 2)}\n`,
		},
		{
			path: `src/index.${fileExtension}`,
			content:
				manifest.preset === 'basic'
					? basicBootstrap(manifest)
					: manifest.preset === 'advanced'
						? advancedIndex(manifest)
						: modularBootstrap(manifest),
		},
		{
			path: `src/config/env.${fileExtension}`,
			content: envConfig(manifest.language),
		},
		...(manifest.language === 'ts' && manifest.preset === 'modular'
			? [
					{
						path: 'src/types/commands.ts',
						content: `${commandTypes('ts')!}`,
					},
				]
			: []),
	];

	if (manifest.features.git) {
		files.push({
			path: '.gitignore',
			content: `node_modules\ndist\n.env\n`,
		});
	}

	if (hasHandlers(manifest)) {
		files.push(
			{
				path: `${manifest.paths.commandsDir!}/ping.${fileExtension}`,
				content: commandTemplate(
					manifest.language,
					'ping',
					'Check whether the bot is responding.',
				),
			},
			{
				path: `${manifest.paths.eventsDir!}/ready.${fileExtension}`,
				content: eventTemplate(manifest.language, 'ready', true),
			},
		);
	}

	const tsConfigContent = tsconfig(manifest);
	if (tsConfigContent) {
		files.push({
			path: 'tsconfig.json',
			content: `${tsConfigContent}\n`,
		});
	}

	const eslintConfigContent = eslintConfig(manifest);
	if (eslintConfigContent) {
		files.push({
			path: 'eslint.config.js',
			content: eslintConfigContent,
		});
	}

	const prettierConfigContent = prettierConfig(manifest);
	if (prettierConfigContent) {
		files.push({
			path: '.prettierrc.json',
			content: `${prettierConfigContent}\n`,
		});
	}

	const biomeConfigContent = biomeConfig(manifest);
	if (biomeConfigContent) {
		files.push({
			path: 'biome.json',
			content: `${biomeConfigContent}\n`,
		});
	}

	files.push(...modularExtras(manifest));
	files.push(...advancedCoreFiles(manifest));
	files.push(...prismaFiles(manifest));
	files.push(...dockerFiles(manifest));
	files.push(...ciFiles(manifest));

	return files;
}

export function renderCommandFile(
	manifest: ForgeLoopManifest,
	commandName: string,
	description?: string,
): FileSpec {
	if (!manifest.paths.commandsDir) {
		throw new Error('Command files require a handler-based project shape.');
	}

	return {
		path: `${manifest.paths.commandsDir}/${commandName}.${ext(manifest.language)}`,
		content: commandTemplate(manifest.language, commandName, description),
	};
}

export function renderEventFile(
	manifest: ForgeLoopManifest,
	eventName: string,
	once = eventName === 'ready',
): FileSpec {
	if (!manifest.paths.eventsDir) {
		throw new Error('Event files require a handler-based project shape.');
	}

	return {
		path: `${manifest.paths.eventsDir}/${eventName}.${ext(manifest.language)}`,
		content: eventTemplate(manifest.language, eventName, once),
	};
}
