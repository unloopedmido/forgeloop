import path from 'node:path';
import { MANIFEST_FILE, MANIFEST_VERSION } from './constants.js';
import type {
	DatabaseProvider,
	ForgeLoopManifest,
	InitOptions,
	Orm,
} from './types.js';
import { CliError } from './utils/errors.js';
import { pathExists, readJsonFile } from './utils/fs.js';

const SCHEMA_URL =
	'https://raw.githubusercontent.com/unloopedmido/forgeloop/main/schemas/project-manifest.v1.json';

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
		$schema: SCHEMA_URL,
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

export async function loadManifest(projectDir: string) {
	const manifestPath = path.join(projectDir, MANIFEST_FILE);
	if (!(await pathExists(manifestPath))) {
		throw new CliError(`No ${MANIFEST_FILE} found in ${projectDir}.`);
	}

	const manifest = await readJsonFile<ForgeLoopManifest>(manifestPath);
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
