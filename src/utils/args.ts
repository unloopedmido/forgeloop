import { CliError } from './errors.js';
import type { ParsedArgs } from '../types.js';

/** Flags that must be boolean (no value) or explicit true/false. */
const BOOLEAN_FLAG_KEYS = new Set([
	'ci',
	'docker',
	'git',
	'global',
	'guild',
	'help',
	'install',
	'on',
	'once',
	'sync',
	'version',
	'yes',
]);

/**
 * Expands a small set of short flags before long-flag parsing.
 * Supported: -h/--help, -V/--version, -y/--yes, -d <path>/--dir
 */
export function expandShortFlags(argv: string[]): string[] {
	const out: string[] = [];

	for (let index = 0; index < argv.length; index += 1) {
		const token = argv[index];
		if (!token) {
			continue;
		}

		if (!token.startsWith('-') || token.startsWith('--')) {
			out.push(token);
			continue;
		}

		if (token === '-h' || token === '-help') {
			out.push('--help');
			continue;
		}

		if (token === '-V') {
			out.push('--version');
			continue;
		}

		if (token === '-y') {
			out.push('--yes');
			continue;
		}

		if (token === '-d') {
			const next = argv[index + 1];
			if (!next || next.startsWith('-')) {
				throw new CliError('Flag "-d" requires a directory path.');
			}

			out.push('--dir', next);
			index += 1;
			continue;
		}

		throw new CliError(
			`Unknown short flag "${token}". Supported: -h, -V, -y, -d <path>`,
		);
	}

	return out;
}

function normalizeBooleanFlagValues(flags: Map<string, string | boolean>) {
	for (const key of BOOLEAN_FLAG_KEYS) {
		const value = flags.get(key);
		if (typeof value !== 'string') {
			continue;
		}

		const lower = value.toLowerCase();
		if (lower === 'true') {
			flags.set(key, true);
			continue;
		}

		if (lower === 'false') {
			flags.set(key, false);
			continue;
		}

		throw new CliError(
			`Flag "--${key}" does not take a value. Got "${value}". Use "--${key}" alone, or use "--${key}=true" or "--${key}=false".`,
		);
	}
}

export function parseArgs(argv: string[]): ParsedArgs {
	const flags = new Map<string, string | boolean>();
	const positionals: string[] = [];

	for (let index = 0; index < argv.length; index += 1) {
		const token = argv[index];
		if (!token) {
			continue;
		}

		if (token.startsWith('--')) {
			const [key, inlineValue] = token.slice(2).split('=', 2);
			if (!key) {
				throw new CliError('Encountered an empty flag name.');
			}

			if (inlineValue !== undefined) {
				flags.set(key, inlineValue);
				continue;
			}

			const next = argv[index + 1];
			if (next && !next.startsWith('-')) {
				flags.set(key, next);
				index += 1;
				continue;
			}

			flags.set(key, true);
			continue;
		}

		if (token.startsWith('-')) {
			throw new CliError(`Short flags are not supported yet: ${token}`);
		}

		positionals.push(token);
	}

	normalizeBooleanFlagValues(flags);

	return {
		command: positionals[0] ?? null,
		subcommands: positionals.slice(1),
		positionals,
		flags,
	};
}

export function getFlag(flags: ParsedArgs['flags'], key: string) {
	return flags.get(key);
}

export function getOptionalStringFlag(flags: ParsedArgs['flags'], key: string) {
	const value = flags.get(key);
	return typeof value === 'string' ? value : undefined;
}

export function getStringFlag(flags: ParsedArgs['flags'], key: string) {
	const value = flags.get(key);
	if (typeof value === 'string') {
		return value;
	}

	if (value === undefined) {
		return null;
	}

	throw new CliError(`Flag "--${key}" requires a value.`);
}

export function getRequiredStringFlag(flags: ParsedArgs['flags'], key: string) {
	const value = getStringFlag(flags, key);
	if (value === null) {
		throw new CliError(`Missing required flag "--${key}".`);
	}

	return value;
}

export function getBooleanFlag(flags: ParsedArgs['flags'], key: string) {
	return flags.get(key) === true;
}
