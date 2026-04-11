import { stat } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
	CONFIG_FILE,
	DEFAULTS,
	SUPPORTED_DATABASES,
	SUPPORTED_LANGUAGES,
	SUPPORTED_LOGGERS,
	SUPPORTED_ORMS,
	SUPPORTED_PACKAGE_MANAGERS,
	SUPPORTED_PRESETS,
	SUPPORTED_TOOLING,
} from './constants.js';
import type {
	DatabaseProvider,
	ForgeLoopConfig,
	ForgeLoopManifest,
	InitOptions,
	Orm,
	ProjectLogging,
} from './types.js';
import { CliError } from './utils/errors.js';
import { pathExists } from './utils/fs.js';

export interface ManifestLocation {
	path: string;
	relativePath: string;
}

function toDatabaseConfig(
	database: InitOptions['database'],
	orm: InitOptions['orm'],
): ForgeLoopManifest['features']['database'] {
	if (database === 'none') {
		return null;
	}

	if (orm === 'none') {
		throw new CliError(
			'A database selection requires an ORM. Use --orm prisma.',
		);
	}

	return {
		orm: orm as Orm,
		provider: database as DatabaseProvider,
	};
}

function assertRecord(value: unknown, label: string) {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		throw new CliError(`Invalid ${label}. Expected an object.`);
	}

	return value as Record<string, unknown>;
}

function assertString(value: unknown, label: string) {
	if (typeof value !== 'string' || value.length === 0) {
		throw new CliError(`Invalid ${label}. Expected a non-empty string.`);
	}

	return value;
}

function assertOptionalString(value: unknown, label: string) {
	if (value === null) {
		return null;
	}

	return assertString(value, label);
}

function assertBoolean(value: unknown, label: string) {
	if (typeof value !== 'boolean') {
		throw new CliError(`Invalid ${label}. Expected a boolean.`);
	}

	return value;
}

function assertEnum<T extends readonly string[]>(
	value: unknown,
	supported: T,
	label: string,
): T[number] {
	if (typeof value !== 'string' || !supported.includes(value)) {
		throw new CliError(
			`Invalid ${label}. Supported values: ${supported.join(', ')}`,
		);
	}

	return value as T[number];
}

export function resolveProjectLogging(manifest: ForgeLoopManifest): ProjectLogging {
	return manifest.features.logging ?? DEFAULTS.logging;
}

export function createManifest(options: InitOptions): ForgeLoopManifest {
	const usesHandlers = options.preset !== 'basic';
	const usesCore = options.preset === 'advanced';
	return {
		projectName: options.projectName,
		createdAt: new Date().toISOString(),
		language: options.language,
		preset: options.preset,
		packageManager: options.packageManager,
		features: {
			docker: options.docker,
			ci: options.ci,
			git: options.git,
			tooling: options.tooling,
			logging: usesHandlers
				? (options.logging ?? DEFAULTS.logging)
				: undefined,
			database: toDatabaseConfig(options.database, options.orm),
		},
		paths: {
			srcDir: 'src',
			commandsDir: usesHandlers ? 'src/commands' : null,
			eventsDir: usesHandlers ? 'src/events' : null,
			configDir: 'src/config',
			coreDir: usesCore ? 'src/core' : null,
			interactionsDir: usesHandlers ? 'src/interactions' : null,
		},
	};
}

export async function resolveManifestLocation(projectDir: string) {
	const manifestPath = path.join(projectDir, CONFIG_FILE);
	if (await pathExists(manifestPath)) {
		return {
			path: manifestPath,
			relativePath: CONFIG_FILE,
		};
	}

	throw new CliError(
		`No ForgeLoop project config found in ${projectDir}. Expected ${CONFIG_FILE}.`,
	);
}

async function loadModuleManifest(manifestPath: string) {
	const manifestUrl = pathToFileURL(manifestPath);
	const metadata = await stat(manifestPath);
	manifestUrl.searchParams.set('t', String(metadata.mtimeMs));

	let module: { default?: unknown };
	try {
		module = (await import(manifestUrl.href)) as typeof module;
	} catch (error) {
		const message =
			error instanceof Error ? error.message : 'Unknown module loading error.';
		throw new CliError(
			`Failed to load ForgeLoop config at ${manifestPath}: ${message}`,
		);
	}

	if (!module.default || typeof module.default !== 'object' || Array.isArray(module.default)) {
		throw new CliError(
			`Invalid ForgeLoop config in ${manifestPath}. Export the config object as the default export.`,
		);
	}

	return module.default as ForgeLoopConfig;
}

export async function loadManifestWithLocation(projectDir: string) {
	const location = await resolveManifestLocation(projectDir);
	const manifest = await loadModuleManifest(location.path);
	validateManifest(manifest);
	return { manifest, location };
}

export async function loadManifest(projectDir: string) {
	const { manifest } = await loadManifestWithLocation(projectDir);
	return manifest;
}

export function validateManifest(manifest: ForgeLoopManifest) {
	const manifestRecord = assertRecord(manifest, 'manifest');

	assertString(manifestRecord.projectName, 'manifest.projectName');
	assertString(manifestRecord.createdAt, 'manifest.createdAt');
	assertEnum(
		manifestRecord.language,
		SUPPORTED_LANGUAGES,
		'manifest.language',
	);
	assertEnum(manifestRecord.preset, SUPPORTED_PRESETS, 'manifest.preset');
	assertEnum(
		manifestRecord.packageManager,
		SUPPORTED_PACKAGE_MANAGERS,
		'manifest.packageManager',
	);

	const features = assertRecord(manifestRecord.features, 'manifest.features');
	assertBoolean(features.docker, 'manifest.features.docker');
	assertBoolean(features.ci, 'manifest.features.ci');
	assertBoolean(features.git, 'manifest.features.git');
	assertEnum(
		features.tooling,
		SUPPORTED_TOOLING,
		'manifest.features.tooling',
	);

	if (features.logging !== undefined && features.logging !== null) {
		assertEnum(
			features.logging,
			SUPPORTED_LOGGERS,
			'manifest.features.logging',
		);
	}

	if (manifest.preset === 'basic' && features.logging !== undefined) {
		throw new CliError(
			'Invalid manifest.features.logging. Basic projects do not use logging mode.',
		);
	}

	if (features.database !== null) {
		const database = assertRecord(
			features.database,
			'manifest.features.database',
		);
		assertEnum(
			database.orm,
			SUPPORTED_ORMS.filter((orm) => orm !== 'none'),
			'manifest.features.database.orm',
		);
		assertEnum(
			database.provider,
			SUPPORTED_DATABASES.filter((provider) => provider !== 'none'),
			'manifest.features.database.provider',
		);
	}

	const paths = assertRecord(manifestRecord.paths, 'manifest.paths');
	assertString(paths.srcDir, 'manifest.paths.srcDir');
	assertString(paths.configDir, 'manifest.paths.configDir');
	assertOptionalString(paths.commandsDir, 'manifest.paths.commandsDir');
	assertOptionalString(paths.eventsDir, 'manifest.paths.eventsDir');
	assertOptionalString(paths.coreDir, 'manifest.paths.coreDir');
	if (
		paths.interactionsDir !== undefined &&
		paths.interactionsDir !== null
	) {
		assertString(paths.interactionsDir, 'manifest.paths.interactionsDir');
	}
}
