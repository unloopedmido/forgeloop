import {
	assertDeployTargetFlags,
	applicationCommandsRoute,
	assertEnvValue,
	collectCommandPayload,
	diffCommandPayload,
	deploySlashCommandsToDiscord,
	getDiscordCommands,
	readProjectEnv,
	resolveSyncTarget,
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
		output.section('Commands');
		for (const entry of payload) {
			output.item('Name', commandNameFromPayload(entry));
		}
		if (payload.length === 0) {
			output.warn('No command modules found in the commands directory.');
		}
		return;
	}

	if (sub === 'diff') {
		assertDeployTargetFlags(args);
		const projectDir = resolveProjectDir(args);
		const manifest = await loadManifest(projectDir);
		assertHandlerProject(
			manifest,
			'This ForgeLoop project uses the "basic" shape, so slash command tooling is only available for "modular" or "advanced" projects.',
		);

		const localPayload = await collectCommandPayload(projectDir, manifest);
		const projectEnv = await readProjectEnv(projectDir);
		const target = resolveSyncTarget(args);
		const token = assertEnvValue('DISCORD_TOKEN', projectEnv);
		const clientId = assertEnvValue('CLIENT_ID', projectEnv);
		const guildId =
			target === 'guild' ? assertEnvValue('GUILD_ID', projectEnv) : undefined;
		const remotePayload = await getDiscordCommands(
			applicationCommandsRoute(clientId, guildId),
			token,
		);
		const diff = diffCommandPayload(localPayload, remotePayload);
		const mode =
			process.env.NODE_ENV === 'production' ? 'production' : 'development';
		const explicit =
			args.flags.get('global') === true || args.flags.get('guild') === true;

		output.banner(
			'ForgeLoop commands diff',
			'Comparing local command modules against Discord.',
		);
		output.section('Summary');
		output.item(
			'Target',
			target === 'guild' ? `guild ${guildId!}` : 'global',
		);
		output.item(
			'Resolution',
			explicit
				? 'explicit target flag'
				: `${mode} default target`,
		);
		output.item('Local commands', String(localPayload.length));
		output.item('Remote commands', String(remotePayload.length));

		if (diff.localOnly.length > 0) {
			output.section('Only Local');
			for (const name of diff.localOnly) {
				output.plain(`  + ${name}`);
			}
		}

		if (diff.remoteOnly.length > 0) {
			output.section('Only Remote');
			for (const name of diff.remoteOnly) {
				output.plain(`  - ${name}`);
			}
		}

		if (diff.changed.length > 0) {
			output.section('Changed');
			for (const name of diff.changed) {
				output.plain(`  ~ ${name}`);
			}
		}

		if (
			diff.localOnly.length === 0 &&
			diff.remoteOnly.length === 0 &&
			diff.changed.length === 0
		) {
			output.success('Local command payload matches the current Discord target.');
			return;
		}

		output.warn(
			'Command differences detected. Run `forgeloop commands deploy` for the same target to sync.',
		);
		return;
	}

	throw new CliError(
		'Usage: forgeloop commands deploy|list|diff [--guild|--global] [--dir <path>]',
	);
}
