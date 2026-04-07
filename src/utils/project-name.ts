import { CliError } from './errors.js';

export function validateProjectName(name: string) {
	if (!name.trim()) {
		return 'Project name is required.';
	}

	if (!/^[a-z0-9-_]+$/i.test(name)) {
		return 'Use letters, numbers, hyphens, or underscores.';
	}

	return null;
}

export function normalizeProjectName(name: string) {
	const trimmed = name.trim();
	const validationError = validateProjectName(trimmed);
	if (validationError) {
		throw new CliError(validationError);
	}

	return trimmed;
}
