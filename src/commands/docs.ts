import { spawn } from 'node:child_process';
import { DOCS_SITE_URL } from '../constants.js';
import type { ParsedArgs } from '../types.js';
import { Output, type OutputWriter } from '../utils/format.js';

function openUrl(url: string) {
	const platform = process.platform;
	const child =
		platform === 'darwin'
			? spawn('open', [url], { detached: true, stdio: 'ignore' })
			: platform === 'win32'
				? spawn('cmd', ['/c', 'start', '', url], {
						detached: true,
						stdio: 'ignore',
					})
				: spawn('xdg-open', [url], { detached: true, stdio: 'ignore' });
	child.unref();
}

export async function runDocs(
	_args: ParsedArgs,
	output: OutputWriter = new Output(),
) {
	output.info(`Opening documentation: ${DOCS_SITE_URL}`);
	openUrl(DOCS_SITE_URL);
}
