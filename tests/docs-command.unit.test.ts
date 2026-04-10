import { describe, expect, it, vi } from 'vitest';
import { DOCS_SITE_URL } from '../src/constants.js';
import { BufferedOutput } from './support/buffered-output.js';

const spawnMock = vi.hoisted(() =>
	vi.fn(() => ({
		unref: vi.fn(),
	})),
);

vi.mock('node:child_process', () => ({
	spawn: spawnMock,
}));

describe('docs command (in-process)', () => {
	it('logs docs URL and spawns OS open helper', async () => {
		spawnMock.mockClear();
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
		const cmd = (spawnMock.mock.calls[0] as string[] | undefined)?.[0];
		expect(cmd).toBeTypeOf('string');
		expect(['open', 'xdg-open', 'cmd']).toContain(cmd!);
	});
});
