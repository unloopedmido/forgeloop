import { describe, expect, test } from 'bun:test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { CONFIG_FILE } from '../src/constants.js';
import { createManifest } from '../src/manifest.js';
import { renderProjectFiles } from '../src/generators/templates.js';
import { ensureDirectory, writeFiles } from '../src/utils/fs.js';
import { makeProjectRoot } from './test-helpers.js';

describe('Project scaffolds', () => {
	test('advanced scaffold creates core runtime structure and requested tooling', async () => {
		const root = await makeProjectRoot();
		const manifest = createManifest({
			projectName: 'alpha',
			targetDir: root,
			language: 'ts',
			preset: 'advanced',
			packageManager: 'npm',
			database: 'sqlite',
			orm: 'prisma',
			tooling: 'eslint-prettier',
			git: true,
			docker: true,
			ci: true,
			install: false,
		});

		await ensureDirectory(root);
		await writeFiles(root, renderProjectFiles(manifest));

		const configContent = await readFile(
			path.join(root, CONFIG_FILE),
			'utf8',
		);
		expect(configContent).toMatch(/defineConfig/);
		expect(configContent).toMatch(/await import\('create-forgeloop\/config'\)/);
		expect(configContent).toMatch(/export default defineConfig/);
		expect(configContent).toMatch(/"projectName": "alpha"/);
		expect(configContent).toMatch(/"provider": "sqlite"/);
		expect(await readFile(path.join(root, '.gitignore'), 'utf8')).toMatch(
			/node_modules/,
		);
		expect(await readFile(path.join(root, '.prettierrc.json'), 'utf8')).toMatch(
			/singleQuote/,
		);
		expect(await readFile(path.join(root, 'src/index.ts'), 'utf8')).toMatch(
			/startBot/,
		);
		expect(
			await readFile(path.join(root, 'src/core/database/client.ts'), 'utf8'),
		).toMatch(/connectDatabase/);
		expect(
			await readFile(path.join(root, 'src/core/runtime/start-bot.ts'), 'utf8'),
		).toMatch(/loadCommands/);
	});

	test('basic scaffold keeps logic inline and skips handlers and git files when disabled', async () => {
		const root = await makeProjectRoot();
		const manifest = createManifest({
			projectName: 'basic-inline',
			targetDir: root,
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

		await ensureDirectory(root);
		await writeFiles(root, renderProjectFiles(manifest));

		expect(await readFile(path.join(root, 'src/index.ts'), 'utf8')).toMatch(
			/pingCommand/,
		);
		expect(await readFile(path.join(root, 'src/index.ts'), 'utf8')).toMatch(
			/clientReady/,
		);
		await expect(
			readFile(path.join(root, '.gitignore'), 'utf8'),
		).rejects.toThrow();
		await expect(
			readFile(path.join(root, 'eslint.config.js'), 'utf8'),
		).rejects.toThrow();
		await expect(
			readFile(path.join(root, 'src/commands/ping.ts'), 'utf8'),
		).rejects.toThrow();
		await expect(
			readFile(path.join(root, 'src/events/clientReady.ts'), 'utf8'),
		).rejects.toThrow();
	});

	test('biome scaffold generates biome config instead of eslint files', async () => {
		const root = await makeProjectRoot();
		const manifest = createManifest({
			projectName: 'biome-only',
			targetDir: root,
			language: 'ts',
			preset: 'modular',
			packageManager: 'npm',
			database: 'none',
			orm: 'none',
			tooling: 'biome',
			git: true,
			docker: false,
			ci: false,
			install: false,
		});

		await ensureDirectory(root);
		await writeFiles(root, renderProjectFiles(manifest));

		const packageJson = JSON.parse(
			await readFile(path.join(root, 'package.json'), 'utf8'),
		);
		expect(packageJson.scripts.typecheck).toBe('tsc --noEmit');
		expect(packageJson.scripts.build).toBe('tsc');
		expect(packageJson.scripts.lint).toBe('biome check .');
		expect(await readFile(path.join(root, 'biome.json'), 'utf8')).toMatch(
			/biomejs\.dev\/schemas/,
		);
		expect(
			await readFile(path.join(root, 'src/events/clientReady.ts'), 'utf8'),
		).toMatch(/export const name = 'clientReady'/);
		await expect(
			readFile(path.join(root, 'eslint.config.js'), 'utf8'),
		).rejects.toThrow();
	});

	test('javascript prisma scaffold uses @prisma/client runtime import', async () => {
		const root = await makeProjectRoot();
		const manifest = createManifest({
			projectName: 'js-prisma',
			targetDir: root,
			language: 'js',
			preset: 'advanced',
			packageManager: 'npm',
			database: 'sqlite',
			orm: 'prisma',
			tooling: 'none',
			git: false,
			docker: false,
			ci: false,
			install: false,
		});

		await ensureDirectory(root);
		await writeFiles(root, renderProjectFiles(manifest));

		expect(
			await readFile(path.join(root, 'src/core/database/client.js'), 'utf8'),
		).toMatch(/from '@prisma\/client'/);
		expect(await readFile(path.join(root, 'prisma/schema.prisma'), 'utf8')).toMatch(
			/provider = "prisma-client-js"/,
		);
	});
});
