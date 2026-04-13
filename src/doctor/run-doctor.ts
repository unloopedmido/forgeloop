import path from 'node:path';
import { copyFile, readFile, writeFile } from 'node:fs/promises';
import { CONFIG_FILE } from '../constants.js';
import { buildProjectFiles } from '../generators/project-files.js';
import type { ParsedArgs } from '../types.js';
import { getBooleanFlag, getOptionalStringFlag } from '../utils/args.js';
import { Output, type OutputWriter } from '../utils/format.js';
import { ensureDirectory, pathExists } from '../utils/fs.js';
import { resolveProjectDir } from '../utils/project.js';
import { loadManifestWithLocation } from '../manifest.js';
import { CliError } from '../utils/errors.js';
import { configIntegrityCheck } from './checks/config-integrity.js';
import { depsCheck } from './checks/deps.js';
import { discordWorkflowCheck } from './checks/discord-workflow.js';
import { envCheck } from './checks/env.js';
import { networkCheck } from './checks/network.js';
import { structureCheck } from './checks/structure.js';
import { toolingCheck } from './checks/tooling.js';
import {
	ALL_DOCTOR_GROUPS,
	DEFAULT_DOCTOR_GROUPS,
	type DoctorCheck,
	type DoctorContext,
	type DoctorGroup,
	type DoctorIssue,
	type DoctorSummary,
} from './types.js';

const DOCTOR_CHECKS: readonly DoctorCheck[] = [
	configIntegrityCheck,
	structureCheck,
	envCheck,
	depsCheck,
	discordWorkflowCheck,
	networkCheck,
	toolingCheck,
] as const;

const GROUP_SET = new Set<string>(ALL_DOCTOR_GROUPS);
const GROUP_ORDER = [
	'config',
	'structure',
	'env',
	'deps',
	'discord',
	'network',
	'tooling',
] as const;

export function parseDoctorGroupsFlag(
	value: string | undefined,
): Set<DoctorGroup> | null {
	if (value === undefined || value.trim() === '') {
		return null;
	}

	const parts = value
		.split(',')
		.map((part) => part.trim())
		.filter(Boolean);
	const groups = new Set<DoctorGroup>();

	for (const part of parts) {
		if (!GROUP_SET.has(part)) {
			throw new CliError(
				`Unknown doctor check group "${part}". Valid groups: ${ALL_DOCTOR_GROUPS.join(', ')}.`,
			);
		}
		groups.add(part as DoctorGroup);
	}

	return groups;
}

export function defaultDoctorGroupSet() {
	return new Set<DoctorGroup>(DEFAULT_DOCTOR_GROUPS);
}

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

export function shouldFail(summary: DoctorSummary, strict: boolean) {
	return summary.errors > 0 || (strict && summary.warnings > 0);
}

async function buildDoctorContext(
	projectDir: string,
	verbose: boolean,
): Promise<DoctorContext> {
	const { manifest, location } = await loadManifestWithLocation(projectDir);
	const packageJsonPath = path.join(projectDir, 'package.json');
	let packageJson: Record<string, unknown> | null;
	try {
		packageJson = JSON.parse(
			await readFile(packageJsonPath, 'utf8'),
		) as Record<string, unknown>;
	} catch {
		packageJson = null;
	}

	return {
		projectDir,
		manifest,
		location,
		verbose,
		packageJson,
	};
}

async function applyDoctorFix(projectDir: string) {
	const configPath = path.join(projectDir, CONFIG_FILE);
	if (!(await pathExists(configPath))) {
		return [];
	}

	const configSource = await readFile(configPath, 'utf8').catch(() => null);
	if (!configSource || /\bexport\s+default\b/u.test(configSource)) {
		return [];
	}

	for (const binding of ['config', 'manifest'] as const) {
		const pattern = new RegExp(`export\\s+const\\s+${binding}\\s*=`, 'u');
		if (!pattern.test(configSource)) {
			continue;
		}

		await writeFile(
			configPath,
			`${configSource.trimEnd()}\n\nexport default ${binding};\n`,
			'utf8',
		);
		return [`Repaired ${CONFIG_FILE} to export default \`${binding}\`.`];
	}

	return [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function mergeMissingStringEntries(
	current: Record<string, unknown>,
	generated: Record<string, unknown>,
) {
	const added: string[] = [];
	for (const [key, value] of Object.entries(generated)) {
		if (current[key] !== undefined || typeof value !== 'string') {
			continue;
		}
		current[key] = value;
		added.push(key);
	}
	return added;
}

async function createMissingEnv(projectDir: string) {
	const envPath = path.join(projectDir, '.env');
	const examplePath = path.join(projectDir, '.env.example');

	if ((await pathExists(envPath)) || !(await pathExists(examplePath))) {
		return [];
	}

	await copyFile(examplePath, envPath);
	return ['Created `.env` from `.env.example`.'];
}

async function createMissingScaffoldFiles(ctx: DoctorContext) {
	const generatedFiles = buildProjectFiles(ctx.manifest);
	const actions: string[] = [];

	for (const file of generatedFiles) {
		if (file.path === 'package.json') {
			continue;
		}

		const absolutePath = path.join(ctx.projectDir, file.path);
		if (await pathExists(absolutePath)) {
			continue;
		}

		await ensureDirectory(path.dirname(absolutePath));
		await writeFile(absolutePath, file.content, 'utf8');
		actions.push(`Created missing \`${file.path}\`.`);
	}

	return actions;
}

async function mergeMissingPackageJson(ctx: DoctorContext) {
	const packageJsonPath = path.join(ctx.projectDir, 'package.json');
	const generatedPackageJsonFile = buildProjectFiles(ctx.manifest).find(
		(file) => file.path === 'package.json',
	);
	if (!generatedPackageJsonFile) {
		return [];
	}

	if (!(await pathExists(packageJsonPath))) {
		await writeFile(packageJsonPath, generatedPackageJsonFile.content, 'utf8');
		return ['Created missing `package.json`.'];
	}

	if (!ctx.packageJson || !isRecord(ctx.packageJson)) {
		return [];
	}

	const generatedPackageJson = JSON.parse(
		generatedPackageJsonFile.content,
	) as Record<string, unknown>;
	const currentPackageJson = { ...ctx.packageJson };
	let changed = false;
	const actions: string[] = [];

	for (const field of ['scripts', 'dependencies', 'devDependencies'] as const) {
		const generatedValue = generatedPackageJson[field];
		if (!isRecord(generatedValue)) {
			continue;
		}

		const currentValue = isRecord(currentPackageJson[field])
			? { ...(currentPackageJson[field] as Record<string, unknown>) }
			: {};
		const added = mergeMissingStringEntries(currentValue, generatedValue);
		if (added.length === 0) {
			continue;
		}

		currentPackageJson[field] = currentValue;
		changed = true;
		actions.push(`Added missing ${field}: ${added.join(', ')}.`);
	}

	for (const field of ['type', 'private', 'packageManager'] as const) {
		if (
			currentPackageJson[field] === undefined &&
			generatedPackageJson[field] !== undefined
		) {
			currentPackageJson[field] = generatedPackageJson[field];
			changed = true;
			actions.push(`Added missing package.json field \`${field}\`.`);
		}
	}

	if (!changed) {
		return [];
	}

	await writeFile(
		packageJsonPath,
		`${JSON.stringify(currentPackageJson, null, 2)}\n`,
		'utf8',
	);
	return actions;
}

async function applyDoctorScaffoldFixes(ctx: DoctorContext) {
	return [
		...(await createMissingScaffoldFiles(ctx)),
		...(await mergeMissingPackageJson(ctx)),
		...(await createMissingEnv(ctx.projectDir)),
	];
}

function groupLabel(group: DoctorIssue['group']) {
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

function renderHumanDoctor(
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
				for (const [key, value] of Object.entries(issue.evidence)) {
					output.plain(`    ${key}: ${value}`);
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

	if (shouldFail(summary, strict)) {
		output.warn(
			`Doctor finished with ${summary.errors} error(s) and ${summary.warnings} warning(s).`,
		);
		return;
	}

	output.success('Project looks healthy.');
}

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

function buildJsonReport(
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
		issues: issues.map((issue) => ({
			code: issue.code,
			severity: issue.severity,
			group: issue.group,
			title: issue.title,
			message: issue.message,
			fixes: issue.fixes,
			...(issue.evidence ? { evidence: issue.evidence } : {}),
		})),
	};
}

async function runDoctorChecks(
	ctx: DoctorContext,
	groups: Set<DoctorGroup>,
) {
	const issues: DoctorIssue[] = [];
	for (const check of DOCTOR_CHECKS) {
		if (groups.has(check.group)) {
			issues.push(...(await check.run(ctx)));
		}
	}
	return issues;
}

export async function runDoctor(
	args: ParsedArgs,
	output: OutputWriter = new Output(),
) {
	const projectDir = resolveProjectDir(args);
	const verbose = getBooleanFlag(args.flags, 'verbose');
	const json = getBooleanFlag(args.flags, 'json');
	const strict = getBooleanFlag(args.flags, 'strict');
	const fix = getBooleanFlag(args.flags, 'fix');
	const checksFlag = getOptionalStringFlag(args.flags, 'checks');
	const groups =
		parseDoctorGroupsFlag(checksFlag) ?? defaultDoctorGroupSet();
	let fixMessages: string[] = [];

	if (fix) {
		fixMessages = [...fixMessages, ...(await applyDoctorFix(projectDir))];
	}

	const started = Date.now();
	let ctx = await buildDoctorContext(projectDir, verbose);
	if (fix) {
		fixMessages = [
			...fixMessages,
			...(await applyDoctorScaffoldFixes(ctx)),
		];
		if (fixMessages.length > 0) {
			ctx = await buildDoctorContext(projectDir, verbose);
		}
	}
	const issues = await runDoctorChecks(ctx, groups);
	const summary = summarizeIssues(issues);
	const durationMs = Date.now() - started;

	if (fixMessages.length > 0) {
		for (const message of fixMessages) {
			if (json) {
				console.error(`forgeloop doctor: ${message}`);
			} else {
				output.info(message);
			}
		}
	}

	if (json) {
		process.stdout.write(
			`${JSON.stringify(buildJsonReport(ctx, issues, summary, durationMs), null, 2)}\n`,
		);
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
