import type { ParsedArgs } from '../types.js';
import { getBooleanFlag, getOptionalStringFlag } from '../utils/args.js';
import { Output, type OutputWriter } from '../utils/format.js';
import { resolveProjectDir } from '../utils/project.js';
import { applyDoctorFix } from './apply-fix.js';
import { buildDoctorContext } from './context.js';
import { defaultDoctorGroupSet, parseDoctorGroupsFlag } from './resolve-groups.js';
import { buildJsonReport } from './render-json.js';
import { renderHumanDoctor } from './render-human.js';
import { checksForGroups } from './registry.js';
import {
	runDoctorChecks,
	shouldFail,
	summarizeIssues,
} from './runner.js';

export async function runDoctorCli(
	args: ParsedArgs,
	output: OutputWriter = new Output(),
) {
	const projectDir = resolveProjectDir(args);
	const verbose = getBooleanFlag(args.flags, 'verbose');
	const json = getBooleanFlag(args.flags, 'json');
	const strict = getBooleanFlag(args.flags, 'strict');
	const fix = getBooleanFlag(args.flags, 'fix');
	const checksFlag = getOptionalStringFlag(args.flags, 'checks');
	const groups = parseDoctorGroupsFlag(checksFlag) ?? defaultDoctorGroupSet();

	if (fix) {
		const created = await applyDoctorFix(projectDir);
		if (created) {
			if (json) {
				console.error('forgeloop doctor: Created .env from .env.example');
			} else {
				output.info('Created .env from .env.example (fill in secrets).');
			}
		}
	}

	const started = Date.now();
	const ctx = await buildDoctorContext(projectDir, verbose);
	const checks = checksForGroups(groups);
	const issues = await runDoctorChecks(ctx, checks);
	const summary = summarizeIssues(issues);
	const durationMs = Date.now() - started;

	if (json) {
		const report = buildJsonReport(ctx, issues, summary, durationMs);
		process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
	} else {
		renderHumanDoctor(
			output,
			ctx,
			issues,
			summary,
			durationMs,
			verbose,
			strict,
		);
	}

	if (shouldFail(summary, strict)) {
		process.exitCode = 1;
	}
}
