import { stat } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
	LEGACY_MANIFEST_FILE,
	MANIFEST_VERSION,
	SUPPORTED_CONFIG_FILES,
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
			`Invalid ForgeLoop config in ${manifestPath}. Export a default object from the config file.`,
		);
	}

	return manifest as ForgeLoopConfig;
}

export async function loadManifest(projectDir: string) {
	const manifestLocation = await resolveManifestLocation(projectDir);
	const manifest =
		manifestLocation.format === 'json'
			? await readJsonFile<ForgeLoopManifest>(manifestLocation.path)
			: await loadModuleManifest(manifestLocation.path);
	validateManifest(manifest);
	return manifest;
}

export function validateManifest(manifest: ForgeLoopManifest) {
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
}
