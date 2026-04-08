import path from 'node:path';
import type { ForgeLoopManifest, ParsedArgs } from '../types.js';
import { getStringFlag } from './args.js';
import { CliError } from './errors.js';

type HandlerProjectManifest = ForgeLoopManifest & {
	paths: ForgeLoopManifest['paths'] & {
		commandsDir: string;
		eventsDir: string;
	};
};

export function resolveProjectDir(args: ParsedArgs) {
	return path.resolve(getStringFlag(args.flags, 'dir') ?? process.cwd());
}

export function hasHandlerProject(
	manifest: ForgeLoopManifest,
): manifest is HandlerProjectManifest {
	return Boolean(manifest.paths.commandsDir && manifest.paths.eventsDir);
}

export function assertHandlerProject(
	manifest: ForgeLoopManifest,
	message: string,
) {
	if (!hasHandlerProject(manifest)) {
		throw new CliError(message);
	}

	return manifest;
}
