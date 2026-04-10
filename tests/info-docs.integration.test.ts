import path from 'node:path';
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

describe('info (spawned)', () => {
	it('prints project profile from manifest', async () => {
		const parent = await makeTempProjectParent();
		try {
			const name = 'fl-info-bot';
			const root = await scaffoldModular(parent, name);
			const { exitCode, stdout, stderr } = await runForgeloop(
				['info', '--dir', root],
				{ cwd: root },
			);
			expect(exitCode).toBe(0);
			expect(stderr).toBe('');
			expect(stdout).toContain(name);
			expect(stdout).toMatch(/modular/i);
		} finally {
			await removeDir(parent);
		}
	});
});
