export const CLI_NAME = 'forgeloop';
export const CONFIG_FILE = 'forgeloop.config.mjs';
export const SUPPORTED_CONFIG_FILES = [
	CONFIG_FILE,
	'forgeloop.config.js',
	'forgeloop.config.cjs',
] as const;
export const LEGACY_MANIFEST_FILE = 'forgeloop.json';
export const MANIFEST_VERSION = 1;

export const SUPPORTED_LANGUAGES = ['ts', 'js'] as const;
export const SUPPORTED_PRESETS = ['basic', 'modular', 'advanced'] as const;
export const SUPPORTED_PACKAGE_MANAGERS = [
	'npm',
	'pnpm',
	'yarn',
	'bun',
] as const;
export const SUPPORTED_DATABASES = ['none', 'sqlite', 'postgresql'] as const;
export const SUPPORTED_ORMS = ['none', 'prisma'] as const;
export const SUPPORTED_TOOLING = ['eslint-prettier', 'biome', 'none'] as const;

export const DEFAULTS = {
	language: 'ts',
	preset: 'modular',
	packageManager: 'npm',
	database: 'none',
	orm: 'none',
	tooling: 'eslint-prettier',
} as const;
