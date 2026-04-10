import path from 'node:path';
import { pathExists } from '../../utils/fs.js';
import { scaffoldRelativePaths } from '../required-paths.js';
import type { DoctorCheck, DoctorContext, DoctorIssue } from '../types.js';

async function runStructure(ctx: DoctorContext): Promise<DoctorIssue[]> {
	const issues: DoctorIssue[] = [];
	const required = scaffoldRelativePaths(ctx.manifest, ctx.location);

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
					`If you renamed paths, update manifest.paths and ${ctx.location.relativePath} to match.`,
				],
				evidence: { path: relativePath },
			});
		}
	}

	return issues;
}

export const structureCheck: DoctorCheck = {
	id: 'structure',
	title: 'Scaffold files on disk',
	group: 'structure',
	defaultEnabled: true,
	cost: 'fast',
	run: runStructure,
};
