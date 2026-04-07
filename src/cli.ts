import { renderHelp } from './commands/help.js';
import { runAdd } from './commands/add.js';
import { runDoctor } from './commands/doctor.js';
import { runInfo } from './commands/info.js';
import { runInit } from './commands/init.js';
import { parseArgs } from './utils/args.js';
import { CliError } from './utils/errors.js';
import { Output } from './utils/format.js';

export async function runCli(argv: string[]) {
	const output = new Output();

	try {
		const args = parseArgs(argv);
		switch (args.command) {
			case null:
			case 'help':
			case '--help':
				renderHelp(output);
				return;
			case 'init':
				await runInit(args, output);
				return;
			case 'add':
				await runAdd(args, output);
				return;
			case 'doctor':
				await runDoctor(args, output);
				return;
			case 'info':
				await runInfo(args, output);
				return;
			default:
				throw new CliError(
					`Unknown command "${args.command}". Run "forgeloop help" for usage.`,
				);
		}
	} catch (error) {
		if (error instanceof CliError) {
			output.error(error.message);
			process.exitCode = error.exitCode;
			return;
		}

		if (error instanceof Error) {
			output.error(error.message);
			process.exitCode = 1;
			return;
		}

		output.error('An unknown error occurred.');
		process.exitCode = 1;
	}
}
