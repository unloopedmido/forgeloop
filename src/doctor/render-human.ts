import type { OutputWriter } from '../utils/format.js';
import type { DoctorContext, DoctorIssue, DoctorSummary } from './types.js';
import { shouldFail } from './runner.js';

const GROUP_ORDER = [
	'config',
	'structure',
	'env',
	'deps',
	'discord',
	'network',
	'tooling',
] as const;

function groupLabel(group: DoctorIssue['group']): string {
	switch (group) {
		case 'config':
			return 'Config';
		case 'structure':
			return 'Structure';
		case 'env':
			return 'Environment';
		case 'deps':
			return 'Dependencies';
		case 'discord':
			return 'Discord commands';
		case 'network':
			return 'Network';
		case 'tooling':
			return 'Tooling';
		default:
			return group;
	}
}

export function renderHumanDoctor(
	output: OutputWriter,
	ctx: DoctorContext,
	issues: DoctorIssue[],
	summary: DoctorSummary,
	durationMs: number,
	verbose: boolean,
	strict: boolean,
) {
	output.banner('ForgeLoop doctor', `Inspecting ${ctx.projectDir}`);

	output.section('Project');
	output.item('Name', ctx.manifest.projectName);
	output.item('Preset', ctx.manifest.preset);
	output.item('Language', ctx.manifest.language);
	output.item('Package manager', ctx.manifest.packageManager);
	output.item('Config', ctx.location.relativePath);

	const byGroup = new Map<DoctorIssue['group'], DoctorIssue[]>();
	for (const issue of issues) {
		const list = byGroup.get(issue.group) ?? [];
		list.push(issue);
		byGroup.set(issue.group, list);
	}

	const fail = shouldFail(summary, strict);

	for (const group of GROUP_ORDER) {
		const list = byGroup.get(group);
		if (!list || list.length === 0) {
			if (verbose) {
				output.section(groupLabel(group));
				output.success('No findings in this group.');
			}
			continue;
		}

		output.section(groupLabel(group));
		for (const issue of list) {
			const line = `${issue.title}: ${issue.message}`;
			if (issue.severity === 'error') {
				output.error(line);
			} else if (issue.severity === 'warning') {
				output.warn(line);
			} else {
				output.info(line);
			}

			if (verbose && issue.evidence) {
				for (const [k, v] of Object.entries(issue.evidence)) {
					output.plain(`    ${k}: ${v}`);
				}
			}

			for (const fix of issue.fixes) {
				if (fix) {
					output.plain(`    → ${fix}`);
				}
			}
		}
	}

	output.section('Summary');
	output.item('Duration', `${durationMs}ms`);
	output.item('Errors', String(summary.errors));
	output.item('Warnings', String(summary.warnings));
	if (summary.infos > 0) {
		output.item('Info', String(summary.infos));
	}
	if (strict) {
		output.item('Mode', 'strict (warnings fail the run)');
	}

	if (!fail) {
		output.success('Project looks healthy.');
	} else {
		output.warn(
			`Doctor finished with ${summary.errors} error(s) and ${summary.warnings} warning(s).`,
		);
	}
}
