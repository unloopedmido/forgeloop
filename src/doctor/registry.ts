import { configIntegrityCheck } from './checks/config-integrity.js';
import { depsCheck } from './checks/deps.js';
import { discordWorkflowCheck } from './checks/discord-workflow.js';
import { envCheck } from './checks/env.js';
import { networkCheck } from './checks/network.js';
import { structureCheck } from './checks/structure.js';
import { toolingCheck } from './checks/tooling.js';
import type { DoctorCheck, DoctorGroup } from './types.js';

export const DOCTOR_CHECKS: readonly DoctorCheck[] = [
	configIntegrityCheck,
	structureCheck,
	envCheck,
	depsCheck,
	discordWorkflowCheck,
	networkCheck,
	toolingCheck,
] as const;

export function checksForGroups(groups: Set<DoctorGroup>): DoctorCheck[] {
	return DOCTOR_CHECKS.filter((c) => groups.has(c.group));
}
