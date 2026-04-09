export interface CommandHelpSpec {
	title: string;
	usage: string[];
	details: string[];
}

export interface CommandSpec {
	name: string;
	summary: string;
	help: CommandHelpSpec;
}

export const CORE_COMMAND_SPECS: readonly CommandSpec[] = [
	{
		name: 'init',
		summary: 'Scaffold a new bot project',
		help: {
			title: 'forgeloop init',
			usage: [
				'forgeloop init [<project-name>] [--dir <path>] [--language ts|js]',
				'  [--preset basic|modular|advanced] [--package-manager npm|pnpm|yarn]',
				'  [--database none|sqlite|postgresql] [--orm none|prisma] [--tooling eslint-prettier|biome|none]',
				'  [--git] [--docker] [--ci] [--install] [--yes]',
			],
			details: [
				'Scaffolds a new bot. Without a project name, runs the interactive wizard (TTY).',
				'With --yes, a project name is required; prompts are skipped and defaults apply where omitted.',
			],
		},
	},
	{
		name: 'add',
		summary: 'Generate handlers, commands, and interaction components',
		help: {
			title: 'forgeloop add',
			usage: [
				'forgeloop add command <name> [--description <text>] [--dir <path>]',
				'forgeloop add event <eventName> [--once|--on] [--dir <path>]',
				'forgeloop add modal [--custom-id <id>] [<customId>] [--dir <path>]',
				'forgeloop add button [--custom-id <id>] [<customId>] [--dir <path>]',
				'forgeloop add select-menu [--custom-id <id>] [<customId>] [--dir <path>]',
			],
			details: [
				'Adds a slash command, Discord.js event handler, or interaction handler (modal, button, string select menu).',
				'Modal, button, and select-menu require a customId (flag or positional).',
				'Requires modular or advanced preset.',
			],
		},
	},
	{
		name: 'commands',
		summary: 'List or deploy slash commands',
		help: {
			title: 'forgeloop commands',
			usage: [
				'forgeloop commands list [--dir <path>]',
				'forgeloop commands deploy [--guild|--global] [--dir <path>]',
			],
			details: [
				'`list` prints slash command names from `src/commands` without calling Discord.',
				'`deploy` uploads commands to Discord (PUT application commands).',
				'Use --guild for a test guild (needs GUILD_ID), or --global for global commands.',
				'Without these flags: development defaults to guild; production defaults to global.',
				'Requires DISCORD_TOKEN and CLIENT_ID (and GUILD_ID for guild sync).',
			],
		},
	},
	{
		name: 'remove',
		summary: 'Remove a generated handler file',
		help: {
			title: 'forgeloop remove',
			usage: [
				'forgeloop remove command <name> [--sync] [--guild|--global] [--dir <path>]',
				'forgeloop remove event <eventName> [--dir <path>]',
				'forgeloop remove modal [--custom-id <id>] [<customId>] [--dir <path>]',
				'forgeloop remove button [--custom-id <id>] [<customId>] [--dir <path>]',
				'forgeloop remove select-menu [--custom-id <id>] [<customId>] [--dir <path>]',
			],
			details: [
				'Deletes the matching file from disk.',
				'`--sync` after removing a slash command re-runs `forgeloop commands deploy` and requires Discord credentials.',
			],
		},
	},
	{
		name: 'doctor',
		summary: 'Check project health',
		help: {
			title: 'forgeloop doctor',
			usage: ['forgeloop doctor [--dir <path>]'],
			details: [
				'Checks that expected config and feature files exist for this ForgeLoop project.',
			],
		},
	},
	{
		name: 'info',
		summary: 'Print project manifest summary',
		help: {
			title: 'forgeloop info',
			usage: ['forgeloop info [--dir <path>]'],
			details: ['Prints the ForgeLoop manifest summary for the project.'],
		},
	},
	{
		name: 'docs',
		summary: 'Open the ForgeLoop documentation site',
		help: {
			title: 'forgeloop docs',
			usage: ['forgeloop docs'],
			details: [
				'Opens the default browser to the published documentation site.',
			],
		},
	},
] as const;

export const AUX_COMMAND_NAMES = ['help', 'version'] as const;

export const CORE_COMMAND_NAMES = CORE_COMMAND_SPECS.map(
	(spec) => spec.name,
) as readonly string[];

export const ALL_COMMAND_NAMES = [
	...CORE_COMMAND_NAMES,
	...AUX_COMMAND_NAMES,
] as const;

export const CREATE_DIRECT_COMMANDS = new Set<string>([
	...ALL_COMMAND_NAMES,
	'--help',
]);

export const COMMAND_CANDIDATES = [...ALL_COMMAND_NAMES] as const;

export function getCommandSpec(commandName: string) {
	return CORE_COMMAND_SPECS.find((spec) => spec.name === commandName) ?? null;
}
