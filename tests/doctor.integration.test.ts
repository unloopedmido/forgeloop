import { readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { runForgeloop } from './harness/cli.js';
import { makeTempProjectParent, removeDir } from './harness/project.js';
import type { DoctorJsonReport } from '../src/doctor/run-doctor.js';

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

	it('--fix restores missing scaffold files and package entries', async () => {
		const parent = await makeTempProjectParent();
		try {
			const name = 'fl-doctor-restore';
			const root = await scaffoldModular(parent, name);
			const commandPath = path.join(root, 'src', 'commands', 'ping.ts');
			const packageJsonPath = path.join(root, 'package.json');
			const packageJson = JSON.parse(
				await readFile(packageJsonPath, 'utf8'),
			) as {
				scripts?: Record<string, string>;
				dependencies?: Record<string, string>;
			};
			delete packageJson.scripts?.start;
			delete packageJson.dependencies?.dotenv;
			await writeFile(
				packageJsonPath,
				`${JSON.stringify(packageJson, null, 2)}\n`,
				'utf8',
			);
			await rm(commandPath);

			const { exitCode, stderr } = await runForgeloop(
				[
					'doctor',
					'--dir',
					root,
					'--fix',
					'--json',
					'--checks',
					'structure,deps',
				],
				{ cwd: root },
			);

			expect(exitCode).toBe(0);
			expect(stderr).toContain('Created missing `src/commands/ping.ts`');
			expect(stderr).toContain('Added missing scripts: start.');
			expect(stderr).toContain('Added missing dependencies: dotenv.');
			expect(await readFile(commandPath, 'utf8')).toContain('ping');
			const repairedPackageJson = JSON.parse(
				await readFile(packageJsonPath, 'utf8'),
			) as {
				scripts?: Record<string, string>;
				dependencies?: Record<string, string>;
			};
			expect(repairedPackageJson.scripts?.start).toBeTruthy();
			expect(repairedPackageJson.dependencies?.dotenv).toBeTruthy();
		} finally {
			await removeDir(parent);
		}
	});

	it('--fix repairs config files that only export a named config binding', async () => {
		const parent = await makeTempProjectParent();
		try {
			const name = 'fl-doctor-config-fix';
			const root = await scaffoldModular(parent, name);
			const configPath = path.join(root, 'forgeloop.config.mjs');
			const original = await readFile(configPath, 'utf8');
			await writeFile(
				configPath,
				original.replace('export default', 'export const config ='),
				'utf8',
			);

			const { exitCode, stderr } = await runForgeloop(
				['doctor', '--dir', root, '--fix', '--json', '--checks', 'config'],
				{ cwd: root },
			);

			expect(exitCode).toBe(0);
			expect(stderr).toContain('export default `config`');
			expect(await readFile(configPath, 'utf8')).toContain(
				'export default config;',
			);
		} finally {
			await removeDir(parent);
		}
	});

	it('--strict can fail when warnings exist', async () => {
		const parent = await makeTempProjectParent();
		try {
			const name = 'fl-doctor-strict-warning';
			const root = await scaffoldModular(parent, name);
			await writeFile(
				path.join(root, '.env'),
				[
					'DISCORD_TOKEN=real-token',
					'CLIENT_ID=not-a-snowflake',
					'GUILD_ID=123456789012345678',
				].join('\n'),
				'utf8',
			);

			const { exitCode } = await runForgeloop(
				['doctor', '--dir', root, '--strict', '--checks', 'env'],
				{ cwd: root },
			);

			expect(exitCode).toBe(1);
		} finally {
			await removeDir(parent);
		}
	});
});
