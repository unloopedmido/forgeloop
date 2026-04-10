import { LEGACY_MANIFEST_FILE, SUPPORTED_CONFIG_FILES } from '../constants.js';
import { buildProjectFiles } from '../generators/project-files.js';
import type { ForgeLoopManifest } from '../types.js';
import type { ManifestLocation } from './types.js';

/**
 * Paths expected on disk for this manifest, aligned with the scaffold generator
 * but honoring whichever config file actually exists (e.g. legacy `forgeloop.json`).
 */
export function scaffoldRelativePaths(
	manifest: ForgeLoopManifest,
	location: ManifestLocation,
): string[] {
	const fromGen = buildProjectFiles(manifest).map((f) => f.path);
	const skipConfigs = new Set(
		[...SUPPORTED_CONFIG_FILES, LEGACY_MANIFEST_FILE].filter(
			(f) => f !== location.relativePath,
		),
	);
	const filtered = fromGen.filter((p) => !skipConfigs.has(p));
	return [...new Set([location.relativePath, ...filtered])];
}
