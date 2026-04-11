import { describe, expect, it, vi } from 'vitest';
import { DOCS_SITE_URL } from '../src/constants.js';
import { BufferedOutput } from './support/buffered-output.js';

const spawnMock = vi.hoisted(() => vi.fn());

vi.mock('node:child_process', () => ({
	spawn: spawnMock,
}));

describe('docs command (in-process)', () => {
	it('logs docs URL and launches a detached open helper', async () => {
		const unref = vi.fn();
		spawnMock.mockReset();
		spawnMock.mockImplementation(() => ({
			once(event: string, cb: () => void) {
				if (event === 'spawn') {
					cb();
				}
				return this;
			},
			unref,
		}));
		const { runDocs } = await import('../src/commands/docs.js');
		const out = new BufferedOutput();
		await runDocs(
			{
				command: 'docs',
				subcommands: [],
				positionals: ['docs'],
				flags: new Map(),
			},
			out,
		);

		expect(out.logs.some((l) => l.includes(DOCS_SITE_URL))).toBe(true);
		expect(spawnMock).toHaveBeenCalled();
		expect(unref).toHaveBeenCalled();
		const firstCall = spawnMock.mock.calls[0];
		expect(firstCall).toBeDefined();
		expect(firstCall![2]).toMatchObject({
			detached: true,
			stdio: 'ignore',
			shell: false,
		});
		expect(firstCall![1]).toContain(DOCS_SITE_URL);
	});

	it('warns with the URL when the open helper throws', async () => {
		spawnMock.mockReset();
		spawnMock.mockImplementation(() => ({
			once(event: string, cb: () => void) {
				if (event === 'error') {
					cb();
				}
				return this;
			},
			unref: vi.fn(),
		}));
		vi.resetModules();
		const { runDocs } = await import('../src/commands/docs.js');
		const out = new BufferedOutput();
		await runDocs(
			{
				command: 'docs',
				subcommands: [],
				positionals: ['docs'],
				flags: new Map(),
			},
			out,
		);

		expect(out.logs.some((l) => l.startsWith('warn:'))).toBe(true);
		expect(out.logs.some((l) => l.includes(DOCS_SITE_URL))).toBe(true);
	});
});
