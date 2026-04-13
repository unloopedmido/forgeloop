import { CLI_NAME } from '../constants.js';
import { resolveCurrentCliPackage } from './init-runtime.js';
import {
	CORE_COMMAND_SPECS,
	getCommandSpec,
} from './registry.js';
import { Output, type OutputWriter } from '../utils/format.js';

export function renderHelp(output: OutputWriter = new Output()) {
	output.hero(
		'Build and grow Discord bots without hand-wiring the boilerplate.',
		'Interactive project setup, managed generators, and safer maintenance flows.',
	);
	output.section('Core Commands');
	for (const spec of CORE_COMMAND_SPECS) {
		output.item(`${CLI_NAME} ${spec.name}`, spec.help.summary);
	}
	output.item(`${CLI_NAME} version`, 'Print the CLI version.');
	output.section('Global');
	output.plain(`  ${CLI_NAME} help`);
	output.plain(`  ${CLI_NAME} <command> --help`);
	output.plain(`  ${CLI_NAME} --help   (alias: -h)`);
	output.plain(`  ${CLI_NAME} --version   (alias: -V)`);
	output.section('Init wizard');
	output.plain(`  ${CLI_NAME} init`);
	output.plain(
		'  Runs an interactive setup flow when no project name or flags are provided.',
	);
	output.plain(
		'  Shapes: basic = inline bot, modular = handlers, advanced = core architecture.',
	);
	output.section('Feature Flags');
	output.plain('  --database sqlite|postgresql');
	output.plain('  --orm prisma');
	output.plain('  --tooling eslint-prettier|biome|none');
	output.plain('  --git');
	output.plain('  --docker');
	output.plain('  --ci');
	output.plain('  --install');
	output.plain('  --yes   (alias: -y; non-interactive / skip prompts)');
	output.plain('  --dir <path>   (alias: -d <path>)');
	output.section('Doctor');
	output.plain(
		'  forgeloop doctor [--verbose] [--json] [--strict] [--fix] [--checks <groups>]',
	);
	output.plain(
		'  `--fix` restores missing scaffold-managed files and fills simple config/package gaps.',
	);
}

export async function renderVersion(output: OutputWriter = new Output()) {
	const pkg = await resolveCurrentCliPackage();
	output.plain(`${pkg.name} ${pkg.version}`);
}

export function renderCommandHelp(
	command: string,
	output: OutputWriter = new Output(),
) {
	const spec = getCommandSpec(command);
	if (!spec) {
		renderHelp(output);
		return;
	}

	output.banner(spec.help.title, spec.help.summary);
	output.section('Usage');
	for (const usageLine of spec.help.usage) {
		output.plain(`  ${usageLine}`);
	}
	output.section('Details');
	for (const detailLine of spec.help.details) {
		output.plain(`  - ${detailLine}`);
	}
}
