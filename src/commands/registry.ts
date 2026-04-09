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
				'  [--preset basic|modular|advanced] [--package-manager npm|pnpm|yarn|bun]',
				'  [--database none|sqlite|postgresql] [--orm none|prisma] [--tooling eslint-prettier|biome|none]',
				'  [--git] [--docker] [--ci] [--install] [--dry-run] [--yes]',
			],
			details: [
				'Scaffolds a new bot. Without a project name, runs the interactive wizard (TTY).',
				'With --yes, a project name is required; prompts are skipped and defaults apply where omitted.',
				'Use --dry-run to preview generated files without writing to disk.',
			],
		},
	},
	{
		name: 'add',
		summary: 'Generate command/event handlers',
		help: {
			title: 'forgeloop add',
			usage: [
				'forgeloop add command <name> [--description <text>] [--dir <path>]',
				'forgeloop add event <eventName> [--once|--on] [--dir <path>]',
			],
			details: [
				'Adds a slash command or Discord.js event handler file.',
				'Requires modular or advanced preset.',
			],
		},
	},
	{
		name: 'deploy',
		summary: 'Push slash commands to Discord',
		help: {
			title: 'forgeloop deploy',
			usage: [
				'forgeloop deploy commands [--guild|--global] [--dir <path>]',
			],
			details: [
				'Uploads slash command definitions from src/commands to Discord (PUT application commands).',
				'Use --guild for a test guild (needs GUILD_ID), or --global for global commands.',
				'Without these flags: development defaults to guild; production defaults to global.',
				'Requires DISCORD_TOKEN and CLIENT_ID (and GUILD_ID for guild sync).',
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
