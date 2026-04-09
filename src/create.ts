#!/usr/bin/env node
import { runCli } from './cli.js';
import { normalizeCreateArgv } from './utils/create-entry.js';
import { CliError } from './utils/errors.js';
import { Output } from './utils/format.js';

await (async () => {
	try {
		const argv = normalizeCreateArgv(process.argv.slice(2));
		await runCli(argv);
	} catch (error) {
		if (error instanceof CliError) {
			const output = new Output();
			output.error(error.message);
			process.exitCode = error.exitCode;
			return;
		}

		throw error;
	}
})();
