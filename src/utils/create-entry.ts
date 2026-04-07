const DIRECT_COMMANDS = new Set([
	'help',
	'--help',
	'init',
	'add',
	'deploy',
	'doctor',
	'info',
]);

export function normalizeCreateArgv(argv: string[]) {
	if (argv.length === 0) {
		return ['init'];
	}

	const [firstArg] = argv;
	if (firstArg && DIRECT_COMMANDS.has(firstArg)) {
		return argv;
	}

	return ['init', ...argv];
}
