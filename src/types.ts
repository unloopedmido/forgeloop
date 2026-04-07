import type {
	SUPPORTED_DATABASES,
	SUPPORTED_LANGUAGES,
	SUPPORTED_ORMS,
	SUPPORTED_PACKAGE_MANAGERS,
	SUPPORTED_PRESETS,
	SUPPORTED_TOOLING,
} from './constants.js';

export type Language = (typeof SUPPORTED_LANGUAGES)[number];
export type Preset = (typeof SUPPORTED_PRESETS)[number];
export type PackageManager = (typeof SUPPORTED_PACKAGE_MANAGERS)[number];
export type DatabaseProvider = Exclude<
	(typeof SUPPORTED_DATABASES)[number],
	'none'
>;
export type DatabaseSelection = (typeof SUPPORTED_DATABASES)[number];
export type Orm = Exclude<(typeof SUPPORTED_ORMS)[number], 'none'>;
export type OrmSelection = (typeof SUPPORTED_ORMS)[number];
export type Tooling = (typeof SUPPORTED_TOOLING)[number];

export interface ForgeLoopManifest {
	$schema?: string;
	manifestVersion: number;
	projectName: string;
	createdAt: string;
	runtime: 'node';
	framework: 'discord.js';
	language: Language;
	preset: Preset;
	packageManager: PackageManager;
	features: {
		docker: boolean;
		ci: boolean;
		git: boolean;
		tooling: Tooling;
		database: null | {
			orm: Orm;
			provider: DatabaseProvider;
		};
	};
	paths: {
		srcDir: string;
		commandsDir: string | null;
		eventsDir: string | null;
		configDir: string;
		coreDir: string | null;
	};
}

export type ForgeLoopConfig = Omit<ForgeLoopManifest, '$schema'>;

export interface ParsedArgs {
	command: string | null;
	subcommands: string[];
	flags: Map<string, string | boolean>;
	positionals: string[];
}

export interface InitOptions {
	projectName: string;
	targetDir: string;
	language: Language;
	preset: Preset;
	packageManager: PackageManager;
	database: DatabaseSelection;
	orm: OrmSelection;
	tooling: Tooling;
	git: boolean;
	docker: boolean;
	ci: boolean;
	install: boolean;
}

export interface AddArtifactOptions {
	projectDir: string;
	name: string;
}
