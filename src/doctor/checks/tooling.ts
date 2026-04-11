import type { DoctorCheck, DoctorContext, DoctorIssue } from '../types.js';

function getScripts(
	pkg: Record<string, unknown> | null,
): Record<string, string> | null {
	if (!pkg) {
		return null;
	}

	const s = pkg.scripts;
	if (!s || typeof s !== 'object' || Array.isArray(s)) {
		return null;
	}

	return s as Record<string, string>;
}

async function runTooling(ctx: DoctorContext): Promise<DoctorIssue[]> {
	const issues: DoctorIssue[] = [];
	const tooling = ctx.manifest.features.tooling;

	if (tooling === 'none') {
		return issues;
	}

	const scripts = getScripts(ctx.packageJson);
	if (!scripts?.lint) {
		issues.push({
			code: 'TOOLING_MISSING_LINT_SCRIPT',
			severity: 'warning',
			group: 'tooling',
			title: 'Missing lint script',
			message: `Tooling is "${tooling}" but package.json has no "lint" script.`,
			fixes: [
				'Restore package.json scripts from a fresh ForgeLoop scaffold or add a lint script matching your formatter/linter.',
			],
		});
	}

	return issues;
}

export const toolingCheck: DoctorCheck = {
	group: 'tooling',
	run: runTooling,
};
