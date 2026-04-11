import { runCli } from '../../src/cli.js';
import { normalizeCreateArgv } from '../../src/utils/create-entry.js';
import { CliError } from '../../src/utils/errors.js';
import { Output } from '../../src/utils/format.js';

export type RunCliOptions = {
	cwd?: string;
	env?: NodeJS.ProcessEnv;
};

export type CliResult = {
	exitCode: number | null;
	stdout: string;
	stderr: string;
};

let cliRunQueue = Promise.resolve();

/**
 * Runs the CLI entrypoints in-process while serializing global mutations
 * (`cwd`, `env`, stdio monkeypatching, `process.exitCode`) across tests.
 */
export function runForgeloop(
	args: string[],
	options: RunCliOptions = {},
): Promise<CliResult> {
	return enqueueCliRun(() => invokeCli(args, options));
}

export function runCreateForgeloop(
	args: string[],
	options: RunCliOptions = {},
): Promise<CliResult> {
	return enqueueCliRun(() => invokeCreateCli(args, options));
}

function enqueueCliRun(task: () => Promise<CliResult>): Promise<CliResult> {
	const run = cliRunQueue.then(task, task);
	cliRunQueue = run.then(
		() => undefined,
		() => undefined,
	);
	return run;
}

async function invokeCli(
	args: string[],
	{ cwd, env }: RunCliOptions,
): Promise<CliResult> {
	return withCapturedCliState({ cwd, env }, async () => {
		await runCli(args);
	});
}

async function invokeCreateCli(
	args: string[],
	{ cwd, env }: RunCliOptions,
): Promise<CliResult> {
	return withCapturedCliState({ cwd, env }, async () => {
		try {
			const argv = normalizeCreateArgv(args);
			await runCli(argv);
		} catch (error) {
			if (error instanceof CliError) {
				new Output().error(error.message);
				process.exitCode = error.exitCode;
				return;
			}

			throw error;
		}
	});
}

async function withCapturedCliState(
	{ cwd, env }: RunCliOptions,
	run: () => Promise<void>,
): Promise<CliResult> {
	const stdoutChunks: string[] = [];
	const stderrChunks: string[] = [];
	const originalStdoutWrite = process.stdout.write.bind(process.stdout);
	const originalStderrWrite = process.stderr.write.bind(process.stderr);
	const originalCwd = process.cwd();
	const originalExitCode = process.exitCode;
	const originalEnv = new Map<string, string | undefined>();

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

	if (cwd) {
		process.chdir(cwd);
	}

	if (env) {
		for (const [key, value] of Object.entries(env)) {
			originalEnv.set(key, process.env[key]);
			if (value === undefined) {
				delete process.env[key];
			} else {
				process.env[key] = value;
			}
		}
	}

	process.exitCode = undefined;

	try {
		await run();
		const exitCode = process.exitCode ?? 0;
		return {
			exitCode,
			stdout: stdoutChunks.join(''),
			stderr: stderrChunks.join(''),
		};
	} finally {
		process.stdout.write = originalStdoutWrite;
		process.stderr.write = originalStderrWrite;
		process.exitCode = originalExitCode;
		process.chdir(originalCwd);
		for (const [key, value] of originalEnv) {
			if (value === undefined) {
				delete process.env[key];
			} else {
				process.env[key] = value;
			}
		}
	}
}

export function stripAnsi(s: string) {
	// eslint-disable-next-line no-control-regex
	return s.replace(/\u001B\[[0-9;]*m/g, '');
}
