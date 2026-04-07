import path from 'node:path';
import { loadManifest, resolveManifestLocation } from '../manifest.js';
import type { ParsedArgs } from '../types.js';
import { getFlag } from '../utils/args.js';
import { pathExists } from '../utils/fs.js';
import { Output } from '../utils/format.js';

export async function runDoctor(args: ParsedArgs, output = new Output()) {
	const projectDir = path.resolve(
		(getFlag(args.flags, 'dir') as string | undefined) ?? process.cwd(),
	);
	const manifestLocation = await resolveManifestLocation(projectDir);
	const manifest = await loadManifest(projectDir);

	output.banner('ForgeLoop doctor', `Inspecting ${projectDir}`);

	const requiredPaths = [
		manifestLocation.relativePath,
		manifest.paths.srcDir,
		manifest.paths.configDir,
	];

	if (manifest.paths.commandsDir) {
		requiredPaths.push(manifest.paths.commandsDir);
	}

	if (manifest.paths.eventsDir) {
		requiredPaths.push(manifest.paths.eventsDir);
	}

	if (manifest.paths.coreDir) {
		requiredPaths.push(manifest.paths.coreDir);
	}

	if (manifest.features.git) {
		requiredPaths.push('.gitignore');
	}

	if (manifest.features.tooling === 'eslint-prettier') {
		requiredPaths.push('eslint.config.js', '.prettierrc.json');
	}

	if (manifest.features.tooling === 'biome') {
		requiredPaths.push('biome.json');
	}

	if (manifest.features.database) {
		requiredPaths.push(
			'prisma.config.ts',
			'prisma/schema.prisma',
			manifest.preset === 'advanced'
				? `src/core/database/client.${manifest.language}`
				: `src/lib/database.${manifest.language}`,
		);
	}

	if (manifest.features.docker) {
		requiredPaths.push('Dockerfile');
	}

	if (manifest.features.ci) {
		requiredPaths.push('.github/workflows/ci.yml');
	}

	let issues = 0;
	for (const relativePath of requiredPaths) {
		const exists = await pathExists(path.join(projectDir, relativePath));
		if (!exists) {
			output.error(`Missing ${relativePath}`);
			issues += 1;
			continue;
		}

		output.success(`Found ${relativePath}`);
	}

	if (issues === 0) {
		output.success('Project looks healthy.');
		return;
	}

	output.warn(`Doctor found ${issues} issue(s).`);
	process.exitCode = 1;
}
