import { access } from 'node:fs/promises';
import path from 'node:path';
import { constants as fsConstants } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { runForgeloop } from './harness/cli.js';
import { makeTempProjectParent, removeDir } from './harness/project.js';

async function scaffoldModular(parent: string, name: string) {
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
	return path.join(parent, name);
}

describe('add / remove (spawned)', () => {
	it('adds then removes a slash command module', async () => {
		const parent = await makeTempProjectParent();
		try {
			const name = 'fl-add-remove';
			const root = await scaffoldModular(parent, name);
			const cmdPath = path.join(root, 'src', 'commands', 'vitest_cmd.ts');

			const add = await runForgeloop(
				[
					'add',
					'command',
					'vitest_cmd',
					'--description',
					'Vitest fixture',
					'--dir',
					root,
				],
				{ cwd: root },
			);
			expect(add.exitCode).toBe(0);
			await access(cmdPath, fsConstants.F_OK);

			const rm = await runForgeloop(
				['remove', 'command', 'vitest_cmd', '--dir', root],
				{ cwd: root },
			);
			expect(rm.exitCode).toBe(0);
			await expect(access(cmdPath, fsConstants.F_OK)).rejects.toMatchObject({
				code: 'ENOENT',
			});
		} finally {
			await removeDir(parent);
		}
	});

	it('refuses generator workflows on basic preset projects', async () => {
		const parent = await makeTempProjectParent();
		try {
			const name = 'fl-basic-only';
			const { exitCode } = await runForgeloop(
				[
					'init',
					name,
					'--yes',
					'--dir',
					parent,
					'--preset',
					'basic',
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

			const root = path.join(parent, name);
			const add = await runForgeloop(
				['add', 'command', 'x', '--description', 'y', '--dir', root],
				{ cwd: root },
			);
			expect(add.exitCode).toBe(1);
			expect(add.stderr).toMatch(/basic/i);
		} finally {
			await removeDir(parent);
		}
	});
});
