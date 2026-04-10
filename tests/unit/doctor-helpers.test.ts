import { describe, expect, it } from 'vitest';
import {
	parseDoctorGroupsFlag,
	defaultDoctorGroupSet,
} from '../../src/doctor/resolve-groups.js';
import {
	summarizeIssues,
	shouldFail,
} from '../../src/doctor/runner.js';
import type { DoctorIssue } from '../../src/doctor/types.js';
import { CliError } from '../../src/utils/errors.js';

describe('parseDoctorGroupsFlag', () => {
	it('returns null for empty input', () => {
		expect(parseDoctorGroupsFlag(undefined)).toBeNull();
		expect(parseDoctorGroupsFlag('')).toBeNull();
		expect(parseDoctorGroupsFlag('  ')).toBeNull();
	});

	it('parses comma-separated groups', () => {
		const set = parseDoctorGroupsFlag('config, env')!;
		expect(set.has('config')).toBe(true);
		expect(set.has('env')).toBe(true);
	});

	it('rejects unknown groups', () => {
		expect(() => parseDoctorGroupsFlag('nope')).toThrow(CliError);
	});
});

describe('defaultDoctorGroupSet', () => {
	it('includes core groups', () => {
		const set = defaultDoctorGroupSet();
		expect(set.has('config')).toBe(true);
		expect(set.has('deps')).toBe(true);
	});
});

describe('runner helpers', () => {
	it('summarizeIssues counts severities', () => {
		const issues: DoctorIssue[] = [
			{
				code: 'a',
				severity: 'error',
				group: 'config',
				title: 't',
				message: 'm',
				fixes: [],
			},
			{
				code: 'b',
				severity: 'warning',
				group: 'env',
				title: 't',
				message: 'm',
				fixes: [],
			},
			{
				code: 'c',
				severity: 'info',
				group: 'deps',
				title: 't',
				message: 'm',
				fixes: [],
			},
		];
		expect(summarizeIssues(issues)).toEqual({
			errors: 1,
			warnings: 1,
			infos: 1,
		});
	});

	it('shouldFail follows error and strict rules', () => {
		expect(shouldFail({ errors: 1, warnings: 0, infos: 0 }, false)).toBe(
			true,
		);
		expect(shouldFail({ errors: 0, warnings: 2, infos: 0 }, false)).toBe(
			false,
		);
		expect(shouldFail({ errors: 0, warnings: 2, infos: 0 }, true)).toBe(true);
	});
});
