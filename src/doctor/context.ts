import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { loadManifestWithLocation } from '../manifest.js';
import type { DoctorContext } from './types.js';

export async function buildDoctorContext(
	projectDir: string,
	verbose: boolean,
): Promise<DoctorContext> {
	const { manifest, location } = await loadManifestWithLocation(projectDir);
	const packageJsonPath = path.join(projectDir, 'package.json');
	let packageJson: Record<string, unknown> | null = null;
	try {
		const raw = await readFile(packageJsonPath, 'utf8');
		packageJson = JSON.parse(raw) as Record<string, unknown>;
	} catch {
		// leave null
	}

	return {
		projectDir,
		manifest,
		location,
		verbose,
		packageJson,
	};
}
