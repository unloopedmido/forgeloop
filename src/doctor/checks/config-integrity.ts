import path from 'node:path';
import { LEGACY_MANIFEST_FILE } from '../../constants.js';
import { hasHandlers } from '../../generators/runtime.js';
import { pathExists } from '../../utils/fs.js';
import type { DoctorCheck, DoctorContext, DoctorIssue } from '../types.js';

async function runConfigIntegrity(ctx: DoctorContext): Promise<DoctorIssue[]> {
	const issues: DoctorIssue[] = [];
	const { projectDir, manifest, location } = ctx;

	if (
		location.relativePath !== LEGACY_MANIFEST_FILE &&
		(await pathExists(path.join(projectDir, LEGACY_MANIFEST_FILE)))
	) {
		issues.push({
			code: 'CONFIG_LEGACY_DRIFT',
			severity: 'warning',
			group: 'config',
			title: 'Legacy manifest alongside modern config',
			message: `Found ${LEGACY_MANIFEST_FILE} while the active config is ${location.relativePath}. Remove or migrate the legacy file to avoid confusion.`,
			fixes: [
				`Delete ${LEGACY_MANIFEST_FILE} if you no longer need it, or consolidate settings into ${location.relativePath}.`,
			],
			evidence: { activeConfig: location.relativePath },
		});
	}

	const { commandsDir, eventsDir } = manifest.paths;
	const hasCmd = Boolean(commandsDir);
	const hasEvt = Boolean(eventsDir);
	if (hasCmd !== hasEvt) {
		issues.push({
			code: 'STRUCT_PARTIAL_DRIFT',
			severity: 'error',
			group: 'config',
			title: 'Handler directories are inconsistent',
			message:
				'Manifest declares one of commandsDir/eventsDir but not both. ForgeLoop handler projects require both.',
			fixes: [
				'Restore the missing directory and matching manifest.paths entry, or re-init a modular/advanced project.',
				'Run `forgeloop info --dir .` to confirm preset and paths.',
			],
			evidence: {
				commandsDir: commandsDir ?? '(null)',
				eventsDir: eventsDir ?? '(null)',
			},
		});
	}

	if (manifest.preset === 'basic' && hasHandlers(manifest)) {
		issues.push({
			code: 'CONFIG_PRESET_PATH_MISMATCH',
			severity: 'error',
			group: 'config',
			title: 'Basic preset with handler paths',
			message:
				'Preset is "basic" but manifest includes handler directories. This is invalid for ForgeLoop.',
			fixes: ['Fix manifest.paths.commandsDir and eventsDir to null for basic projects.'],
		});
	}

	return issues;
}

export const configIntegrityCheck: DoctorCheck = {
	id: 'config-integrity',
	title: 'Config and manifest consistency',
	group: 'config',
	defaultEnabled: true,
	cost: 'fast',
	run: runConfigIntegrity,
};
