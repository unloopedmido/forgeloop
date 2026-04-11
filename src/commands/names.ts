import { CliError } from '../utils/errors.js';

export function normalizeCommandName(name: string) {
	if (!/^[a-z0-9-_]+$/i.test(name)) {
		throw new CliError(
			`Invalid command name "${name}". Use letters, numbers, hyphens, or underscores.`,
		);
	}

	return name.toLowerCase();
}

export function normalizeEventName(name: string) {
	if (!/^[a-zA-Z0-9]+$/.test(name)) {
		throw new CliError(
			`Invalid event name "${name}". Use the exact Discord.js event name, for example "messageCreate".`,
		);
	}

	return name;
}
