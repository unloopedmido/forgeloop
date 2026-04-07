import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
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
import { createManifest } from '../manifest.js';
import { renderProjectFiles } from '../generators/templates.js';
import type { InitOptions, PackageManager, ParsedArgs } from '../types.js';
import { getBooleanFlag, getFlag } from '../utils/args.js';
import { CliError } from '../utils/errors.js';
import { ensureDirectory, writeFiles } from '../utils/fs.js';
import { Output } from '../utils/format.js';
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

async function resolveInitOptions(
	args: ParsedArgs,
	output: Output,
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
	let language = getFlag(args.flags, 'language') as string | undefined;
	let preset = getFlag(args.flags, 'preset') as string | undefined;
	let packageManager = getFlag(args.flags, 'package-manager') as
		| string
		| undefined;
	let database = getFlag(args.flags, 'database') as string | undefined;
	let orm = getFlag(args.flags, 'orm') as string | undefined;
	let tooling = getFlag(args.flags, 'tooling') as string | undefined;
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
					{ label: 'bun', value: 'bun' },
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
	const resolvedTooling = parseSelection(
		tooling ?? DEFAULTS.tooling,
		SUPPORTED_TOOLING,
		'tooling',
	);

	return {
		projectName: resolvedProjectName,
		targetDir: path.resolve(
			(getFlag(args.flags, 'dir') as string | undefined) ?? resolvedProjectName,
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

async function resolveCurrentCliPackage() {
	const packageJsonUrl = new URL('../../package.json', import.meta.url);
	const packageJsonRaw = await readFile(packageJsonUrl, 'utf8').catch(
		() => null,
	);

	if (packageJsonRaw) {
		const packageJson = JSON.parse(packageJsonRaw) as {
			name?: string;
			version?: string;
		};
		return {
			name: packageJson.name ?? 'create-forgeloop',
			version: packageJson.version ?? 'latest',
		};
	}

	return {
		name: 'create-forgeloop',
		version: 'latest',
	};
}

export function resolvePackageManagerCommand(
	packageManager: PackageManager,
	platform = process.platform,
) {
	if (platform === 'win32' && ['npm', 'pnpm', 'yarn'].includes(packageManager)) {
		return `${packageManager}.cmd`;
	}

	return packageManager;
}

export function shouldUseShellForPackageManager(
	packageManager: PackageManager,
	platform = process.platform,
) {
	return (
		platform === 'win32' && ['npm', 'pnpm', 'yarn'].includes(packageManager)
	);
}

async function runInstall(
	targetDir: string,
	packageManager: InitOptions['packageManager'],
) {
	const command = {
		cmd: resolvePackageManagerCommand(packageManager),
		args: ['install'],
	};

	await new Promise<void>((resolve, reject) => {
		const child = spawn(command.cmd, command.args, {
			cwd: targetDir,
			stdio: 'inherit',
			shell: shouldUseShellForPackageManager(packageManager),
		});

		child.on('exit', (code) => {
			if (code === 0) {
				resolve();
				return;
			}
			reject(
				new CliError(
					`${packageManager} install failed with exit code ${code ?? 'unknown'}.`,
				),
			);
		});
		child.on('error', (error) => reject(error));
	});
}

async function initializeGitRepository(targetDir: string) {
	await new Promise<void>((resolve, reject) => {
		const child = spawn('git', ['init'], {
			cwd: targetDir,
			stdio: 'ignore',
			shell: false,
		});

		child.on('exit', (code) => {
			if (code === 0) {
				resolve();
				return;
			}
			reject(
				new CliError(`git init failed with exit code ${code ?? 'unknown'}.`),
			);
		});
		child.on('error', (error) => reject(error));
	});
}

export async function runInit(args: ParsedArgs, output = new Output()) {
	const options = await resolveInitOptions(args, output);
	const manifest = createManifest(options);
	const cliPackage = await resolveCurrentCliPackage();
	const files = renderProjectFiles(manifest, {
		cliPackageName: cliPackage.name,
		cliPackageVersion:
			cliPackage.version === 'latest'
				? 'latest'
				: `^${cliPackage.version}`,
	});

	output.banner(
		'ForgeLoop init',
		`Scaffolding ${options.projectName} in ${options.targetDir}`,
	);
	await ensureDirectory(options.targetDir);
	await writeFiles(options.targetDir, files);

	output.section('Project profile');
	output.item('Language', options.language);
	output.item('Preset', options.preset);
	output.item('Package manager', options.packageManager);
	output.item(
		'Database',
		options.database === 'none'
			? 'none'
			: `${options.database} via ${options.orm}`,
	);
	output.item('Tooling', options.tooling);
	output.item('Git', options.git ? 'enabled' : 'disabled');
	output.item('Docker', options.docker ? 'enabled' : 'disabled');
	output.item('CI', options.ci ? 'enabled' : 'disabled');
	output.callout('What you are getting', [
		`${options.language.toUpperCase()} ${options.preset} starter`,
		options.database === 'none'
			? 'No database layer'
			: `${options.database} database wiring with ${options.orm}`,
		options.tooling === 'none'
			? 'No lint/format tooling config'
			: `${options.tooling} project tooling`,
		options.git
			? 'Git repository initialized with ignore rules'
			: 'No git repository or ignore rules',
		options.docker
			? 'Dockerfile and container ignore rules'
			: 'No containerization files',
		options.ci ? 'GitHub Actions validation workflow' : 'No CI workflow',
	]);

	if (options.git) {
		output.info('Initializing git repository...');
		await initializeGitRepository(options.targetDir);
	}

	if (options.install) {
		output.info(`Installing dependencies with ${options.packageManager}...`);
		await runInstall(options.targetDir, options.packageManager);
	}

	output.success(`Project ready at ${options.targetDir}`);
	output.plain(
		`Next step: cd ${options.targetDir} && ${options.packageManager} run dev`,
	);
}
