import type {
	SUPPORTED_DATABASES,
	SUPPORTED_LANGUAGES,
	SUPPORTED_LOGGERS,
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
export type ProjectLogging = (typeof SUPPORTED_LOGGERS)[number];

/** How generated modal/button/select handler modules match `interaction.customId`. */
export type InteractionTemplateSpec =
	| { match: 'exact'; value: string }
	| { match: 'regexp'; pattern: string; flags: string };

export interface ForgeLoopManifest {
	projectName: string;
	createdAt: string;
	language: Language;
	preset: Preset;
	packageManager: PackageManager;
	features: {
		docker: boolean;
		ci: boolean;
		git: boolean;
		tooling: Tooling;
		/** Handler presets: how `src/lib/logger.ts` formats runtime logs. */
		logging?: ProjectLogging;
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
		/** Handler projects only: generated interaction components (modals, buttons, selects). */
		interactionsDir?: string | null;
	};
}

export type ForgeLoopConfig = ForgeLoopManifest;

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
	/** Used for modular/advanced scaffolds (`manifest.features.logging`). */
	logging?: ProjectLogging;
}
