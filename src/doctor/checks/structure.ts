import path from 'node:path';
import { fileExtension } from '../../generators/shared.js';
import { pathExists } from '../../utils/fs.js';
import type { ForgeLoopManifest } from '../../types.js';
import type { DoctorCheck, DoctorContext, DoctorIssue } from '../types.js';

function expectedProjectPaths(manifest: ForgeLoopManifest, configPath: string) {
	const ext = fileExtension(manifest.language);
	const files = [
		configPath,
		'package.json',
		'.env.example',
		'README.md',
		`src/index.${ext}`,
		`src/config/env.${ext}`,
	];

	if (manifest.features.git) {
		files.push('.gitignore');
	}

	if (manifest.paths.commandsDir && manifest.paths.eventsDir) {
		files.push(
			`${manifest.paths.commandsDir}/ping.${ext}`,
			`${manifest.paths.eventsDir}/clientReady.${ext}`,
			`src/lib/logger.${ext}`,
			`src/lib/interaction-errors.${ext}`,
			`${manifest.paths.interactionsDir ?? 'src/interactions'}/router.${ext}`,
			`src/lib/interaction-sessions.${ext}`,
			`${manifest.paths.interactionsDir ?? 'src/interactions'}/buttons/example-regex.${ext}`,
			`${manifest.paths.interactionsDir ?? 'src/interactions'}/buttons/example-parse.${ext}`,
		);
		if (manifest.language === 'ts') {
			files.push('src/types/commands.ts', 'src/types/interactions.ts');
		}
		if (manifest.preset === 'modular') {
			files.push(`src/sync-commands.${ext}`);
		}
	}

	if (manifest.preset === 'advanced') {
		files.push(
			`src/core/client/create-client.${ext}`,
			`src/core/loaders/load-commands.${ext}`,
			`src/core/loaders/load-events.${ext}`,
			`src/core/runtime/start-bot.${ext}`,
			`src/core/runtime/sync-commands.${ext}`,
		);
	}

	if (manifest.language === 'ts') {
		files.push('tsconfig.json');
	}

	if (manifest.features.tooling === 'eslint-prettier') {
		files.push('eslint.config.js', '.prettierrc.json');
	}
	if (manifest.features.tooling === 'biome') {
		files.push('biome.json');
	}

	if (manifest.features.database?.orm === 'prisma') {
		files.push(
			'prisma.config.ts',
			'prisma/schema.prisma',
			manifest.preset === 'advanced'
				? `src/core/database/client.${ext}`
				: `src/lib/database.${ext}`,
		);
	}

	if (manifest.features.docker) {
		files.push('Dockerfile', '.dockerignore');
	}
	if (manifest.features.ci) {
		files.push('.github/workflows/ci.yml');
	}

	return [...new Set(files)];
}

async function runStructure(ctx: DoctorContext): Promise<DoctorIssue[]> {
	const issues: DoctorIssue[] = [];
	const required = expectedProjectPaths(
		ctx.manifest,
		ctx.location.relativePath,
	);

	for (const relativePath of required) {
		const abs = path.join(ctx.projectDir, relativePath);
		const exists = await pathExists(abs);
		if (!exists) {
			issues.push({
				code: 'STRUCT_MISSING_PATH',
				severity: 'error',
				group: 'structure',
				title: 'Expected project file is missing',
				message: `Missing ${relativePath} (required for this manifest).`,
				fixes: [
					'Restore the file from version control or re-run ForgeLoop init in a fresh directory and copy your src.',
				],
				evidence: { path: relativePath },
			});
		}
	}

	return issues;
}

export const structureCheck: DoctorCheck = {
	group: 'structure',
	run: runStructure,
};
