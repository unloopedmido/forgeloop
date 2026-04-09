import { describe, expect, test } from 'bun:test';
import { readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { CONFIG_FILE } from '../src/constants.js';
import { expandShortFlags, parseArgs } from '../src/utils/args.js';
import { runAdd } from '../src/commands/add.js';
import { runCommands } from '../src/commands/commands.js';
import { runDoctor } from '../src/commands/doctor.js';
import { createManifest } from '../src/manifest.js';
import { CliError } from '../src/utils/errors.js';
import { renderProjectFiles } from '../src/generators/templates.js';
import { ensureDirectory, writeFiles } from '../src/utils/fs.js';
import { BufferedOutput, makeProjectRoot } from './test-helpers.js';

describe('Add and doctor workflows', () => {
	test('add command creates a default command file', async () => {
		const root = await makeProjectRoot();
		const manifest = createManifest({
			projectName: 'beta',
			targetDir: root,
			language: 'js',
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

		await ensureDirectory(root);
		await writeFiles(root, renderProjectFiles(manifest));

		await runAdd(
			parseArgs(['add', 'command', 'status', '--dir', root]),
			new BufferedOutput(),
		);

		const commandFile = await readFile(
			path.join(root, 'src/commands/status.js'),
			'utf8',
		);
		expect(commandFile).toMatch(/setName\('status'\)/);
		expect(commandFile).toMatch(/No description provided yet\./);
	});

	test('add command writes a provided description', async () => {
		const root = await makeProjectRoot();
		const manifest = createManifest({
			projectName: 'descriptions',
			targetDir: root,
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

		await ensureDirectory(root);
		await writeFiles(root, renderProjectFiles(manifest));

		await runAdd(
			parseArgs([
				'add',
				'command',
				'status',
				'--description',
				'Show current bot status',
				'--dir',
				root,
			]),
			new BufferedOutput(),
		);

		expect(
			await readFile(path.join(root, 'src/commands/status.ts'), 'utf8'),
		).toMatch(/setDescription\('Show current bot status'\)/);
	});

	test('add event supports on and once bindings, and scaffolds clientReady by default', async () => {
		const root = await makeProjectRoot();
		const manifest = createManifest({
			projectName: 'events',
			targetDir: root,
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

		await ensureDirectory(root);
		await writeFiles(root, renderProjectFiles(manifest));

		await runAdd(
			parseArgs(['add', 'event', 'messageCreate', '--on', '--dir', root]),
			new BufferedOutput(),
		);
		await runAdd(
			parseArgs(['add', 'event', 'guildCreate', '--once', '--dir', root]),
			new BufferedOutput(),
		);

		expect(
			await readFile(path.join(root, 'src/events/messageCreate.ts'), 'utf8'),
		).toMatch(/export const once = false/);
		expect(
			await readFile(path.join(root, 'src/events/guildCreate.ts'), 'utf8'),
		).toMatch(/export const once = true/);
		expect(
			await readFile(path.join(root, 'src/events/clientReady.ts'), 'utf8'),
		).toMatch(/export const once = true/);
	});

	test('add rejects invalid event names and basic projects', async () => {
		const modularRoot = await makeProjectRoot();
		const modularManifest = createManifest({
			projectName: 'delta',
			targetDir: modularRoot,
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

		await ensureDirectory(modularRoot);
		await writeFiles(modularRoot, renderProjectFiles(modularManifest));

		await expect(
				runAdd(
					parseArgs(['add', 'event', 'isjdfijsdfi', '--dir', modularRoot]),
					new BufferedOutput(),
				),
		).rejects.toThrow(CliError);

		const basicRoot = await makeProjectRoot();
		const basicManifest = createManifest({
			projectName: 'basic-refuse',
			targetDir: basicRoot,
			language: 'ts',
			preset: 'basic',
			packageManager: 'npm',
			database: 'none',
			orm: 'none',
			tooling: 'none',
			git: false,
			docker: false,
			ci: false,
			install: false,
		});

		await ensureDirectory(basicRoot);
		await writeFiles(basicRoot, renderProjectFiles(basicManifest));

		await expect(
				runAdd(
					parseArgs(['add', 'command', 'status', '--dir', basicRoot]),
					new BufferedOutput(),
				),
		).rejects.toThrow(CliError);
	});

	test('doctor reports healthy modular projects', async () => {
		const root = await makeProjectRoot();
		const manifest = createManifest({
			projectName: 'gamma',
			targetDir: root,
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

		await ensureDirectory(root);
		await writeFiles(root, renderProjectFiles(manifest));
		await writeFile(
			path.join(root, '.env'),
			[
				'DISCORD_TOKEN=mock',
				'CLIENT_ID=123456789012345678',
				'GUILD_ID=987654321098765432',
				'DATABASE_URL=postgresql://user:pass@localhost:5432/forgeloop',
				'',
			].join('\n'),
			'utf8',
		);

		const output = new BufferedOutput();
		await runDoctor(parseArgs(['doctor', '--dir', root]), output);
		expect(output.errors.length).toBe(0);
		expect(
			output.logs.some((line) => line.includes('Project looks healthy.')),
		).toBe(true);
	});

	test('legacy forgeloop.json projects still load', async () => {
		const root = await makeProjectRoot();
		const manifest = createManifest({
			projectName: 'legacy-project',
			targetDir: root,
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

		await ensureDirectory(root);
		await writeFiles(root, renderProjectFiles(manifest));
		await writeFile(
			path.join(root, '.env'),
			[
				'DISCORD_TOKEN=mock',
				'CLIENT_ID=123456789012345678',
				'GUILD_ID=987654321098765432',
				'',
			].join('\n'),
			'utf8',
		);
		await rm(path.join(root, CONFIG_FILE));
		await writeFile(
			path.join(root, 'forgeloop.json'),
			`${JSON.stringify(
				{
					...manifest,
				},
				null,
				2,
			)}\n`,
		);

		const output = new BufferedOutput();
		await runDoctor(parseArgs(['doctor', '--dir', root]), output);
		expect(output.errors.length).toBe(0);
		expect(
			output.logs.some((line) => line.includes('Found forgeloop.json')),
		).toBe(true);
	});

	test('legacy forgeloop.json parse errors surface as CliError', async () => {
		const root = await makeProjectRoot();
		const manifest = createManifest({
			projectName: 'legacy-invalid-json',
			targetDir: root,
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

		await ensureDirectory(root);
		await writeFiles(root, renderProjectFiles(manifest));
		await rm(path.join(root, CONFIG_FILE));
		await writeFile(path.join(root, 'forgeloop.json'), '{ invalid', 'utf8');

		await expect(
			runDoctor(parseArgs(['doctor', '--dir', root]), new BufferedOutput()),
		).rejects.toThrow(/Failed to parse JSON file/);
	});

	test('commands enforces deploy or list subcommand', async () => {
		await expect(
			runCommands(parseArgs(['commands', 'bad']), new BufferedOutput()),
		).rejects.toThrow(/Usage: forgeloop commands deploy\|list/);
	});

	test('commands deploy rejects conflicting --global and --guild', async () => {
		await expect(
			runCommands(
				parseArgs(
					expandShortFlags(['commands', 'deploy', '--global', '--guild']),
				),
				new BufferedOutput(),
			),
		).rejects.toThrow(/only one of/);
	});
});
