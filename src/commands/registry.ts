export interface CommandHelpSpec {
	title: string;
	usage: string[];
	details: string[];
}

export interface CommandSpec {
	name: string;
	help: CommandHelpSpec;
}

export const CORE_COMMAND_SPECS: readonly CommandSpec[] = [
	{
		name: 'init',
		help: {
			title: 'forgeloop init',
			usage: [
				'forgeloop init [<project-name>] [--dir <path>] [--language ts|js]',
				'  [--preset basic|modular|advanced] [--package-manager npm|pnpm|yarn]',
				'  [--database none|sqlite|postgresql] [--orm none|prisma] [--tooling eslint-prettier|biome|none]',
				'  [--logging console|json] [--git] [--docker] [--ci] [--install] [--yes]',
			],
			details: [
				'Scaffolds a new bot. Without a project name, runs the interactive wizard (TTY).',
				'With --yes, a project name is required; prompts are skipped and defaults apply where omitted.',
			],
		},
	},
	{
		name: 'add',
		help: {
			title: 'forgeloop add',
			usage: [
				'forgeloop add command <name> [--description <text>] [--with-subcommands] [--autocomplete] [--dir <path>]',
				'forgeloop add context-menu <name> [--type user|message] [--dir <path>]',
				'forgeloop add event <eventName> [--once|--on] [--dir <path>]',
				'forgeloop add modal [--custom-id <id> | --regexp <pattern> [--regexp-flags <flags>] | <customId>] [--dir <path>]',
				'forgeloop add button [--custom-id <id> | --regexp <pattern> [--regexp-flags <flags>] | <customId>] [--dir <path>]',
				'forgeloop add select-menu [--custom-id <id> | --regexp <pattern> [--regexp-flags <flags>] | <customId>] [--dir <path>]',
			],
			details: [
				'Adds slash or context-menu commands (with optional subcommands/autocomplete stubs), Discord.js events, or component handlers (modal, button, string select).',
				'Modal, button, and select-menu: exact `customId`, `--regexp`, or hand-written `parseCustomId` / `matchCustomId` modules.',
				'Requires modular or advanced preset.',
			],
		},
	},
	{
		name: 'commands',
		help: {
			title: 'forgeloop commands',
			usage: [
				'forgeloop commands list [--dir <path>]',
				'forgeloop commands deploy [--guild|--global] [--dir <path>]',
			],
			details: [
				'`list` prints command names from `src/commands` without calling Discord.',
				'`deploy` uploads application commands to Discord (PUT).',
				'Use --guild for a test guild (needs GUILD_ID), or --global for global commands.',
				'Without these flags: development defaults to guild; production defaults to global.',
				'Requires DISCORD_TOKEN and CLIENT_ID (and GUILD_ID for guild sync).',
			],
		},
	},
	{
		name: 'remove',
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
		help: {
			title: 'forgeloop doctor',
			usage: [
				'forgeloop doctor [--dir <path>] [--verbose] [--json] [--strict] [--fix]',
				'  [--checks <groups>]',
			],
			details: [
				'Runs grouped diagnostics: config, structure, .env, package.json / node_modules, and (for modular/advanced) slash command module load checks.',
				'`--json` prints a machine-readable report to stdout.',
				'`--strict` fails on warnings as well as errors (useful in CI).',
				'`--fix` creates `.env` from `.env.example` when `.env` is missing.',
				'`--checks` is a comma-separated subset of: config, structure, env, deps, discord, network, tooling.',
				'Default groups omit `network` and `tooling` (opt-in via `--checks network,tooling`).',
			],
		},
	},
	{
		name: 'info',
		help: {
			title: 'forgeloop info',
			usage: ['forgeloop info [--dir <path>]'],
			details: ['Prints the ForgeLoop manifest summary for the project.'],
		},
	},
	{
		name: 'docs',
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
