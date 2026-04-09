import path from 'node:path';
import {
	DEFAULTS,
	SUPPORTED_DATABASES,
	SUPPORTED_LANGUAGES,
	SUPPORTED_ORMS,
	SUPPORTED_PACKAGE_MANAGERS,
	SUPPORTED_PRESETS,
	SUPPORTED_TOOLING,
} from '../constants.js';
import type { InitOptions, ParsedArgs } from '../types.js';
import {
	getBooleanFlag,
	getOptionalStringFlag,
	getStringFlag,
} from '../utils/args.js';
import { CliError } from '../utils/errors.js';
import type { OutputWriter } from '../utils/format.js';
import {
	normalizeProjectName,
	validateProjectName,
} from '../utils/project-name.js';
import {
	canPrompt,
	promptConfirm,
	promptSelect,
	promptText,
} from '../utils/prompts.js';

function parseSelection<T extends readonly string[]>(
	value: unknown,
	supported: T,
	label: string,
): T[number] {
	if (typeof value !== 'string') {
		throw new CliError(`Missing required ${label} selection.`);
	}

	if (!supported.includes(value)) {
		throw new CliError(
			`Unsupported ${label}: ${value}. Supported values: ${supported.join(', ')}`,
		);
	}

	return value as T[number];
}

export async function resolveInitOptions(
	args: ParsedArgs,
	output: OutputWriter,
): Promise<InitOptions> {
	const projectName = args.subcommands[0];
	const interactive = !getBooleanFlag(args.flags, 'yes') && canPrompt();

	if (!projectName && !interactive) {
		throw new CliError(
			'`init` requires a project name in non-interactive mode.',
		);
	}

	let resolvedProjectName = projectName
		? normalizeProjectName(projectName)
		: '';
	let language = getOptionalStringFlag(args.flags, 'language');
	let preset = getOptionalStringFlag(args.flags, 'preset');
	let packageManager = getOptionalStringFlag(args.flags, 'package-manager');
	let database = getOptionalStringFlag(args.flags, 'database');
	let orm = getOptionalStringFlag(args.flags, 'orm');
	let tooling = getOptionalStringFlag(args.flags, 'tooling');
	let git = getBooleanFlag(args.flags, 'git');
	let docker = getBooleanFlag(args.flags, 'docker');
	let ci = getBooleanFlag(args.flags, 'ci');
	let install = getBooleanFlag(args.flags, 'install');

	if (interactive) {
		output.hero(
			'Project wizard',
			'Answer a few questions and ForgeLoop will shape the starter around your bot.',
		);
		if (!resolvedProjectName) {
			resolvedProjectName = normalizeProjectName(
				await promptText(
					output,
					'Project name',
					'my-discord-bot',
					validateProjectName,
				),
			);
		}

		if (!language) {
			language = await promptSelect(
				output,
				'Which language should the bot use?',
				[
					{
						label: 'TypeScript',
						value: 'ts',
						hint: 'Best default for maintainable bots',
					},
					{
						label: 'JavaScript',
						value: 'js',
						hint: 'Lower ceremony, faster start',
					},
				],
				DEFAULTS.language,
			);
		}

		if (!preset) {
			preset = await promptSelect(
				output,
				'Pick a project shape',
				[
					{
						label: 'basic',
						value: 'basic',
						hint: 'Single-file bot with everything in index',
					},
					{
						label: 'modular',
						value: 'modular',
						hint: 'Command and event handlers in dedicated folders',
					},
					{
						label: 'advanced',
						value: 'advanced',
						hint: 'Core runtime modules plus handler folders',
					},
				],
				DEFAULTS.preset,
			);
		}

		if (!packageManager) {
			packageManager = await promptSelect(
				output,
				'Which package manager should ForgeLoop prepare for?',
				[
					{ label: 'npm', value: 'npm' },
					{ label: 'pnpm', value: 'pnpm' },
					{ label: 'yarn', value: 'yarn' },
				],
				DEFAULTS.packageManager,
			);
		}

		if (!database) {
			database = await promptSelect(
				output,
				'Do you want database wiring in the starter?',
				[
					{ label: 'none', value: 'none', hint: 'Keep the starter minimal' },
					{ label: 'sqlite', value: 'sqlite', hint: 'Fast local development' },
					{
						label: 'postgresql',
						value: 'postgresql',
						hint: 'Production-ready relational setup',
					},
				],
				DEFAULTS.database,
			);
		}

		if (database !== 'none' && !orm) {
			orm = await promptSelect(
				output,
				'Choose the ORM layer',
				[
					{
						label: 'prisma',
						value: 'prisma',
						hint: 'Current ForgeLoop default',
					},
				],
				'prisma',
			);
		}

		if (!tooling) {
			tooling = await promptSelect(
				output,
				'Which formatter and linter setup do you want?',
				[
					{
						label: 'eslint-prettier',
						value: 'eslint-prettier',
						hint: 'Classic split tooling stack',
					},
					{
						label: 'biome',
						value: 'biome',
						hint: 'Single fast formatter and linter',
					},
					{ label: 'none', value: 'none', hint: 'No lint or formatter setup' },
				],
				DEFAULTS.tooling,
			);
		}

		if (!getBooleanFlag(args.flags, 'git')) {
			git = await promptConfirm(output, 'Initialize a git repository?', true);
		}

		if (!getBooleanFlag(args.flags, 'docker')) {
			docker = await promptConfirm(output, 'Include Docker support?', false);
		}
		if (!getBooleanFlag(args.flags, 'ci')) {
			ci = await promptConfirm(output, 'Include GitHub Actions CI?', false);
		}
		if (!getBooleanFlag(args.flags, 'install')) {
			install = await promptConfirm(
				output,
				'Install dependencies after scaffolding?',
				false,
			);
		}
	}

	const resolvedLanguage = parseSelection(
		language ?? DEFAULTS.language,
		SUPPORTED_LANGUAGES,
		'language',
	);
	const resolvedPreset = parseSelection(
		preset ?? DEFAULTS.preset,
		SUPPORTED_PRESETS,
		'preset',
	);
	const resolvedPackageManager = parseSelection(
		packageManager ?? DEFAULTS.packageManager,
		SUPPORTED_PACKAGE_MANAGERS,
		'package manager',
	);
	const resolvedDatabase = parseSelection(
		database ?? DEFAULTS.database,
		SUPPORTED_DATABASES,
		'database',
	);
	const resolvedOrm = parseSelection(
		orm ?? (resolvedDatabase === 'none' ? DEFAULTS.orm : 'prisma'),
		SUPPORTED_ORMS,
		'ORM',
	);
	if (resolvedDatabase === 'none' && resolvedOrm !== 'none') {
		throw new CliError(
			'When --database is "none", --orm must also be "none".',
		);
	}
	if (resolvedDatabase !== 'none' && resolvedOrm === 'none') {
		throw new CliError(
			'A database selection requires an ORM. Use --orm prisma.',
		);
	}
	const resolvedTooling = parseSelection(
		tooling ?? DEFAULTS.tooling,
		SUPPORTED_TOOLING,
		'tooling',
	);

	return {
		projectName: resolvedProjectName,
		targetDir: path.resolve(
			getStringFlag(args.flags, 'dir') ?? resolvedProjectName,
		),
		language: resolvedLanguage,
		preset: resolvedPreset,
		packageManager: resolvedPackageManager,
		database: resolvedDatabase,
		orm: resolvedOrm,
		tooling: resolvedTooling,
		git,
		docker,
		ci,
		install,
	};
}
