import { describe, expect, test } from 'bun:test';
import {
	resolvePackageManagerCommand,
	shouldUseShellForPackageManager,
} from '../src/commands/init.js';

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
