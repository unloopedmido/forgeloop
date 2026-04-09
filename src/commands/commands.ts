import {
	assertDeployTargetFlags,
	collectCommandPayload,
	deploySlashCommandsToDiscord,
} from '../lib/discord-app-commands.js';
import { loadManifest } from '../manifest.js';
import type { ParsedArgs } from '../types.js';
import { CliError } from '../utils/errors.js';
import { Output, type OutputWriter } from '../utils/format.js';
import {
	assertHandlerProject,
	resolveProjectDir,
} from '../utils/project.js';

function commandNameFromPayload(entry: Record<string, unknown>): string {
	const name = entry.name;
	return typeof name === 'string' ? name : '(unnamed)';
}

export async function runCommands(
	args: ParsedArgs,
	output: OutputWriter = new Output(),
) {
	const sub = args.subcommands[0];
	if (sub === 'deploy') {
		assertDeployTargetFlags(args);
		const projectDir = resolveProjectDir(args);
		const manifest = await loadManifest(projectDir);
		assertHandlerProject(
			manifest,
			'This ForgeLoop project uses the "basic" shape, so slash command tooling is only available for "modular" or "advanced" projects.',
		);
		await deploySlashCommandsToDiscord(projectDir, manifest, args, output);
		return;
	}

	if (sub === 'list') {
		const projectDir = resolveProjectDir(args);
		const manifest = await loadManifest(projectDir);
		assertHandlerProject(
			manifest,
			'This ForgeLoop project uses the "basic" shape, so slash command tooling is only available for "modular" or "advanced" projects.',
		);
		const payload = await collectCommandPayload(projectDir, manifest);
		output.banner(
			'ForgeLoop commands list',
			`Local slash commands (${payload.length})`,
		);
		for (const entry of payload) {
			output.plain(`  ${commandNameFromPayload(entry)}`);
		}
		if (payload.length === 0) {
			output.warn('No command modules found in the commands directory.');
		}
		return;
	}

	throw new CliError(
		'Usage: forgeloop commands deploy|list [--guild|--global] [--dir <path>]',
	);
}
