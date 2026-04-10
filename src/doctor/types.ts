import type { ForgeLoopManifest } from '../types.js';

export type DoctorSeverity = 'error' | 'warning' | 'info';

/** Logical groups; `network` and `tooling` are opt-in via `--checks`. */
export type DoctorGroup =
	| 'config'
	| 'structure'
	| 'env'
	| 'deps'
	| 'discord'
	| 'network'
	| 'tooling';

export const DEFAULT_DOCTOR_GROUPS: readonly DoctorGroup[] = [
	'config',
	'structure',
	'env',
	'deps',
	'discord',
] as const;

export const ALL_DOCTOR_GROUPS: readonly DoctorGroup[] = [
	'config',
	'structure',
	'env',
	'deps',
	'discord',
	'network',
	'tooling',
] as const;

export interface ManifestLocation {
	path: string;
	relativePath: string;
	format: 'module' | 'json';
}

export interface DoctorIssue {
	code: string;
	severity: DoctorSeverity;
	group: DoctorGroup;
	title: string;
	message: string;
	fixes: string[];
	/** Non-secret diagnostic hints (verbose / JSON only). */
	evidence?: Record<string, string>;
}

export interface DoctorContext {
	projectDir: string;
	manifest: ForgeLoopManifest;
	location: ManifestLocation;
	verbose: boolean;
	/** Parsed package.json or null if missing/unreadable. */
	packageJson: Record<string, unknown> | null;
}

export type DoctorCheckCost = 'fast' | 'moderate';

export interface DoctorCheck {
	id: string;
	title: string;
	group: DoctorGroup;
	/** Included in default run unless group filtered out. */
	defaultEnabled: boolean;
	cost: DoctorCheckCost;
	run: (ctx: DoctorContext) => Promise<DoctorIssue[]>;
}

export interface DoctorRunOptions {
	projectDir: string;
	verbose: boolean;
	json: boolean;
	strict: boolean;
	fix: boolean;
	/** If empty, use DEFAULT_DOCTOR_GROUPS plus any explicitly requested extras handled by resolver. */
	groups: Set<DoctorGroup> | null;
}

export interface DoctorSummary {
	errors: number;
	warnings: number;
	infos: number;
}
