import {
	renderCommandHelp,
	renderHelp,
	renderVersion,
} from './commands/help.js';
import { runAdd } from './commands/add.js';
import { runCommands } from './commands/commands.js';
import { runDocs } from './commands/docs.js';
import { runInfo } from './commands/info.js';
import { runRemove } from './commands/remove.js';
import { runInit } from './commands/init.js';
import { CORE_COMMAND_NAMES } from './commands/registry.js';
import { runDoctor } from './doctor/run-doctor.js';
import { expandShortFlags, getBooleanFlag, parseArgs } from './utils/args.js';
import { CliError } from './utils/errors.js';
import { Output } from './utils/format.js';

const COMMAND_HANDLERS = {
	init: runInit,
	add: runAdd,
	commands: runCommands,
	remove: runRemove,
	doctor: runDoctor,
	info: runInfo,
	docs: runDocs,
} as const;
type CoreCommandName = keyof typeof COMMAND_HANDLERS;

function isCoreCommandName(command: string): command is CoreCommandName {
	return CORE_COMMAND_NAMES.includes(command);
}

export async function runCli(argv: string[]) {
	const output = new Output();

	try {
		const args = parseArgs(expandShortFlags(argv));

		if (getBooleanFlag(args.flags, 'version')) {
			await renderVersion(output);
			return;
		}

		if (getBooleanFlag(args.flags, 'help')) {
			if (args.command === null || args.command === 'help') {
				renderHelp(output);
				return;
			}

			renderCommandHelp(args.command, output);
			return;
		}

		switch (args.command) {
			case null:
			case 'help':
				renderHelp(output);
				return;
			case 'version':
				await renderVersion(output);
				return;
			default:
				if (args.command && isCoreCommandName(args.command)) {
					await COMMAND_HANDLERS[args.command](args, output);
					return;
				}

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
