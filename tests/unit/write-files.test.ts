import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { writeFiles } from '../../src/utils/fs.js';
import { CliError } from '../../src/utils/errors.js';

describe('writeFiles', () => {
	it('refuses duplicate targets in one batch', async () => {
		const dir = await mkdtemp(path.join(os.tmpdir(), 'fl-write-'));
		try {
			await expect(
				writeFiles(dir, [
					{ path: 'a.txt', content: '1' },
					{ path: 'a.txt', content: '2' },
				]),
			).rejects.toThrow(CliError);
		} finally {
			await rm(dir, { recursive: true, force: true });
		}
	});

	it('refuses overwriting an existing file', async () => {
		const dir = await mkdtemp(path.join(os.tmpdir(), 'fl-write-'));
		try {
			await writeFiles(dir, [{ path: 'keep.txt', content: 'x' }]);
			await expect(
				writeFiles(dir, [{ path: 'keep.txt', content: 'y' }]),
			).rejects.toThrow(CliError);
		} finally {
			await rm(dir, { recursive: true, force: true });
		}
	});
});
