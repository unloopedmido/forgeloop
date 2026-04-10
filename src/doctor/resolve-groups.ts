import { CliError } from '../utils/errors.js';
import {
	ALL_DOCTOR_GROUPS,
	DEFAULT_DOCTOR_GROUPS,
	type DoctorGroup,
} from './types.js';

const GROUP_SET = new Set<string>(ALL_DOCTOR_GROUPS);

export function parseDoctorGroupsFlag(
	value: string | undefined,
): Set<DoctorGroup> | null {
	if (value === undefined || value.trim() === '') {
		return null;
	}

	const parts = value
		.split(',')
		.map((s) => s.trim())
		.filter(Boolean);
	const out = new Set<DoctorGroup>();

	for (const part of parts) {
		if (!GROUP_SET.has(part)) {
			throw new CliError(
				`Unknown doctor check group "${part}". Valid groups: ${ALL_DOCTOR_GROUPS.join(', ')}.`,
			);
		}

		out.add(part as DoctorGroup);
	}

	return out;
}

/** Default groups when `--checks` is omitted. */
export function defaultDoctorGroupSet(): Set<DoctorGroup> {
	return new Set(DEFAULT_DOCTOR_GROUPS);
}
