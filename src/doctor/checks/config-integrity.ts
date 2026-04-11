import { hasHandlers } from '../../generators/runtime.js';
import type { DoctorCheck, DoctorContext, DoctorIssue } from '../types.js';

async function runConfigIntegrity(ctx: DoctorContext): Promise<DoctorIssue[]> {
	const issues: DoctorIssue[] = [];
	const { manifest } = ctx;

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
	group: 'config',
	run: runConfigIntegrity,
};
