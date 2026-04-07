import path from 'node:path';
import { loadManifest } from '../manifest.js';
import type { ParsedArgs } from '../types.js';
import { getFlag } from '../utils/args.js';
import { Output } from '../utils/format.js';

export async function runInfo(args: ParsedArgs, output = new Output()) {
	const projectDir = path.resolve(
		(getFlag(args.flags, 'dir') as string | undefined) ?? process.cwd(),
	);
	const manifest = await loadManifest(projectDir);

	output.banner('ForgeLoop info', projectDir);
	output.item('Project', manifest.projectName);
	output.item('Language', manifest.language);
	output.item('Preset', manifest.preset);
	output.item('Framework', manifest.framework);
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
