import path from 'node:path';
import {
	assertDiscordEventName,
	getDiscordEventNames,
} from '../discord/events.js';
import { loadManifest } from '../manifest.js';
import {
	renderCommandFile,
	renderEventFile,
	renderInteractionFile,
} from '../generators/templates.js';
import type { ParsedArgs } from '../types.js';
import { getBooleanFlag, getOptionalStringFlag } from '../utils/args.js';
import { CliError } from '../utils/errors.js';
import { writeFiles } from '../utils/fs.js';
import { Output, type OutputWriter } from '../utils/format.js';
import { assertValidCustomId } from '../utils/interaction-paths.js';
import {
	assertHandlerProject,
	resolveProjectDir,
} from '../utils/project.js';
import {
	canPrompt,
	promptConfirm,
	promptSelect,
	promptText,
} from '../utils/prompts.js';

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
			`Invalid event name "${name}". Use the exact Discord.js event name, for example "messageCreate".`,
		);
	}

	return name;
}

async function resolveCommandInput(args: ParsedArgs, output: OutputWriter) {
	const providedName = args.subcommands[1];
	const providedDescription = getOptionalStringFlag(args.flags, 'description');
	const interactive =
		canPrompt() && !providedName && providedDescription === undefined;

	if (interactive) {
		output.hero(
			'Command generator',
			'Shape a slash command with a clean prompt flow instead of raw file creation.',
		);
	}

	const name = interactive
		? normalizeCommandName(
				await promptText(output, 'Command name', providedName, (value) =>
					/^[a-z0-9-_]+$/i.test(value)
						? null
						: 'Use letters, numbers, hyphens, or underscores.',
				),
			)
		: providedName
			? normalizeCommandName(providedName)
			: (() => {
					throw new CliError(
						'Usage: forgeloop add command <name> [--description "..."]',
					);
				})();

	const description = interactive
		? await promptText(
				output,
				'Description',
				typeof providedDescription === 'string'
					? providedDescription
					: undefined,
				() => null,
				{ allowEmpty: true },
			)
		: typeof providedDescription === 'string'
			? providedDescription
			: '';

	return { name, description };
}

async function resolveEventInput(args: ParsedArgs, output: OutputWriter) {
	const providedName = args.subcommands[1];
	const providedOnce = getBooleanFlag(args.flags, 'once');
	const providedOn = getBooleanFlag(args.flags, 'on');
	const interactive =
		canPrompt() && !providedName && !providedOnce && !providedOn;

	if (interactive) {
		output.hero(
			'Event generator',
			'Pick an official Discord.js event and decide whether it should run once or stay subscribed.',
		);
	}

	const eventName = interactive
		? await promptSelect(
				output,
				'Choose an event type',
				getDiscordEventNames().map((eventName) => ({
					label: eventName,
					value: eventName,
				})),
				typeof providedName === 'string'
					? assertDiscordEventName(normalizeEventName(providedName))
					: 'interactionCreate',
			)
		: providedName
			? assertDiscordEventName(normalizeEventName(providedName))
			: (() => {
					throw new CliError('Usage: forgeloop add event <eventName> [--once]');
				})();

	const once = interactive
		? await promptConfirm(
				output,
				'Should this event run only once?',
				eventName === 'clientReady' ? true : providedOnce,
			)
		: providedOnce
			? true
			: providedOn
				? false
				: eventName === 'clientReady';

	return { eventName, once };
}

async function resolveCustomIdInput(args: ParsedArgs, output: OutputWriter) {
	const fromFlag = getOptionalStringFlag(args.flags, 'custom-id');
	const fromPos = args.subcommands[1];
	const interactive = canPrompt() && !fromFlag && !fromPos;

	if (interactive) {
		output.hero(
			'Interaction handler',
			'Provide a stable customId that matches your buttons, modals, or select menus.',
		);
	}

	const customId = interactive
		? assertValidCustomId(
				await promptText(
					output,
					'customId',
					undefined,
					(value) => {
						const trimmed = value.trim();
						if (!trimmed) {
							return 'customId is required.';
						}

						if (trimmed.length > 100) {
							return 'customId must be 100 characters or fewer.';
						}

						return null;
					},
				),
			)
		: fromFlag
			? assertValidCustomId(fromFlag)
			: fromPos
				? assertValidCustomId(fromPos)
				: (() => {
						throw new CliError(
							'Usage: forgeloop add <modal|button|select-menu> [--custom-id <id>] [<customId>]',
						);
					})();

	return customId;
}

export async function runAdd(
	args: ParsedArgs,
	output: OutputWriter = new Output(),
) {
	const artifactType = args.subcommands[0];
	if (!artifactType) {
		throw new CliError(
			'Usage: forgeloop add command|event|modal|button|select-menu …',
		);
	}

	const projectDir = resolveProjectDir(args);
	const manifest = await loadManifest(projectDir);
	assertHandlerProject(
		manifest,
		'This ForgeLoop project uses the "basic" shape, so commands and events stay inline in index.ts/js. Switch to "modular" or "advanced" to use handler generators.',
	);

	if (artifactType === 'command') {
		const command = await resolveCommandInput(args, output);
		const commandFile = renderCommandFile(
			manifest,
			command.name,
			command.description,
		);
		await writeFiles(projectDir, [commandFile]);
		if (
			canPrompt() &&
			!args.subcommands[1] &&
			getOptionalStringFlag(args.flags, 'description') === undefined
		) {
			output.callout('Command summary', [
				`Name: ${command.name}`,
				`Description: ${command.description || 'No description provided yet.'}`,
			]);
		}
		output.success(
			`Added command "${command.name}" to ${path.join(projectDir, commandFile.path)}`,
		);
		return;
	}

	if (artifactType === 'event') {
		const event = await resolveEventInput(args, output);
		const eventFile = renderEventFile(manifest, event.eventName, event.once);
		await writeFiles(projectDir, [eventFile]);
		if (
			canPrompt() &&
			!args.subcommands[1] &&
			!getBooleanFlag(args.flags, 'once') &&
			!getBooleanFlag(args.flags, 'on')
		) {
			output.callout('Event summary', [
				`Event: ${event.eventName}`,
				`Binding: ${event.once ? 'client.once' : 'client.on'}`,
			]);
		}
		output.success(
			`Added event "${event.eventName}" to ${path.join(projectDir, eventFile.path)}`,
		);
		return;
	}

	if (
		artifactType === 'modal' ||
		artifactType === 'button' ||
		artifactType === 'select-menu'
	) {
		const customId = await resolveCustomIdInput(args, output);
		const kind =
			artifactType === 'modal'
				? 'modal'
				: artifactType === 'button'
					? 'button'
					: 'select-menu';
		const file = renderInteractionFile(manifest, kind, customId);
		await writeFiles(projectDir, [file]);
		output.success(
			`Added ${artifactType} handler for customId "${customId}" at ${path.join(projectDir, file.path)}`,
		);
		return;
	}

	throw new CliError(
		`Unsupported add target "${artifactType}". Try "command", "event", "modal", "button", or "select-menu".`,
	);
}
