import { afterEach, describe, expect, it } from 'vitest';
import { runCli } from '../src/cli.js';

function captureStdStreams() {
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

describe('runCli (in-process)', () => {
	it('handles version and sets no error exit', async () => {
		const cap = captureStdStreams();
		try {
			await runCli(['version']);
		} finally {
			cap.restore();
		}
		expect(cap.getStderr()).toBe('');
		expect(cap.getStdout()).toMatch(/create-forgeloop/);
		expect(process.exitCode == null || process.exitCode === 0).toBe(true);
	});

	it('routes init --help without errors', async () => {
		const cap = captureStdStreams();
		try {
			await runCli(['init', '--help']);
		} finally {
			cap.restore();
		}
		expect(process.exitCode == null || process.exitCode === 0).toBe(true);
		expect(cap.getStderr()).toBe('');
		expect(cap.getStdout()).toMatch(/init/i);
	});

	it('maps CliError to stderr and exitCode', async () => {
		const cap = captureStdStreams();
		try {
			await runCli([
				'init',
				'x',
				'--yes',
				'--database',
				'none',
				'--orm',
				'prisma',
			]);
		} finally {
			cap.restore();
		}
		expect(cap.getStderr()).toContain('When --database is "none"');
		expect(process.exitCode).toBe(1);
	});

	it('reports unknown commands via CliError path', async () => {
		const cap = captureStdStreams();
		try {
			await runCli(['not-real']);
		} finally {
			cap.restore();
		}
		expect(cap.getStderr()).toContain('Unknown command');
		expect(process.exitCode).toBe(1);
	});
});
