import { CliError } from '../utils/errors.js';
import { DISCORD_EVENT_NAMES } from './events.generated.js';

const DISCORD_EVENTS_DOCS_URL =
	'https://discord.js.org/docs/packages/discord.js/main/Events%3AEnum';
const DISCORD_EVENT_NAME_SET = new Set<string>(DISCORD_EVENT_NAMES);

export function getDiscordEventNames() {
	return DISCORD_EVENT_NAMES;
}

export function assertDiscordEventName(name: string) {
	if (DISCORD_EVENT_NAME_SET.has(name)) {
		return name;
	}

	throw new CliError(
		`Invalid Discord.js event "${name}". See the official event reference: ${DISCORD_EVENTS_DOCS_URL}`,
	);
}
