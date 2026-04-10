import type { ForgeLoopManifest, InteractionTemplateSpec } from '../types.js';
import type { FileSpec } from '../utils/fs.js';
import { buildProjectFiles } from './project-files.js';
import {
	isClientReadyEvent,
	renderButtonTemplate,
	renderCommandTemplate,
	renderContextMenuCommandTemplate,
	renderEventTemplate,
	renderModalTemplate,
	renderSelectMenuTemplate,
	type CommandTemplateOptions,
} from './runtime.js';
import {
	interactionFilePath,
	resolveInteractionsRoot,
} from '../utils/interaction-paths.js';
import { type RenderProjectFilesOptions, fileExtension } from './shared.js';

export function renderProjectFiles(
	manifest: ForgeLoopManifest,
	options: RenderProjectFilesOptions = {},
): FileSpec[] {
	return buildProjectFiles(manifest, options);
}

export function renderCommandFile(
	manifest: ForgeLoopManifest,
	commandName: string,
	description?: string,
	templateOptions?: CommandTemplateOptions,
): FileSpec {
	if (!manifest.paths.commandsDir) {
		throw new Error('Command files require a handler-based project shape.');
	}

	return {
		path: `${manifest.paths.commandsDir}/${commandName}.${fileExtension(manifest.language)}`,
		content: renderCommandTemplate(
			manifest.language,
			commandName,
			description,
			templateOptions,
		),
	};
}

export function renderContextMenuCommandFile(
	manifest: ForgeLoopManifest,
	commandName: string,
	target: 'user' | 'message',
): FileSpec {
	if (!manifest.paths.commandsDir) {
		throw new Error('Command files require a handler-based project shape.');
	}

	return {
		path: `${manifest.paths.commandsDir}/${commandName}.${fileExtension(manifest.language)}`,
		content: renderContextMenuCommandTemplate(
			manifest.language,
			commandName,
			target,
		),
	};
}

export function renderEventFile(
	manifest: ForgeLoopManifest,
	eventName: string,
	once = isClientReadyEvent(eventName),
): FileSpec {
	if (!manifest.paths.eventsDir) {
		throw new Error('Event files require a handler-based project shape.');
	}

	return {
		path: `${manifest.paths.eventsDir}/${eventName}.${fileExtension(manifest.language)}`,
		content: renderEventTemplate(manifest.language, eventName, once),
	};
}

export function renderInteractionFile(
	manifest: ForgeLoopManifest,
	kind: 'modal' | 'button' | 'select-menu',
	spec: InteractionTemplateSpec,
): FileSpec {
	if (!resolveInteractionsRoot(manifest)) {
		throw new Error('Interaction files require a handler-based project shape.');
	}

	const language = manifest.language;
	const content =
		kind === 'modal'
			? renderModalTemplate(language, spec)
			: kind === 'button'
				? renderButtonTemplate(language, spec)
				: renderSelectMenuTemplate(language, spec);

	const pathKey = spec.match === 'regexp' ? spec.pattern : spec.value;
	return {
		path: interactionFilePath(manifest, kind, pathKey, language),
		content,
	};
}
