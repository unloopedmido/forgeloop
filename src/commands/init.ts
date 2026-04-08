import { createManifest } from '../manifest.js';
import { renderProjectFiles } from '../generators/templates.js';
import type { ParsedArgs } from '../types.js';
import { ensureDirectory, writeFiles } from '../utils/fs.js';
import { Output, type OutputWriter } from '../utils/format.js';
import {
	initializeGitRepository,
	resolveCurrentCliPackage,
	resolveNextSteps,
	runInstall,
} from './init-runtime.js';
import { resolveInitOptions } from './init-options.js';
import { packageManagerScriptCommand } from '../utils/package-manager.js';

export async function runInit(
	args: ParsedArgs,
	output: OutputWriter = new Output(),
) {
	const options = await resolveInitOptions(args, output);
	const manifest = createManifest(options);
	const cliPackage = await resolveCurrentCliPackage();
	const files = renderProjectFiles(manifest, {
		cliPackageName: cliPackage.name,
		// Always use latest to avoid pinning to unreleased local versions.
		cliPackageVersion: 'latest',
	});

	output.banner(
		'ForgeLoop init',
		`Scaffolding ${options.projectName} in ${options.targetDir}`,
	);
	await ensureDirectory(options.targetDir);
	await writeFiles(options.targetDir, files);

	output.section('Project profile');
	output.item('Language', options.language);
	output.item('Preset', options.preset);
	output.item('Package manager', options.packageManager);
	output.item(
		'Database',
		options.database === 'none'
			? 'none'
			: `${options.database} via ${options.orm}`,
	);
	output.item('Tooling', options.tooling);
	output.item('Git', options.git ? 'enabled' : 'disabled');
	output.item('Docker', options.docker ? 'enabled' : 'disabled');
	output.item('CI', options.ci ? 'enabled' : 'disabled');
	output.callout('What you are getting', [
		`${options.language.toUpperCase()} ${options.preset} starter`,
		options.database === 'none'
			? 'No database layer'
			: `${options.database} database wiring with ${options.orm}`,
		options.tooling === 'none'
			? 'No lint/format tooling config'
			: `${options.tooling} project tooling`,
		options.git
			? 'Git repository initialized with ignore rules'
			: 'No git repository or ignore rules',
		options.docker
			? 'Dockerfile and container ignore rules'
			: 'No containerization files',
		options.ci ? 'GitHub Actions validation workflow' : 'No CI workflow',
	]);

	if (options.git) {
		output.info('Initializing git repository...');
		await initializeGitRepository(options.targetDir);
	}

	if (options.install) {
		output.info(`Installing dependencies with ${options.packageManager}...`);
		await runInstall(options.targetDir, options.packageManager);
	}

	output.success(`Project ready at ${options.targetDir}`);
	output.callout(
		'Next steps',
		resolveNextSteps(
			options.targetDir,
			options.packageManager,
			options.database,
			options.install,
			packageManagerScriptCommand,
		),
	);
}
