import type { DoctorContext, DoctorIssue, DoctorSummary } from './types.js';

export interface DoctorJsonReport {
	project: {
		dir: string;
		name: string;
		preset: string;
		language: string;
		packageManager: string;
		configPath: string;
	};
	timestamp: string;
	durationMs: number;
	summary: DoctorSummary;
	issues: Array<{
		code: string;
		severity: DoctorIssue['severity'];
		group: DoctorIssue['group'];
		title: string;
		message: string;
		fixes: string[];
		evidence?: Record<string, string>;
	}>;
}

export function buildJsonReport(
	ctx: DoctorContext,
	issues: DoctorIssue[],
	summary: DoctorSummary,
	durationMs: number,
): DoctorJsonReport {
	return {
		project: {
			dir: ctx.projectDir,
			name: ctx.manifest.projectName,
			preset: ctx.manifest.preset,
			language: ctx.manifest.language,
			packageManager: ctx.manifest.packageManager,
			configPath: ctx.location.relativePath,
		},
		timestamp: new Date().toISOString(),
		durationMs,
		summary,
		issues: issues.map((i) => ({
			code: i.code,
			severity: i.severity,
			group: i.group,
			title: i.title,
			message: i.message,
			fixes: i.fixes,
			...(i.evidence ? { evidence: i.evidence } : {}),
		})),
	};
}
