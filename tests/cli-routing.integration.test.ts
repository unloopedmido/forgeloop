import { describe, expect, it } from 'vitest';
import { runCreateForgeloop, runForgeloop, stripAnsi } from './harness/cli.js';

describe('CLI routing (spawned)', () => {
	it('prints version for `version` subcommand', async () => {
		const { exitCode, stdout, stderr } = await runForgeloop(['version']);
		expect(exitCode).toBe(0);
		expect(stderr).toBe('');
		expect(stripAnsi(stdout)).toMatch(/create-forgeloop\s+\d+\.\d+\.\d+/);
	});

	it('prints version for --version before dispatch', async () => {
		const { exitCode, stdout } = await runForgeloop(['--version']);
		expect(exitCode).toBe(0);
		expect(stripAnsi(stdout)).toMatch(/create-forgeloop/);
	});

	it('renders top-level help for help subcommand', async () => {
		const { exitCode, stdout, stderr } = await runForgeloop(['help']);
		expect(exitCode).toBe(0);
		expect(stderr).toBe('');
		const text = stripAnsi(stdout);
		expect(text).toMatch(/forgeloop/i);
		expect(text).toMatch(/init/);
	});

	it('renders command help for init --help', async () => {
		const { exitCode, stdout, stderr } = await runForgeloop([
			'init',
			'--help',
		]);
		expect(exitCode).toBe(0);
		expect(stderr).toBe('');
		const text = stripAnsi(stdout);
		expect(text).toMatch(/init/);
		expect(text).toMatch(/--yes|--package-manager|package-manager/);
	});

	it('fails unknown commands with non-zero exit and guidance', async () => {
		const { exitCode, stdout, stderr } = await runForgeloop(['not-a-command']);
		expect(exitCode).toBe(1);
		expect(stdout).toBe('');
		expect(stderr).toContain('Unknown command');
		expect(stderr).toContain('forgeloop help');
	});

	it('maps create-forgeloop bare project name to init', async () => {
		const { exitCode, stderr } = await runCreateForgeloop([
			'--help',
		]);
		expect(exitCode).toBe(0);
		expect(stderr).toBe('');
	});
});
