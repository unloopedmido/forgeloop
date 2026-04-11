import {
	CREATE_DIRECT_COMMANDS,
} from '../commands/registry.js';

export function normalizeCreateArgv(argv: string[]) {
	if (argv.length === 0) {
		return ['init'];
	}

	const [firstArg] = argv;
	if (firstArg && CREATE_DIRECT_COMMANDS.has(firstArg)) {
		return argv;
	}

	return ['init', ...argv];
}
