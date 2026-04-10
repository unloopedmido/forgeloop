import { describe, expect, it } from 'vitest';
import { expandShortFlags, parseArgs } from '../../src/utils/args.js';
import { normalizeCreateArgv } from '../../src/utils/create-entry.js';
import { resolveProjectDir } from '../../src/utils/project.js';
import { CliError } from '../../src/utils/errors.js';
import {
	normalizeProjectName,
	validateProjectName,
} from '../../src/utils/project-name.js';

function parseCli(argv: string[]) {
	return parseArgs(expandShortFlags(argv));
}

describe('parseArgs / expandShortFlags', () => {
	it('parses command, subcommands, and mixed flags', () => {
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

	it('expands supported short flags', () => {
		expect(expandShortFlags(['-h'])).toEqual(['--help']);
		expect(expandShortFlags(['-V'])).toEqual(['--version']);
		expect(expandShortFlags(['-y'])).toEqual(['--yes']);
		expect(expandShortFlags(['-d', './proj'])).toEqual(['--dir', './proj']);
	});

	it('maps -d onto --dir for doctor', () => {
		const parsed = parseCli(['doctor', '-d', '/tmp/bot']);
		expect(parsed.flags.get('dir')).toBe('/tmp/bot');
	});

	it('rejects boolean flags that receive stray values', () => {
		expect(() => parseCli(['init', 'x', '--docker', 'oops'])).toThrow(CliError);
	});
});

describe('create entry argv', () => {
	it('maps bare project names to init', () => {
		expect(normalizeCreateArgv(['alpha-bot'])).toEqual(['init', 'alpha-bot']);
	});

	it('passes through explicit subcommands', () => {
		expect(normalizeCreateArgv(['add', 'command', 'ping'])).toEqual([
			'add',
			'command',
			'ping',
		]);
	});

	it('suggests init for likely typos', () => {
		expect(() => normalizeCreateArgv(['int'])).toThrow(/Did you mean "init"/);
	});
});

describe('project dir resolution', () => {
	it('throws when --dir has no value', () => {
		const parsed = parseCli(['doctor', '--dir']);
		expect(() => resolveProjectDir(parsed)).toThrow(CliError);
	});
});

describe('project name helpers', () => {
	it('validates and normalizes names', () => {
		expect(validateProjectName('bad project')).toBe(
			'Use letters, numbers, hyphens, or underscores.',
		);
		expect(normalizeProjectName('alpha_bot')).toBe('alpha_bot');
	});
});
