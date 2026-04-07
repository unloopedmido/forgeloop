import { describe, expect, test } from 'bun:test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from '../src/utils/args.js';
import { runAdd } from '../src/commands/add.js';
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
			new BufferedOutput() as never,
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
			new BufferedOutput() as never,
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
			new BufferedOutput() as never,
		);
		await runAdd(
			parseArgs(['add', 'event', 'guildCreate', '--once', '--dir', root]),
			new BufferedOutput() as never,
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
				new BufferedOutput() as never,
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
				new BufferedOutput() as never,
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

		const output = new BufferedOutput();
		await runDoctor(parseArgs(['doctor', '--dir', root]), output as never);
		expect(output.errors.length).toBe(0);
		expect(
			output.logs.some((line) => line.includes('Project looks healthy.')),
		).toBe(true);
	});
});
