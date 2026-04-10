import path from 'node:path';
import {
	installHint,
	probeDiscordJsImportable,
} from '../../lib/discord-app-commands.js';
import { pathExists } from '../../utils/fs.js';
import type { DoctorCheck, DoctorContext, DoctorIssue } from '../types.js';

function getDeps(pkg: Record<string, unknown> | null): Record<string, string> {
	if (!pkg) {
		return {};
	}

	const d = pkg.dependencies;
	if (!d || typeof d !== 'object' || Array.isArray(d)) {
		return {};
	}

	return d as Record<string, string>;
}

function getDevDeps(pkg: Record<string, unknown> | null): Record<string, string> {
	if (!pkg) {
		return {};
	}

	const d = pkg.devDependencies;
	if (!d || typeof d !== 'object' || Array.isArray(d)) {
		return {};
	}

	return d as Record<string, string>;
}

async function runDeps(ctx: DoctorContext): Promise<DoctorIssue[]> {
	const issues: DoctorIssue[] = [];
	const { projectDir, manifest, packageJson } = ctx;
	const pm = manifest.packageManager;

	if (!packageJson) {
		issues.push({
			code: 'PKG_MISSING',
			severity: 'error',
			group: 'deps',
			title: 'package.json missing or invalid',
			message: 'Could not read package.json in the project root.',
			fixes: ['Restore package.json from version control or re-scaffold the project.'],
		});
		return issues;
	}

	const deps = getDeps(packageJson);
	const devDeps = getDevDeps(packageJson);

	if (!deps['discord.js']) {
		issues.push({
			code: 'PKG_MISSING_DEP',
			severity: 'error',
			group: 'deps',
			title: 'Missing discord.js dependency',
			message: 'package.json should declare discord.js in dependencies.',
			fixes: [`Run \`${installHint(pm)}\` after fixing package.json, or add discord.js manually.`],
		});
	}

	if (!deps.dotenv) {
		issues.push({
			code: 'PKG_MISSING_DEP',
			severity: 'error',
			group: 'deps',
			title: 'Missing dotenv dependency',
			message: 'package.json should declare dotenv in dependencies.',
			fixes: [`Run \`${installHint(pm)}\` after adding dotenv.`],
		});
	}

	if (manifest.features.database?.orm === 'prisma') {
		if (!deps['@prisma/client']) {
			issues.push({
				code: 'PKG_MISSING_DEP',
				severity: 'error',
				group: 'deps',
				title: 'Missing @prisma/client',
				message: 'Prisma projects require @prisma/client in dependencies.',
				fixes: [`Run \`${installHint(pm)}\` after adding Prisma dependencies.`],
			});
		}

		if (!devDeps.prisma) {
			issues.push({
				code: 'PKG_MISSING_DEP',
				severity: 'warning',
				group: 'deps',
				title: 'Missing prisma CLI',
				message: 'Prisma CLI is usually a devDependency.',
				fixes: ['Add prisma to devDependencies and run your package manager install.'],
			});
		}
	}

	const nodeModules = path.join(projectDir, 'node_modules');
	if (!(await pathExists(nodeModules))) {
		issues.push({
			code: 'DEPS_NODE_MODULES_MISSING',
			severity: 'warning',
			group: 'deps',
			title: 'node_modules not found',
			message: 'Dependencies are not installed.',
			fixes: [`Run \`${installHint(pm)}\` in ${projectDir}.`],
		});
	} else {
		const probe = await probeDiscordJsImportable(projectDir, pm);
		if (!probe.ok) {
			issues.push({
				code: 'DEPS_DISCORD_IMPORT_FAILED',
				severity: 'error',
				group: 'deps',
				title: 'discord.js not loadable',
				message: probe.message,
				fixes: [`Run \`${installHint(pm)}\` or reinstall node_modules.`],
			});
		}
	}

	if (manifest.language === 'ts') {
		if (!devDeps.tsx) {
			issues.push({
				code: 'DEPS_TSX_MISSING',
				severity: 'error',
				group: 'deps',
				title: 'Missing tsx for TypeScript',
				message:
					'TypeScript projects need tsx (or another runner) to execute .ts entry and ForgeLoop command loaders.',
				fixes: ['Add tsx to devDependencies: npm i -D tsx (or pnpm/yarn equivalent).'],
			});
		}
	}

	return issues;
}

export const depsCheck: DoctorCheck = {
	id: 'deps',
	title: 'package.json and installed dependencies',
	group: 'deps',
	defaultEnabled: true,
	cost: 'moderate',
	run: runDeps,
};
