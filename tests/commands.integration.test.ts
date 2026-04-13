import path from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';
import { describe, expect, it, vi } from 'vitest';
import { runForgeloop } from './harness/cli.js';
import {
	installDiscordJsStub,
	makeTempProjectParent,
	removeDir,
} from './harness/project.js';
import {
	applicationCommandsRoute,
	assertDeployTargetFlags,
	diffCommandPayload,
	putDiscordCommands,
	resolveSyncTarget,
} from '../src/lib/discord-app-commands.js';
import { expandShortFlags, parseArgs } from '../src/utils/args.js';
import type { ParsedArgs } from '../src/types.js';

async function scaffold(
	parent: string,
	name: string,
	preset: 'basic' | 'modular',
	language: 'ts' | 'js' = 'ts',
) {
	const { exitCode, stderr } = await runForgeloop(
		[
			'init',
			name,
			'--yes',
			'--dir',
			parent,
			'--preset',
			preset,
			'--language',
			language,
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

describe('commands (spawned)', () => {
	it('rejects deploy when both --global and --guild are set', async () => {
		const { exitCode, stderr } = await runForgeloop([
			'commands',
			'deploy',
			'--global',
			'--guild',
		]);
		expect(exitCode).toBe(1);
		expect(stderr).toContain('only one of --global or --guild');
	});

	it('explains that slash command tooling needs modular/advanced', async () => {
		const parent = await makeTempProjectParent();
		try {
			const root = await scaffold(parent, 'fl-cmd-basic', 'basic');
			const { exitCode, stderr } = await runForgeloop(
				['commands', 'list', '--dir', root],
				{ cwd: root },
			);
			expect(exitCode).toBe(1);
			expect(stderr).toMatch(/basic/i);
		} finally {
			await removeDir(parent);
		}
	});

	it('tells users to install dependencies before commands list', async () => {
		const parent = await makeTempProjectParent();
		try {
			const root = await scaffold(parent, 'fl-cmd-no-deps', 'modular');
			const { exitCode, stderr } = await runForgeloop(
				['commands', 'list', '--dir', root],
				{ cwd: root },
			);
			expect(exitCode).toBe(1);
			expect(stderr).toMatch(/discord\.js|node_modules|install/i);
		} finally {
			await removeDir(parent);
		}
	});

	it(
		'lists local slash command names after dependencies are installed',
		async () => {
			const parent = await makeTempProjectParent();
			try {
				const root = await scaffold(
					parent,
					'fl-cmd-with-deps',
					'modular',
					'js',
				);
				await installDiscordJsStub(root);

				const { exitCode, stdout, stderr } = await runForgeloop(
					['commands', 'list', '--dir', root],
					{ cwd: root },
				);
				expect(exitCode).toBe(0);
				expect(stderr).toBe('');
				expect(stdout).toMatch(/ping/i);
			} finally {
				await removeDir(parent);
			}
		},
		180_000,
	);

	it(
		'lists commands even when imported modules log to stdout',
		async () => {
			const parent = await makeTempProjectParent();
			try {
				const root = await scaffold(
					parent,
					'fl-cmd-stdout-noise',
					'modular',
					'js',
				);
				await installDiscordJsStub(root);
				const pingPath = path.join(root, 'src', 'commands', 'ping.js');
				const pingSource = await readFile(pingPath, 'utf8');
				await writeFile(
					pingPath,
					`console.log('top-level import noise');\n${pingSource}`,
					'utf8',
				);

				const { exitCode, stdout, stderr } = await runForgeloop(
					['commands', 'list', '--dir', root],
					{ cwd: root },
				);
				expect(exitCode).toBe(0);
				expect(stderr).toBe('');
				expect(stdout).toMatch(/ping/i);
			} finally {
				await removeDir(parent);
			}
		},
		180_000,
	);
});

describe('Discord deploy helpers (in-process)', () => {
	it('builds application command routes for guild and global targets', () => {
		expect(applicationCommandsRoute('client', 'guild1')).toContain(
			'/applications/client/guilds/guild1/commands',
		);
		expect(applicationCommandsRoute('client')).toContain(
			'/applications/client/commands',
		);
		expect(applicationCommandsRoute('cli ent')).toContain(
			encodeURIComponent('cli ent'),
		);
	});

	it('resolveSyncTarget respects flags and NODE_ENV default', () => {
		const guildArgs = parseArgs(
			expandShortFlags(['commands', 'deploy', '--guild']),
		) as ParsedArgs;
		expect(resolveSyncTarget(guildArgs)).toBe('guild');

		const globalArgs = parseArgs(
			expandShortFlags(['commands', 'deploy', '--global']),
		) as ParsedArgs;
		expect(resolveSyncTarget(globalArgs)).toBe('global');

		const noTarget = parseArgs(
			expandShortFlags(['commands', 'deploy']),
		) as ParsedArgs;
		const prev = process.env.NODE_ENV;
		process.env.NODE_ENV = 'production';
		expect(resolveSyncTarget(noTarget)).toBe('global');
		process.env.NODE_ENV = 'development';
		expect(resolveSyncTarget(noTarget)).toBe('guild');
		process.env.NODE_ENV = prev;
	});

	it('putDiscordCommands uses fetch and surfaces API errors', async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			status: 200,
			statusText: 'OK',
		});
		vi.stubGlobal('fetch', fetchMock);

		try {
			await putDiscordCommands(
				'https://discord.com/api/v10/applications/x/commands',
				'token',
				[],
			);
			expect(fetchMock).toHaveBeenCalledTimes(1);
			const [, init] = fetchMock.mock.calls[0]!;
			expect(init.method).toBe('PUT');
			expect(init.headers.Authorization).toBe('Bot token');
		} finally {
			vi.unstubAllGlobals();
		}
	});

	it('assertDeployTargetFlags rejects conflicting targets', () => {
		const bad = parseArgs(
			expandShortFlags(['commands', 'deploy', '--guild', '--global']),
		) as ParsedArgs;
		expect(() => assertDeployTargetFlags(bad)).toThrow(/only one/);
	});

	it('diffCommandPayload ignores Discord readonly fields and reports drift by name', () => {
		expect(
			diffCommandPayload(
				[
					{ name: 'ping', description: 'Ping the bot', type: 1 },
					{ name: 'local-only', description: 'Only here', type: 1 },
				],
				[
					{
						id: '123',
						application_id: '456',
						version: '789',
						name: 'ping',
						description: 'Ping the bot',
						type: 1,
					},
					{ id: '999', name: 'remote-only', description: 'Only there', type: 1 },
				],
			),
		).toEqual({
			localOnly: ['local-only'],
			remoteOnly: ['remote-only'],
			changed: [],
			unchanged: ['ping'],
		});
	});
});
