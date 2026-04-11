import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { collectCommandPayload } from '../../lib/discord-app-commands.js';
import { hasHandlers } from '../../generators/runtime.js';
import { pathExists } from '../../utils/fs.js';
import { CliError } from '../../utils/errors.js';
import { fileExtension } from '../../generators/shared.js';
import type { DoctorCheck, DoctorContext, DoctorIssue } from '../types.js';

async function runDiscordWorkflow(ctx: DoctorContext): Promise<DoctorIssue[]> {
	const issues: DoctorIssue[] = [];

	if (!hasHandlers(ctx.manifest)) {
		return issues;
	}

	const { projectDir, manifest } = ctx;
	const commandsDir = path.join(projectDir, manifest.paths.commandsDir!);
	const ext = `.${fileExtension(manifest.language)}`;

	let files: string[];
	try {
		files = await readdir(commandsDir);
	} catch {
		issues.push({
			code: 'CMD_DIR_UNREADABLE',
			severity: 'error',
			group: 'discord',
			title: 'Commands directory unreadable',
			message: `Could not read ${manifest.paths.commandsDir}.`,
			fixes: ['Restore the directory and command modules.'],
		});
		return issues;
	}

	const commandFiles = files.filter((name) => name.endsWith(ext));
	if (commandFiles.length === 0) {
		issues.push({
			code: 'CMD_NO_MODULES',
			severity: 'error',
			group: 'discord',
			title: 'No application command modules',
			message: `No *${ext} files in ${manifest.paths.commandsDir}.`,
			fixes: [
				'Add a command with `forgeloop add command <name> --dir .`',
				'Restore deleted files from version control.',
			],
		});
	}

	const nodeModules = path.join(projectDir, 'node_modules');
	if (!(await pathExists(nodeModules))) {
		return issues;
	}

	try {
		await collectCommandPayload(projectDir, manifest);
	} catch (error) {
		const message =
			error instanceof CliError
				? error.message
				: error instanceof Error
					? error.message
					: String(error);
		issues.push({
			code: 'CMD_PAYLOAD_FAILED',
			severity: 'error',
			group: 'discord',
			title: 'Command modules failed to load',
			message,
			fixes: [
				'Run `forgeloop commands list --dir .` to see the same error with context.',
				'Fix syntax/import errors in src/commands and ensure each module exports `data` and `execute`.',
			],
		});
	}

	return issues;
}

export const discordWorkflowCheck: DoctorCheck = {
	group: 'discord',
	run: runDiscordWorkflow,
};
