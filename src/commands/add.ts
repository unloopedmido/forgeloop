import path from 'node:path';
import {
	assertDiscordEventName,
	getDiscordEventNames,
} from '../discord/events.js';
import { loadManifest } from '../manifest.js';
import {
	isClientReadyEvent,
	renderButtonTemplate,
	renderCommandTemplate,
	renderContextMenuCommandTemplate,
	renderEventTemplate,
	renderModalTemplate,
	renderSelectMenuTemplate,
} from '../generators/runtime.js';
import { fileExtension } from '../generators/shared.js';
import type { InteractionTemplateSpec, ParsedArgs } from '../types.js';
import { getBooleanFlag, getOptionalStringFlag } from '../utils/args.js';
import { CliError } from '../utils/errors.js';
import type { FileSpec } from '../utils/fs.js';
import { writeFiles } from '../utils/fs.js';
import { Output, type OutputWriter } from '../utils/format.js';
import {
	assertValidCustomId,
	assertValidRegExpFlags,
	assertValidRegExpPattern,
	interactionFilePath,
} from '../utils/interaction-paths.js';
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
import { normalizeCommandName, normalizeEventName } from './names.js';

function commandFile(
	manifest: Awaited<ReturnType<typeof loadManifest>>,
	name: string,
	description?: string,
	templateOptions?: {
		subcommands?: boolean;
		autocomplete?: boolean;
	},
): FileSpec {
	return {
		path: `${manifest.paths.commandsDir!}/${name}.${fileExtension(manifest.language)}`,
		content: renderCommandTemplate(
			manifest.language,
			name,
			description,
			templateOptions,
		),
	};
}

function contextMenuFile(
	manifest: Awaited<ReturnType<typeof loadManifest>>,
	name: string,
	target: 'user' | 'message',
): FileSpec {
	return {
		path: `${manifest.paths.commandsDir!}/${name}.${fileExtension(manifest.language)}`,
		content: renderContextMenuCommandTemplate(
			manifest.language,
			name,
			target,
		),
	};
}

function eventFile(
	manifest: Awaited<ReturnType<typeof loadManifest>>,
	eventName: string,
	once = isClientReadyEvent(eventName),
): FileSpec {
	return {
		path: `${manifest.paths.eventsDir!}/${eventName}.${fileExtension(manifest.language)}`,
		content: renderEventTemplate(manifest.language, eventName, once),
	};
}

function interactionFile(
	manifest: Awaited<ReturnType<typeof loadManifest>>,
	kind: 'modal' | 'button' | 'select-menu',
	spec: InteractionTemplateSpec,
): FileSpec {
	const content =
		kind === 'modal'
			? renderModalTemplate(manifest.language, spec)
			: kind === 'button'
				? renderButtonTemplate(manifest.language, spec)
				: renderSelectMenuTemplate(manifest.language, spec);
	const pathKey = spec.match === 'regexp' ? spec.pattern : spec.value;
	return {
		path: interactionFilePath(manifest, kind, pathKey, manifest.language),
		content,
	};
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

	const withSubcommands = getBooleanFlag(args.flags, 'with-subcommands');
	const withAutocomplete = getBooleanFlag(args.flags, 'autocomplete');

	return { name, description, withSubcommands, withAutocomplete };
}

function resolveContextMenuTarget(args: ParsedArgs): 'user' | 'message' {
	const raw = getOptionalStringFlag(args.flags, 'type') ?? 'user';
	if (raw === 'user' || raw === 'message') {
		return raw;
	}

	throw new CliError('Use --type user or --type message for context-menu commands.');
}

async function resolveContextMenuInput(args: ParsedArgs, output: OutputWriter) {
	const providedName = args.subcommands[1];
	const interactive =
		canPrompt() && !providedName && getOptionalStringFlag(args.flags, 'type') === undefined;

	if (interactive) {
		output.hero(
			'Context menu command',
			'User or message right-click commands live beside slash commands in src/commands.',
		);
	}

	const name = interactive
		? normalizeCommandName(
				await promptText(output, 'Command name (kebab-case)', providedName, (value) =>
					/^[a-z0-9-_]+$/i.test(value)
						? null
						: 'Use letters, numbers, hyphens, or underscores.',
				),
			)
		: providedName
			? normalizeCommandName(providedName)
			: (() => {
					throw new CliError(
						'Usage: forgeloop add context-menu <name> [--type user|message]',
					);
				})();

	const target = interactive
		? await promptSelect(
				output,
				'Target',
				[
					{ label: 'User', value: 'user' },
					{ label: 'Message', value: 'message' },
				],
				'user',
			)
		: resolveContextMenuTarget(args);

	return { name, target };
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

async function resolveInteractionTemplateSpec(
	args: ParsedArgs,
	output: OutputWriter,
): Promise<InteractionTemplateSpec> {
	const regexpFlag = getOptionalStringFlag(args.flags, 'regexp');
	const regexpFlagsRaw = getOptionalStringFlag(args.flags, 'regexp-flags');
	const fromFlag = getOptionalStringFlag(args.flags, 'custom-id');
	const fromPos = args.subcommands[1];
	const hasPosOrCustom = fromFlag !== undefined || fromPos;

	if (regexpFlagsRaw !== undefined && regexpFlag === undefined) {
		throw new CliError('--regexp-flags requires --regexp.');
	}

	if (regexpFlag !== undefined && hasPosOrCustom) {
		throw new CliError(
			'Use either --regexp or --custom-id / positional customId, not both.',
		);
	}

	if (regexpFlag !== undefined) {
		const { pattern, flags } = assertValidRegExpPattern(
			regexpFlag,
			regexpFlagsRaw ?? 'u',
		);
		return { match: 'regexp', pattern, flags };
	}

	const interactive =
		canPrompt() &&
		fromFlag === undefined &&
		fromPos === undefined &&
		regexpFlag === undefined;

	if (interactive) {
		output.hero(
			'Interaction handler',
			'Exact customId or RegExp — or hand-write parseCustomId / matchCustomId modules.',
		);
		const matchMode = await promptSelect(
			output,
			'Match mode',
			[
				{
					label: 'Exact — full customId must match',
					value: 'exact',
				},
				{
					label:
						'RegExp — entire customId must match the pattern (use ^ … $)',
					value: 'regexp',
				},
			],
			'exact',
		);

		if (matchMode === 'regexp') {
			const patternRaw = await promptText(
				output,
				'RegExp pattern',
				undefined,
				(value) => {
					const trimmed = value.trim();
					if (!trimmed) {
						return 'Pattern is required.';
					}
					if (trimmed.length > 500) {
						return 'Pattern must be 500 characters or fewer.';
					}
					return null;
				},
			);
			const flagsAnswer = await promptText(
				output,
				'RegExp flags',
				'u',
				(value) => {
					try {
						assertValidRegExpFlags(value.trim() || 'u');
					} catch (error) {
						return error instanceof CliError
							? error.message
							: 'Invalid flags.';
					}
					return null;
				},
			);
			const { pattern, flags } = assertValidRegExpPattern(
				patternRaw.trim(),
				flagsAnswer.trim() || 'u',
			);
			return { match: 'regexp', pattern, flags };
		}

		const text = assertValidCustomId(
			await promptText(
				output,
				'customId',
				undefined,
				(value) => {
					const trimmed = value.trim();
					if (!trimmed) {
						return 'Value is required.';
					}

					if (trimmed.length > 100) {
						return 'Must be 100 characters or fewer.';
					}

					return null;
				},
			),
		);
		return { match: 'exact', value: text };
	}

	const customId = fromFlag
		? assertValidCustomId(fromFlag)
		: fromPos
			? assertValidCustomId(fromPos)
			: (() => {
					throw new CliError(
						'Usage: forgeloop add <modal|button|select-menu> [--custom-id <id> | --regexp <pattern> [--regexp-flags <flags>] | <customId>]',
					);
				})();

	return { match: 'exact', value: customId };
}

export async function runAdd(
	args: ParsedArgs,
	output: OutputWriter = new Output(),
) {
	const artifactType = args.subcommands[0];
	if (!artifactType) {
		throw new CliError(
			'Usage: forgeloop add command|context-menu|event|modal|button|select-menu …',
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
		const file = commandFile(
			manifest,
			command.name,
			command.description,
			{
				subcommands: command.withSubcommands,
				autocomplete: command.withAutocomplete,
			},
		);
		await writeFiles(projectDir, [file]);
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
			`Added command "${command.name}" to ${path.join(projectDir, file.path)}`,
		);
		return;
	}

	if (artifactType === 'context-menu') {
		const ctx = await resolveContextMenuInput(args, output);
		const file = contextMenuFile(manifest, ctx.name, ctx.target);
		await writeFiles(projectDir, [file]);
		output.success(
			`Added ${ctx.target} context menu command "${ctx.name}" to ${path.join(projectDir, file.path)}`,
		);
		return;
	}

	if (artifactType === 'event') {
		const event = await resolveEventInput(args, output);
		const file = eventFile(manifest, event.eventName, event.once);
		await writeFiles(projectDir, [file]);
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
			`Added event "${event.eventName}" to ${path.join(projectDir, file.path)}`,
		);
		return;
	}

	if (
		artifactType === 'modal' ||
		artifactType === 'button' ||
		artifactType === 'select-menu'
	) {
		const spec = await resolveInteractionTemplateSpec(args, output);
		const kind =
			artifactType === 'modal'
				? 'modal'
				: artifactType === 'button'
					? 'button'
					: 'select-menu';
		const file = interactionFile(manifest, kind, spec);
		await writeFiles(projectDir, [file]);
		const idLabel =
			spec.match === 'regexp'
				? `RegExp /${spec.pattern}/${spec.flags}`
				: `customId "${spec.value}"`;
		output.success(
			`Added ${artifactType} handler (${spec.match} match) for ${idLabel} at ${path.join(projectDir, file.path)}`,
		);
		return;
	}

	throw new CliError(
		`Unsupported add target "${artifactType}". Try "command", "context-menu", "event", "modal", "button", or "select-menu".`,
	);
}
