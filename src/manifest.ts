import { stat } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
	LEGACY_MANIFEST_FILE,
	MANIFEST_VERSION,
	SUPPORTED_DATABASES,
	SUPPORTED_CONFIG_FILES,
	SUPPORTED_LANGUAGES,
	SUPPORTED_ORMS,
	SUPPORTED_PACKAGE_MANAGERS,
	SUPPORTED_PRESETS,
	SUPPORTED_TOOLING,
} from './constants.js';
import type {
	DatabaseProvider,
	ForgeLoopManifest,
	ForgeLoopConfig,
	InitOptions,
	Orm,
} from './types.js';
import { CliError } from './utils/errors.js';
import { pathExists, readJsonFile } from './utils/fs.js';

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

export function createManifest(options: InitOptions): ForgeLoopManifest {
	const usesHandlers = options.preset !== 'basic';
	const usesCore = options.preset === 'advanced';
	return {
		manifestVersion: MANIFEST_VERSION,
		projectName: options.projectName,
		createdAt: new Date().toISOString(),
		runtime: 'node',
		framework: 'discord.js',
		language: options.language,
		preset: options.preset,
		packageManager: options.packageManager,
		features: {
			docker: options.docker,
			ci: options.ci,
			git: options.git,
			tooling: options.tooling,
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
	for (const fileName of SUPPORTED_CONFIG_FILES) {
		const manifestPath = path.join(projectDir, fileName);
		if (await pathExists(manifestPath)) {
			return {
				path: manifestPath,
				relativePath: fileName,
				format: 'module' as const,
			};
		}
	}

	const legacyManifestPath = path.join(projectDir, LEGACY_MANIFEST_FILE);
	if (await pathExists(legacyManifestPath)) {
		return {
			path: legacyManifestPath,
			relativePath: LEGACY_MANIFEST_FILE,
			format: 'json' as const,
		};
	}

	throw new CliError(
		`No ForgeLoop project config found in ${projectDir}. Expected one of ${SUPPORTED_CONFIG_FILES.join(', ')} or ${LEGACY_MANIFEST_FILE}.`,
	);
}

async function loadModuleManifest(manifestPath: string) {
	const manifestUrl = pathToFileURL(manifestPath);
	const metadata = await stat(manifestPath);
	manifestUrl.searchParams.set('t', String(metadata.mtimeMs));
	let module: {
		default?: unknown;
		config?: unknown;
		manifest?: unknown;
	};

	try {
		module = (await import(manifestUrl.href)) as typeof module;
	} catch (error) {
		const message =
			error instanceof Error ? error.message : 'Unknown module loading error.';
		throw new CliError(
			`Failed to load ForgeLoop config at ${manifestPath}: ${message}`,
		);
	}
	const manifest = module.default ?? module.config ?? module.manifest;

	if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
		throw new CliError(
			`Invalid ForgeLoop config in ${manifestPath}. Export an object as "default", "config", or "manifest".`,
		);
	}

	return manifest as ForgeLoopConfig;
}

export async function loadManifestWithLocation(projectDir: string) {
	const location = await resolveManifestLocation(projectDir);
	const manifest =
		location.format === 'json'
			? await readJsonFile<ForgeLoopManifest>(location.path)
			: await loadModuleManifest(location.path);
	validateManifest(manifest);
	return { manifest, location };
}

export async function loadManifest(projectDir: string) {
	const { manifest } = await loadManifestWithLocation(projectDir);
	return manifest;
}

export function validateManifest(manifest: ForgeLoopManifest) {
	const manifestRecord = assertRecord(manifest, 'manifest');
	if (manifest.manifestVersion !== MANIFEST_VERSION) {
		throw new CliError(
			`Unsupported manifest version ${manifest.manifestVersion}. Expected ${MANIFEST_VERSION}.`,
		);
	}

	if (manifest.runtime !== 'node') {
		throw new CliError(`Unsupported runtime "${manifest.runtime}".`);
	}

	if (manifest.framework !== 'discord.js') {
		throw new CliError(`Unsupported framework "${manifest.framework}".`);
	}

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
