import { describe, expect, test } from 'bun:test';
import { parseArgs } from '../src/utils/args.js';
import { normalizeCreateArgv } from '../src/utils/create-entry.js';
import { resolveProjectDir } from '../src/utils/project.js';
import { CliError } from '../src/utils/errors.js';
import {
	normalizeProjectName,
	validateProjectName,
} from '../src/utils/project-name.js';

describe('CLI args and validation', () => {
	test('parseArgs supports long flags and positionals', () => {
		const parsed = parseArgs([
			'init',
			'alpha',
			'--language',
			'ts',
			'--docker',
			'--dir=./bots/alpha',
		]);
		expect(parsed.command).toBe('init');
		expect(parsed.subcommands).toEqual(['alpha']);
		expect(parsed.flags.get('language')).toBe('ts');
		expect(parsed.flags.get('docker')).toBe(true);
		expect(parsed.flags.get('dir')).toBe('./bots/alpha');
	});

	test('project name validation rejects invalid names', () => {
		expect(validateProjectName('bad project')).toBe(
			'Use letters, numbers, hyphens, or underscores.',
		);
		expect(normalizeProjectName('alpha_bot')).toBe('alpha_bot');
	});

	test('create entry maps bare project args to init', () => {
		expect(normalizeCreateArgv(['alpha-bot'])).toEqual(['init', 'alpha-bot']);
		expect(normalizeCreateArgv(['--language', 'ts'])).toEqual([
			'init',
			'--language',
			'ts',
		]);
		expect(normalizeCreateArgv(['help'])).toEqual(['help']);
		expect(normalizeCreateArgv(['add', 'command', 'ping'])).toEqual([
			'add',
			'command',
			'ping',
		]);
	});

	test('resolveProjectDir rejects --dir with no value', () => {
		const parsed = parseArgs(['doctor', '--dir']);
		expect(() => resolveProjectDir(parsed)).toThrow(CliError);
	});
});
