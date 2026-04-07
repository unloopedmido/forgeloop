import { CliError } from '../utils/errors.js';

let cachedDiscordEvents: string[] | null = null;
const DISCORD_EVENTS_DOCS_URL =
	'https://discord.js.org/docs/packages/discord.js/main/Events%3AEnum';

export async function getDiscordEventNames() {
	if (cachedDiscordEvents) {
		return cachedDiscordEvents;
	}

	try {
		const discordJs = await import('discord.js');
		const eventNames = [
			...new Set(Object.values(discordJs.Events).map((value) => String(value))),
		].sort((left, right) => left.localeCompare(right));
		cachedDiscordEvents = eventNames;
		return eventNames;
	} catch {
		throw new CliError(
			'ForgeLoop could not load discord.js to resolve valid event names. Install CLI dependencies first.',
		);
	}
}

export async function assertDiscordEventName(name: string) {
	const events = await getDiscordEventNames();
	if (events.includes(name)) {
		return name;
	}

	throw new CliError(
		`Invalid Discord.js event "${name}". See the official event reference: ${DISCORD_EVENTS_DOCS_URL}`,
	);
}
