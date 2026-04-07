import { CLI_NAME } from '../constants.js';
import { Output } from '../utils/format.js';

export function renderHelp(output = new Output()) {
	output.hero(
		'Build and grow Discord bots without hand-wiring the boilerplate.',
		'Interactive project setup, managed generators, and safer maintenance flows.',
	);
	output.section('Commands');
	output.plain(
		`  ${CLI_NAME} init <project-name> [--dir ./path] [--language ts|js] [--preset basic|modular|advanced]`,
	);
	output.plain(`  ${CLI_NAME} add command <name> [--dir ./project]`);
	output.plain(`  ${CLI_NAME} add event <name> [--dir ./project]`);
	output.plain(`  ${CLI_NAME} doctor [--dir ./project]`);
	output.plain(`  ${CLI_NAME} info [--dir ./project]`);
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
	output.plain('  --yes');
}
