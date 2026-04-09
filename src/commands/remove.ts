import { unlink } from 'node:fs/promises';
import path from 'node:path';
import {
	assertDeployTargetFlags,
	deploySlashCommandsToDiscord,
} from '../lib/discord-app-commands.js';
import { loadManifest } from '../manifest.js';
import type { ParsedArgs } from '../types.js';
import { getBooleanFlag, getOptionalStringFlag } from '../utils/args.js';
import { CliError } from '../utils/errors.js';
import { pathExists } from '../utils/fs.js';
import { Output, type OutputWriter } from '../utils/format.js';
import {
	assertValidCustomId,
	interactionFilePath,
} from '../utils/interaction-paths.js';
import {
	assertHandlerProject,
	resolveProjectDir,
} from '../utils/project.js';

function normalizeCommandName(name: string) {
	if (!/^[a-z0-9-_]+$/i.test(name)) {
		throw new CliError(
			`Invalid command name "${name}". Use letters, numbers, hyphens, or underscores.`,
		);
	}

	return name.toLowerCase();
}

function normalizeEventName(name: string) {
	if (!/^[a-zA-Z0-9]+$/.test(name)) {
		throw new CliError(
			`Invalid event name "${name}". Use the exact Discord.js event name.`,
		);
	}

	return name;
}

function resolveIdentifier(
	args: ParsedArgs,
	kind: 'command' | 'event' | 'modal' | 'button' | 'select-menu',
): string {
	if (kind === 'command') {
		const name = args.subcommands[1];
		if (!name) {
			throw new CliError('Usage: forgeloop remove command <name> [--sync] …');
		}

		return normalizeCommandName(name);
	}

	if (kind === 'event') {
		const name = args.subcommands[1];
		if (!name) {
			throw new CliError('Usage: forgeloop remove event <eventName> [--sync] …');
		}

		return normalizeEventName(name);
	}

	const fromFlag = getOptionalStringFlag(args.flags, 'custom-id');
	const fromPos = args.subcommands[1];
	if (fromFlag) {
		return assertValidCustomId(fromFlag);
	}

	if (fromPos) {
		return assertValidCustomId(fromPos);
	}

	throw new CliError(
		`Usage: forgeloop remove ${kind} --custom-id <id> OR forgeloop remove ${kind} <customId>`,
	);
}

export async function runRemove(
	args: ParsedArgs,
	output: OutputWriter = new Output(),
) {
	const kind = args.subcommands[0];
	if (
		kind !== 'command' &&
		kind !== 'event' &&
		kind !== 'modal' &&
		kind !== 'button' &&
		kind !== 'select-menu'
	) {
		throw new CliError(
			'Usage: forgeloop remove command|event|modal|button|select-menu … [--sync] [--guild|--global]',
		);
	}

	const projectDir = resolveProjectDir(args);
	const manifest = await loadManifest(projectDir);
	assertHandlerProject(
		manifest,
		'This ForgeLoop project uses the "basic" shape, so handler removal is only available for "modular" or "advanced" projects.',
	);

	const identifier = resolveIdentifier(args, kind);
	const ext = manifest.language === 'ts' ? 'ts' : 'js';

	let relativePath: string;
	if (kind === 'command') {
		relativePath = path.posix.join(
			manifest.paths.commandsDir!,
			`${identifier}.${ext}`,
		);
	} else if (kind === 'event') {
		relativePath = path.posix.join(
			manifest.paths.eventsDir!,
			`${identifier}.${ext}`,
		);
	} else {
		const interactionKind =
			kind === 'modal' ? 'modal' : kind === 'button' ? 'button' : 'select-menu';
		relativePath = interactionFilePath(
			manifest,
			interactionKind,
			identifier,
			manifest.language,
		);
	}

	const absolutePath = path.join(projectDir, relativePath);
	if (!(await pathExists(absolutePath))) {
		throw new CliError(`Nothing to remove: ${relativePath} does not exist.`);
	}

	await unlink(absolutePath);
	output.success(`Removed ${relativePath}`);

	const shouldSync = getBooleanFlag(args.flags, 'sync');
	if (!shouldSync) {
		return;
	}

	if (kind !== 'command') {
		output.warn(
			'--sync only applies when removing slash commands (Discord has no delete-all API for component customIds).',
		);
		return;
	}

	assertDeployTargetFlags(args);
	output.section('Syncing slash commands to Discord');
	await deploySlashCommandsToDiscord(projectDir, manifest, args, output);
}
