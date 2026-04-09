import { afterEach, describe, expect, test } from 'bun:test';
import { runCli } from '../src/cli.js';

function captureOutput() {
	const stdoutChunks: string[] = [];
	const stderrChunks: string[] = [];
	const originalStdoutWrite = process.stdout.write.bind(process.stdout);
	const originalStderrWrite = process.stderr.write.bind(process.stderr);

	process.stdout.write = ((chunk: string | Uint8Array) => {
		stdoutChunks.push(
			typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf8'),
		);
		return true;
	}) as typeof process.stdout.write;

	process.stderr.write = ((chunk: string | Uint8Array) => {
		stderrChunks.push(
			typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf8'),
		);
		return true;
	}) as typeof process.stderr.write;

	return {
		getStdout: () => stdoutChunks.join(''),
		getStderr: () => stderrChunks.join(''),
		restore: () => {
			process.stdout.write = originalStdoutWrite;
			process.stderr.write = originalStderrWrite;
		},
	};
}

afterEach(() => {
	process.exitCode = 0;
});

describe('CLI smoke behavior', () => {
	test('version command prints package version', async () => {
		const output = captureOutput();
		try {
			await runCli(['version']);
		} finally {
			output.restore();
		}

		expect(output.getStdout()).toMatch(/create-forgeloop \d+\.\d+\.\d+/);
		expect(output.getStderr()).toBe('');
	});

	test('init --help renders command help', async () => {
		const output = captureOutput();
		try {
			await runCli(['init', '--help']);
		} finally {
			output.restore();
		}

		expect(output.getStdout()).toContain('forgeloop init');
		expect(output.getStdout()).toContain('--package-manager npm|pnpm|yarn|bun');
		expect(output.getStderr()).toBe('');
	});

	test('invalid database/orm pair returns helpful error', async () => {
		const output = captureOutput();
		try {
			await runCli([
				'init',
				'alpha',
				'--yes',
				'--database',
				'none',
				'--orm',
				'prisma',
			]);
		} finally {
			output.restore();
		}

		expect(output.getStderr()).toContain(
			'When --database is "none", --orm must also be "none".',
		);
		expect(process.exitCode).toBe(1);
	});
});
