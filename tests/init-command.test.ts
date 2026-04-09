import { describe, expect, test } from 'bun:test';
import { access } from 'node:fs/promises';
import path from 'node:path';
import {
	runInit,
} from '../src/commands/init.js';
import {
	resolvePackageManagerCommand,
	shouldUseShellForPackageManager,
} from '../src/utils/package-manager.js';
import { parseArgs } from '../src/utils/args.js';
import { BufferedOutput, makeProjectRoot } from './test-helpers.js';

describe('resolvePackageManagerCommand', () => {
	test('uses cmd shims for shell package managers on Windows', () => {
		expect(resolvePackageManagerCommand('npm', 'win32')).toBe('npm.cmd');
		expect(resolvePackageManagerCommand('pnpm', 'win32')).toBe('pnpm.cmd');
		expect(resolvePackageManagerCommand('yarn', 'win32')).toBe('yarn.cmd');
	});

	test('keeps bun unchanged on Windows', () => {
		expect(resolvePackageManagerCommand('bun', 'win32')).toBe('bun');
	});

	test('keeps package manager names unchanged on non-Windows platforms', () => {
		expect(resolvePackageManagerCommand('npm', 'linux')).toBe('npm');
		expect(resolvePackageManagerCommand('pnpm', 'darwin')).toBe('pnpm');
	});
});

describe('shouldUseShellForPackageManager', () => {
	test('uses a shell for cmd-backed package managers on Windows', () => {
		expect(shouldUseShellForPackageManager('npm', 'win32')).toBe(true);
		expect(shouldUseShellForPackageManager('pnpm', 'win32')).toBe(true);
		expect(shouldUseShellForPackageManager('yarn', 'win32')).toBe(true);
	});

	test('keeps bun off the shell on Windows', () => {
		expect(shouldUseShellForPackageManager('bun', 'win32')).toBe(false);
	});

	test('does not use a shell on non-Windows platforms', () => {
		expect(shouldUseShellForPackageManager('npm', 'linux')).toBe(false);
		expect(shouldUseShellForPackageManager('pnpm', 'darwin')).toBe(false);
	});
});

describe('runInit', () => {
	test('supports bun starter scaffolding', async () => {
		const root = await makeProjectRoot();
		const output = new BufferedOutput();
		const args = parseArgs([
			'init',
			'alpha',
			'--dir',
			root,
			'--language',
			'js',
			'--preset',
			'advanced',
			'--package-manager',
			'bun',
			'--database',
			'none',
			'--orm',
			'none',
			'--tooling',
			'none',
			'--yes',
		]);

		await expect(runInit(args, output)).resolves.toBeUndefined();
		expect(output.errors).toEqual([]);
	});

	test('dry-run previews scaffold without writing files', async () => {
		const root = await makeProjectRoot();
		const target = path.join(root, 'dry-run-target');
		const output = new BufferedOutput();
		const args = parseArgs([
			'init',
			'alpha',
			'--dir',
			target,
			'--language',
			'ts',
			'--preset',
			'modular',
			'--package-manager',
			'npm',
			'--database',
			'none',
			'--orm',
			'none',
			'--tooling',
			'none',
			'--dry-run',
			'--yes',
		]);

		await expect(runInit(args, output)).resolves.toBeUndefined();
		expect(output.errors).toEqual([]);
		expect(
			output.logs.some((line) => line.includes('Dry run enabled')),
		).toBe(true);
		await expect(access(target)).rejects.toThrow();
	});
});
