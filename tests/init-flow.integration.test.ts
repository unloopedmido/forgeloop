import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { runForgeloop } from './harness/cli.js';
import { makeTempProjectParent, removeDir } from './harness/project.js';

describe('init flow (spawned)', () => {
	it('scaffolds a modular TypeScript project with expected invariants', async () => {
		const parent = await makeTempProjectParent();
		try {
			const name = 'fl-modular-bot';
			const { exitCode, stderr } = await runForgeloop(
				[
					'init',
					name,
					'--yes',
					'--dir',
					parent,
					'--preset',
					'modular',
					'--language',
					'ts',
					'--database',
					'none',
					'--orm',
					'none',
					'--tooling',
					'none',
				],
				{ cwd: parent },
			);

			expect(exitCode).toBe(0);
			expect(stderr).toBe('');

			const root = path.join(parent, name);
			const pkgRaw = await readFile(path.join(root, 'package.json'), 'utf8');
			const pkg = JSON.parse(pkgRaw) as { name?: string; dependencies?: object };
			expect(pkg.name).toBe(name);
			expect(pkg.dependencies).toBeDefined();

			await readFile(path.join(root, 'forgeloop.config.mjs'), 'utf8');
			await readFile(path.join(root, 'src', 'commands', 'ping.ts'), 'utf8');
		} finally {
			await removeDir(parent);
		}
	});

	it('rejects incompatible --database none with --orm prisma', async () => {
		const parent = await makeTempProjectParent();
		try {
			const { exitCode, stderr } = await runForgeloop(
				[
					'init',
					'badorm',
					'--yes',
					'--dir',
					parent,
					'--database',
					'none',
					'--orm',
					'prisma',
				],
				{ cwd: parent },
			);
			expect(exitCode).toBe(1);
			expect(stderr).toContain('When --database is "none"');
		} finally {
			await removeDir(parent);
		}
	});
});
