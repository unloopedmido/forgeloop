import type { DoctorCheck, DoctorContext, DoctorIssue, DoctorSummary } from './types.js';

export function summarizeIssues(issues: DoctorIssue[]): DoctorSummary {
	let errors = 0;
	let warnings = 0;
	let infos = 0;

	for (const issue of issues) {
		if (issue.severity === 'error') {
			errors += 1;
		} else if (issue.severity === 'warning') {
			warnings += 1;
		} else {
			infos += 1;
		}
	}

	return { errors, warnings, infos };
}

export async function runDoctorChecks(
	ctx: DoctorContext,
	checks: DoctorCheck[],
): Promise<DoctorIssue[]> {
	const all: DoctorIssue[] = [];

	for (const check of checks) {
		const issues = await check.run(ctx);
		all.push(...issues);
	}

	return all;
}

export function shouldFail(
	summary: DoctorSummary,
	strict: boolean,
): boolean {
	if (summary.errors > 0) {
		return true;
	}

	if (strict && summary.warnings > 0) {
		return true;
	}

	return false;
}
