import { describe, expect, test } from 'bun:test';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { CONFIG_FILE } from '../src/constants.js';
import { renderProjectFiles } from '../src/generators/templates.js';
import { createManifest, loadManifest } from '../src/manifest.js';
import { ensureDirectory, writeFiles } from '../src/utils/fs.js';
import { makeProjectRoot } from './test-helpers.js';

describe('publish readiness', () => {
	test('writeFiles rejects collisions before creating any new files', async () => {
		const root = await makeProjectRoot();
		await ensureDirectory(root);
		await writeFile(path.join(root, 'existing.txt'), 'keep\n', 'utf8');

		await expect(
			writeFiles(root, [
				{ path: 'new.txt', content: 'new\n' },
				{ path: 'existing.txt', content: 'replace\n' },
			]),
		).rejects.toThrow(/Refusing to overwrite existing file/);

		await expect(readFile(path.join(root, 'new.txt'), 'utf8')).rejects.toThrow();
		expect(await readFile(path.join(root, 'existing.txt'), 'utf8')).toBe('keep\n');
	});

	test('generated TypeScript CI runs typecheck and build', async () => {
		const manifest = createManifest({
			projectName: 'ci-ready',
			targetDir: '/tmp/ci-ready',
			language: 'ts',
			preset: 'modular',
			packageManager: 'npm',
			database: 'none',
			orm: 'none',
			tooling: 'eslint-prettier',
			git: true,
			docker: false,
			ci: true,
			install: false,
		});

		const files = renderProjectFiles(manifest);
		const packageJson = JSON.parse(
			files.find((file) => file.path === 'package.json')!.content,
		);
		const ciWorkflow = files.find(
			(file) => file.path === '.github/workflows/ci.yml',
		)!.content;

		expect(packageJson.scripts.typecheck).toBe('tsc --noEmit');
		expect(packageJson.scripts.build).toBe('tsc');
		expect(ciWorkflow).toMatch(/npm run typecheck/);
		expect(ciWorkflow).toMatch(/npm run build/);
	});

	test('loadManifest rejects unsupported package managers in config files', async () => {
		const root = await makeProjectRoot();
		const manifest = createManifest({
			projectName: 'unsupported-pm',
			targetDir: root,
			language: 'ts',
			preset: 'modular',
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
		await writeFile(
			path.join(root, CONFIG_FILE),
			`export default ${JSON.stringify(
				{
					...manifest,
					packageManager: 'unsupported-package-manager',
				},
				null,
				2,
			)};\n`,
			'utf8',
		);

		await expect(loadManifest(root)).rejects.toThrow(
			/Invalid manifest\.packageManager/,
		);
	});
});
