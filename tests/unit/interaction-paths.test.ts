import { describe, expect, it } from 'vitest';
import {
	assertValidRegExpFlags,
	assertValidRegExpPattern,
	customIdToFileSlug,
} from '../../src/utils/interaction-paths.js';
import { CliError } from '../../src/utils/errors.js';

describe('interaction-paths', () => {
	it('slugifies custom ids for filenames', () => {
		expect(customIdToFileSlug('my_button_v2')).toBe('my_button_v2');
	});

	it('validates regexp flags and patterns for button handlers', () => {
		expect(() => assertValidRegExpFlags('i')).not.toThrow();
		expect(() => assertValidRegExpFlags('bad')).toThrow(CliError);
		expect(() => assertValidRegExpPattern('^[a-z]+$', '')).not.toThrow();
	});
});
