import { describe, expect, test } from 'bun:test';
import { expandShortFlags, parseArgs } from '../src/utils/args.js';
import { normalizeCreateArgv } from '../src/utils/create-entry.js';
import { resolveProjectDir } from '../src/utils/project.js';
import { CliError } from '../src/utils/errors.js';
import {
	normalizeProjectName,
	validateProjectName,
} from '../src/utils/project-name.js';

function parseCli(argv: string[]) {
	return parseArgs(expandShortFlags(argv));
}

describe('CLI args and validation', () => {
	test('parseArgs supports long flags and positionals', () => {
		const parsed = parseCli([
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
		const parsed = parseCli(['doctor', '--dir']);
		expect(() => resolveProjectDir(parsed)).toThrow(CliError);
	});

	test('expandShortFlags maps -h -V -y and -d', () => {
		expect(expandShortFlags(['-h'])).toEqual(['--help']);
		expect(expandShortFlags(['-V'])).toEqual(['--version']);
		expect(expandShortFlags(['-y'])).toEqual(['--yes']);
		expect(expandShortFlags(['-d', './proj'])).toEqual(['--dir', './proj']);
	});

	test('parseCli treats short flags like long flags', () => {
		const parsed = parseCli(['doctor', '-d', '/tmp/bot']);
		expect(parsed.flags.get('dir')).toBe('/tmp/bot');
	});

	test('boolean flags reject stray values', () => {
		expect(() =>
			parseCli(['init', 'x', '--docker', 'oops']),
		).toThrow(CliError);
	});

	test('create entry suggests likely command typos', () => {
		expect(() => normalizeCreateArgv(['int'])).toThrow(/Did you mean "init"/);
	});

	test('create entry still maps valid project names to init', () => {
		expect(normalizeCreateArgv(['alpha-bot'])).toEqual(['init', 'alpha-bot']);
	});
});
