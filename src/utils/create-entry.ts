import { CliError } from './errors.js';
import {
	COMMAND_CANDIDATES,
	CREATE_DIRECT_COMMANDS,
} from '../commands/registry.js';

/** Common mistakes when typing a command instead of a project name (create-* UX). */
const TYPO_TO_COMMAND: Record<string, string> = {
	int: 'init',
	hel: 'help',
	hlp: 'help',
	inf: 'info',
	depl: 'deploy',
	doc: 'doctor',
};

function levenshtein(a: string, b: string) {
	const m = a.length;
	const n = b.length;
	const dp: number[][] = Array.from({ length: m + 1 }, () =>
		new Array<number>(n + 1).fill(0),
	);

	for (let i = 0; i <= m; i += 1) {
		dp[i]![0] = i;
	}
	for (let j = 0; j <= n; j += 1) {
		dp[0]![j] = j;
	}

	for (let i = 1; i <= m; i += 1) {
		for (let j = 1; j <= n; j += 1) {
			const cost = a[i - 1] === b[j - 1] ? 0 : 1;
			dp[i]![j] = Math.min(
				dp[i - 1]![j - 1]! + cost,
				dp[i]![j - 1]! + 1,
				dp[i - 1]![j]! + 1,
			);
		}
	}

	return dp[m]![n]!;
}

function suggestCommandForTypo(token: string): string | null {
	const lower = token.toLowerCase();
	const mapped = TYPO_TO_COMMAND[lower];
	if (mapped) {
		return mapped;
	}

	if (lower.length < 3) {
		return null;
	}

	for (const cmd of COMMAND_CANDIDATES) {
		if (levenshtein(lower, cmd) <= 1 && Math.max(lower.length, cmd.length) >= 4) {
			return cmd;
		}
	}

	return null;
}

export function normalizeCreateArgv(argv: string[]) {
	if (argv.length === 0) {
		return ['init'];
	}

	const [firstArg] = argv;
	if (firstArg && CREATE_DIRECT_COMMANDS.has(firstArg)) {
		return argv;
	}

	if (firstArg) {
		const suggestion = suggestCommandForTypo(firstArg);
		if (suggestion) {
			throw new CliError(
				`Unknown command "${firstArg}". Did you mean "${suggestion}"? Run "create-forgeloop help" for usage.`,
			);
		}
	}

	return ['init', ...argv];
}
