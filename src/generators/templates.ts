import type { ForgeLoopManifest } from '../types.js';
import type { FileSpec } from '../utils/fs.js';
import { buildProjectFiles } from './project-files.js';
import {
	isClientReadyEvent,
	renderCommandTemplate,
	renderEventTemplate,
} from './runtime.js';
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
): FileSpec {
	if (!manifest.paths.commandsDir) {
		throw new Error('Command files require a handler-based project shape.');
	}

	return {
		path: `${manifest.paths.commandsDir}/${commandName}.${fileExtension(manifest.language)}`,
		content: renderCommandTemplate(manifest.language, commandName, description),
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
