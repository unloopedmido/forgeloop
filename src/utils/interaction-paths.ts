import { posix as pathPosix } from 'node:path';
import type { ForgeLoopManifest } from '../types.js';
import { CliError } from './errors.js';

export function assertValidCustomId(customId: string): string {
	const trimmed = customId.trim();
	if (!trimmed) {
		throw new CliError('customId is required.');
	}

	if (trimmed.length > 100) {
		throw new CliError('customId must be 100 characters or fewer.');
	}

	return trimmed;
}

const REGEXP_FLAGS_RE = /^[gimsuy]*$/u;

/** Validates `RegExp` constructor flags (subset safe for interaction routing). */
export function assertValidRegExpFlags(flags: string): string {
	const trimmed = flags.trim();
	if (!REGEXP_FLAGS_RE.test(trimmed)) {
		throw new CliError(
			'RegExp flags may only contain g, i, m, s, u, y (e.g. use "u" for Unicode).',
		);
	}

	return trimmed;
}

/** Ensures `pattern` + `flags` form a valid `RegExp` (throws CliError). */
export function assertValidRegExpPattern(
	pattern: string,
	flags: string,
): { pattern: string; flags: string } {
	const trimmed = pattern.trim();
	if (!trimmed) {
		throw new CliError('RegExp pattern is required.');
	}

	if (trimmed.length > 500) {
		throw new CliError('RegExp pattern must be 500 characters or fewer.');
	}

	const resolvedFlags = assertValidRegExpFlags(flags);
	try {
		new RegExp(trimmed, resolvedFlags);
	} catch (error) {
		const message =
			error instanceof Error ? error.message : 'Invalid regular expression.';
		throw new CliError(`Invalid RegExp: ${message}`);
	}

	return { pattern: trimmed, flags: resolvedFlags };
}

/** Maps a Discord customId to a stable filename base (lowercase, safe characters). */
export function customIdToFileSlug(customId: string): string {
	const slug = customId
		.toLowerCase()
		.replace(/[^a-z0-9_-]+/g, '-')
		.replace(/^-+|-+$/gu, '');
	return slug.length > 0 ? slug : 'interaction';
}

export function resolveInteractionsRoot(manifest: ForgeLoopManifest): string | null {
	if (!manifest.paths.commandsDir || !manifest.paths.eventsDir) {
		return null;
	}

	return manifest.paths.interactionsDir ?? 'src/interactions';
}

export function interactionFilePath(
	manifest: ForgeLoopManifest,
	kind: 'modal' | 'button' | 'select-menu',
	customId: string,
	language: ForgeLoopManifest['language'],
): string {
	const root = resolveInteractionsRoot(manifest)!;
	const ext = language === 'ts' ? 'ts' : 'js';
	const slug = customIdToFileSlug(customId);
	const sub =
		kind === 'modal' ? 'modals' : kind === 'button' ? 'buttons' : 'selectMenus';
	return pathPosix.join(root, sub, `${slug}.${ext}`);
}
