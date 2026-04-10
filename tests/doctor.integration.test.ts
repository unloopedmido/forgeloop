import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { runForgeloop } from './harness/cli.js';
import { makeTempProjectParent, removeDir } from './harness/project.js';
import type { DoctorJsonReport } from '../src/doctor/render-json.js';

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

describe('doctor (spawned)', () => {
	it('emits structured JSON with project metadata', async () => {
		const parent = await makeTempProjectParent();
		try {
			const name = 'fl-doctor-json';
			const root = await scaffoldModular(parent, name);

			const { exitCode, stdout, stderr } = await runForgeloop(
				['doctor', '--dir', root, '--json', '--checks', 'config'],
				{ cwd: root },
			);

			expect(exitCode).toBe(0);
			expect(stderr).toBe('');
			const report = JSON.parse(stdout) as DoctorJsonReport;
			expect(report.project.name).toBe(name);
			expect(report.project.preset).toBe('modular');
			expect(report.summary).toMatchObject({
				errors: expect.any(Number),
				warnings: expect.any(Number),
				infos: expect.any(Number),
			});
			expect(Array.isArray(report.issues)).toBe(true);
		} finally {
			await removeDir(parent);
		}
	});

	it('rejects unknown --checks groups', async () => {
		const parent = await makeTempProjectParent();
		try {
			const name = 'fl-doctor-checks';
			const root = await scaffoldModular(parent, name);

			const { exitCode, stderr } = await runForgeloop(
				['doctor', '--dir', root, '--checks', 'not-a-real-group'],
				{ cwd: root },
			);

			expect(exitCode).toBe(1);
			expect(stderr).toContain('Unknown doctor check group');
		} finally {
			await removeDir(parent);
		}
	});

	it('--fix creates .env from .env.example when missing', async () => {
		const parent = await makeTempProjectParent();
		try {
			const name = 'fl-doctor-fix';
			const root = await scaffoldModular(parent, name);

			const { exitCode, stderr } = await runForgeloop(
				[
					'doctor',
					'--dir',
					root,
					'--fix',
					'--json',
					'--checks',
					'config',
				],
				{ cwd: root },
			);

			expect(exitCode).toBe(0);
			expect(stderr).toContain('.env');
			const envText = await readFile(path.join(root, '.env'), 'utf8');
			expect(envText.length).toBeGreaterThan(0);
		} finally {
			await removeDir(parent);
		}
	});

	it('--strict can fail when warnings exist (legacy manifest)', async () => {
		const parent = await makeTempProjectParent();
		try {
			const name = 'fl-doctor-legacy';
			const root = await scaffoldModular(parent, name);
			await writeFile(
				path.join(root, 'forgeloop.json'),
				JSON.stringify(
					{
						manifestVersion: 1,
						runtime: 'node',
						framework: 'discord.js',
						projectName: name,
						createdAt: new Date().toISOString(),
						language: 'ts',
						preset: 'modular',
						packageManager: 'npm',
						paths: {
							commandsDir: 'src/commands',
							eventsDir: 'src/events',
						},
						features: {
							docker: false,
							ci: false,
							database: null,
						},
					},
					null,
					2,
				),
				'utf8',
			);

			const { exitCode } = await runForgeloop(
				['doctor', '--dir', root, '--strict'],
				{ cwd: root },
			);

			expect(exitCode).toBe(1);
		} finally {
			await removeDir(parent);
		}
	});
});
