import { CliError } from './errors.js';
import type { ParsedArgs } from '../types.js';

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

export function getBooleanFlag(flags: ParsedArgs['flags'], key: string) {
	return flags.get(key) === true;
}
