import { loadManifest } from '../manifest.js';
import type { ParsedArgs } from '../types.js';
import { Output, type OutputWriter } from '../utils/format.js';
import { resolveProjectDir } from '../utils/project.js';

export async function runInfo(
	args: ParsedArgs,
	output: OutputWriter = new Output(),
) {
	const projectDir = resolveProjectDir(args);
	const manifest = await loadManifest(projectDir);

	output.banner('ForgeLoop info', projectDir);
	output.section('Project');
	output.item('Project', manifest.projectName);
	output.item('Language', manifest.language);
	output.item('Preset', manifest.preset);
	output.item('Package manager', manifest.packageManager);
	output.item('Docker', manifest.features.docker ? 'enabled' : 'disabled');
	output.item('CI', manifest.features.ci ? 'enabled' : 'disabled');
	output.item(
		'Database',
		manifest.features.database
			? `${manifest.features.database.provider} via ${manifest.features.database.orm}`
			: 'none',
	);
}
