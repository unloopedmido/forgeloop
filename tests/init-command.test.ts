import { describe, expect, test } from 'bun:test';
import { resolvePackageManagerCommand } from '../src/commands/init.js';

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
