import { describe, expect, test } from 'bun:test';
import { execFile } from 'node:child_process';
import { mkdir, readFile, readdir, symlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { createManifest } from '../src/manifest.js';
import { renderProjectFiles } from '../src/generators/templates.js';
import type { InitOptions } from '../src/types.js';
import { ensureDirectory, writeFiles } from '../src/utils/fs.js';
import { makeProjectRoot } from './test-helpers.js';

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tscPath = path.join(repoRoot, 'node_modules', '.bin', 'tsc');
const repoNodeModules = path.join(repoRoot, 'node_modules');

async function scaffoldProject(
	options: Omit<InitOptions, 'targetDir'>,
): Promise<string> {
	const root = await makeProjectRoot();
	const manifest = createManifest({
		...options,
		targetDir: root,
	});

	await ensureDirectory(root);
	await writeFiles(root, renderProjectFiles(manifest));
	return root;
}

async function attachRepoNodeModules(projectRoot: string) {
	const targetNodeModules = path.join(projectRoot, 'node_modules');
	await mkdir(targetNodeModules, { recursive: true });

	for (const entry of await readdir(repoNodeModules)) {
		await symlink(
			path.join(repoNodeModules, entry),
			path.join(targetNodeModules, entry),
		);
	}

	const dotenvDir = path.join(targetNodeModules, 'dotenv');
	await mkdir(dotenvDir, { recursive: true });
	await writeFile(
		path.join(dotenvDir, 'package.json'),
		JSON.stringify(
			{
				name: 'dotenv',
				version: '0.0.0-test',
				type: 'module',
				exports: {
					'.': {
						types: './index.d.ts',
						default: './index.js',
					},
				},
			},
			null,
			2,
		),
	);
	await writeFile(
		path.join(dotenvDir, 'index.d.ts'),
		'export function config(): void;\n',
	);
	await writeFile(
		path.join(dotenvDir, 'index.js'),
		'export function config() {}\n',
	);

	const discordJsDir = path.join(targetNodeModules, 'discord.js');
	await mkdir(discordJsDir, { recursive: true });
	await writeFile(
		path.join(discordJsDir, 'package.json'),
		JSON.stringify(
			{
				name: 'discord.js',
				version: '0.0.0-test',
				type: 'module',
				exports: {
					'.': {
						types: './index.d.ts',
						default: './index.js',
					},
				},
			},
			null,
			2,
		),
	);
	await writeFile(
		path.join(discordJsDir, 'index.d.ts'),
		`export class Collection<K, V> extends Map<K, V> {}

export class SlashCommandBuilder {
  name: string;
  setName(name: string): this;
  setDescription(description: string): this;
  toJSON(): Record<string, unknown>;
}

export class REST {
  constructor(options?: { version?: string });
  setToken(token: string): this;
  put(route: string, options: { body: unknown }): Promise<unknown>;
}

export class Client<Ready extends boolean = boolean> {
  user: Ready extends true ? { tag: string } : { tag?: string } | null;
  commands: Collection<string, any>;
  constructor(options?: { intents?: unknown[] });
  once<EventName extends keyof ClientEvents>(
    event: EventName,
    listener: (...args: ClientEvents[EventName]) => unknown,
  ): this;
  on<EventName extends keyof ClientEvents>(
    event: EventName,
    listener: (...args: ClientEvents[EventName]) => unknown,
  ): this;
  login(token: string): Promise<string>;
}

export interface ChatInputCommandInteraction {
  createdTimestamp: number;
  reply(
    options:
      | string
      | {
          content: string;
          fetchReply?: boolean;
          ephemeral?: boolean;
        },
  ): Promise<{ createdTimestamp: number }>;
  editReply(content: string): Promise<unknown>;
  isChatInputCommand(): boolean;
  commandName: string;
}

export interface ClientEvents {
  clientReady: [Client<true>];
  interactionCreate: [ChatInputCommandInteraction];
  [key: string]: any[];
}

export const GatewayIntentBits: Record<string, number>;
export const Events: Record<string, keyof ClientEvents>;
export const Routes: {
  applicationCommands(clientId: string): string;
  applicationGuildCommands(clientId: string, guildId: string): string;
};
`,
	);
	await writeFile(
		path.join(discordJsDir, 'index.js'),
		`export class Collection extends Map {}

export class SlashCommandBuilder {
  setName() {
    return this;
  }

  setDescription() {
    return this;
  }

  toJSON() {
    return {};
  }
}

export class REST {
  setToken() {
    return this;
  }

  async put() {
    return {};
  }
}

export class Client {
  constructor() {
    this.user = { tag: 'Test Bot' };
    this.commands = new Collection();
  }

  once() {
    return this;
  }

  on() {
    return this;
  }

  async login() {
    return 'token';
  }
}

export const GatewayIntentBits = {};
export const Events = {};
export const Routes = {
  applicationCommands(clientId) {
    return clientId;
  },
  applicationGuildCommands(clientId, guildId) {
    return \`\${clientId}:\${guildId}\`;
  },
};
`,
	);
}

async function typecheckProject(projectRoot: string) {
	await execFileAsync(tscPath, ['--noEmit'], {
		cwd: projectRoot,
		env: process.env,
	});
}

describe('Publish readiness', () => {
	test('modular TypeScript scaffold typechecks cleanly', async () => {
		const root = await scaffoldProject({
			projectName: 'modular-smoke',
			language: 'ts',
			preset: 'modular',
			packageManager: 'npm',
			database: 'none',
			orm: 'none',
			tooling: 'eslint-prettier',
			git: false,
			docker: false,
			ci: false,
			install: false,
		});

		await attachRepoNodeModules(root);
		await typecheckProject(root);
	});

	test('advanced TypeScript scaffold typechecks cleanly', async () => {
		const root = await scaffoldProject({
			projectName: 'advanced-smoke',
			language: 'ts',
			preset: 'advanced',
			packageManager: 'npm',
			database: 'none',
			orm: 'none',
			tooling: 'eslint-prettier',
			git: false,
			docker: false,
			ci: false,
			install: false,
		});

		await attachRepoNodeModules(root);
		await typecheckProject(root);
	});

	test('database scaffolds include Prisma integration files and scripts', async () => {
		const root = await scaffoldProject({
			projectName: 'database-smoke',
			language: 'ts',
			preset: 'modular',
			packageManager: 'npm',
			database: 'postgresql',
			orm: 'prisma',
			tooling: 'eslint-prettier',
			git: false,
			docker: false,
			ci: false,
			install: false,
		});

		const packageJson = JSON.parse(
			await readFile(path.join(root, 'package.json'), 'utf8'),
		);
		const prismaConfig = await readFile(
			path.join(root, 'prisma.config.ts'),
			'utf8',
		);
		const schema = await readFile(path.join(root, 'prisma/schema.prisma'), 'utf8');
		const databaseModule = await readFile(
			path.join(root, 'src/lib/database.ts'),
			'utf8',
		);

		expect(packageJson.dependencies['@prisma/client']).toBeDefined();
		expect(packageJson.devDependencies.prisma).toBeDefined();
		expect(packageJson.dependencies['@prisma/adapter-pg']).toBe('^7.7.0');
		expect(packageJson.dependencies.pg).toBe('^8.16.0');
		expect(packageJson.dependencies['@prisma/client']).toBe('^7.7.0');
		expect(packageJson.devDependencies.prisma).toBe('^7.7.0');
		expect(packageJson.scripts['db:generate']).toBe('prisma generate');
		expect(packageJson.scripts['db:push']).toBe(
			'prisma db push && prisma generate',
		);
		expect(packageJson.scripts['db:migrate']).toBe(
			'prisma migrate dev && prisma generate',
		);
		expect(packageJson.scripts['db:studio']).toBe('prisma studio');
		expect(prismaConfig).toContain("import 'dotenv/config';");
		expect(prismaConfig).toContain("schema: 'prisma/schema.prisma'");
		expect(prismaConfig).toContain("url: env('DATABASE_URL')");
		expect(schema).toContain('provider = "prisma-client"');
		expect(schema).toContain('output   = "../src/generated/prisma"');
		expect(schema).not.toContain('url      = env("DATABASE_URL")');
		expect(databaseModule).toContain("from '../generated/prisma/client.js'");
		expect(databaseModule).toContain("from '@prisma/adapter-pg'");
		expect(databaseModule).toContain("import 'dotenv/config';");
		expect(databaseModule).toContain('new PrismaPg');
		expect(databaseModule).toContain('new PrismaClient({ adapter })');
		expect(databaseModule).toContain('export async function connectDatabase()');
	});

	test('bun scaffolds keep Docker and CI on bun', async () => {
		const root = await scaffoldProject({
			projectName: 'bun-smoke',
			language: 'ts',
			preset: 'modular',
			packageManager: 'bun',
			database: 'none',
			orm: 'none',
			tooling: 'eslint-prettier',
			git: false,
			docker: true,
			ci: true,
			install: false,
		});

		const dockerfile = await readFile(path.join(root, 'Dockerfile'), 'utf8');
		const workflow = await readFile(
			path.join(root, '.github/workflows/ci.yml'),
			'utf8',
		);

		expect(dockerfile).toContain('FROM oven/bun:1');
		expect(dockerfile).toContain('RUN bun install');
		expect(dockerfile).toContain('CMD ["bun", "run", "start"]');
		expect(workflow).toContain('uses: oven-sh/setup-bun@v2');
		expect(workflow).toContain('- run: bun install');
		expect(workflow).toContain('- run: bun run lint');
	});

	test('bun sqlite scaffolds use the Bun-compatible Prisma adapter', async () => {
		const root = await scaffoldProject({
			projectName: 'bun-sqlite-smoke',
			language: 'ts',
			preset: 'modular',
			packageManager: 'bun',
			database: 'sqlite',
			orm: 'prisma',
			tooling: 'eslint-prettier',
			git: false,
			docker: false,
			ci: false,
			install: false,
		});

		const packageJson = JSON.parse(
			await readFile(path.join(root, 'package.json'), 'utf8'),
		);
		const databaseModule = await readFile(
			path.join(root, 'src/lib/database.ts'),
			'utf8',
		);

		expect(packageJson.dependencies['@prisma/adapter-libsql']).toBe('^7.7.0');
		expect(packageJson.dependencies['better-sqlite3']).toBeUndefined();
		expect(packageJson.scripts['db:push']).toBe(
			'prisma db push && prisma generate',
		);
		expect(databaseModule).toContain("from '@prisma/adapter-libsql'");
		expect(databaseModule).toContain('new PrismaLibSql');
	});

	test('pnpm scaffolds keep Docker and CI on pnpm', async () => {
		const root = await scaffoldProject({
			projectName: 'pnpm-smoke',
			language: 'ts',
			preset: 'modular',
			packageManager: 'pnpm',
			database: 'none',
			orm: 'none',
			tooling: 'eslint-prettier',
			git: false,
			docker: true,
			ci: true,
			install: false,
		});

		const dockerfile = await readFile(path.join(root, 'Dockerfile'), 'utf8');
		const workflow = await readFile(
			path.join(root, '.github/workflows/ci.yml'),
			'utf8',
		);

		expect(dockerfile).toContain('RUN corepack enable && pnpm install');
		expect(dockerfile).toContain('CMD ["pnpm", "run", "start"]');
		expect(workflow).toContain('cache: pnpm');
		expect(workflow).toContain('- run: corepack enable');
		expect(workflow).toContain('- run: pnpm install');
		expect(workflow).toContain('- run: pnpm run lint');
	});
});
