import type { ManifestLocation } from '../manifest.js';
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

export interface DoctorCheck {
	group: DoctorGroup;
	run: (ctx: DoctorContext) => Promise<DoctorIssue[]>;
}

export interface DoctorSummary {
	errors: number;
	warnings: number;
	infos: number;
}
