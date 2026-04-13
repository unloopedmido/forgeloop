import { spawn } from 'node:child_process';
import { DOCS_SITE_URL } from '../constants.js';
import type { ParsedArgs } from '../types.js';
import { Output, type OutputWriter } from '../utils/format.js';

function trySpawn(command: string, args: string[]): Promise<boolean> {
	return new Promise((resolve) => {
		const child = spawn(command, args, {
			detached: true,
			stdio: 'ignore',
			shell: false,
		});

		child.once('error', () => resolve(false));
		child.once('spawn', () => {
			child.unref();
			resolve(true);
		});
	});
}

async function openUrl(url: string): Promise<boolean> {
	const platform = process.platform;

	if (platform === 'darwin') return trySpawn('open', [url]);
	if (platform === 'win32')
		return trySpawn('cmd.exe', ['/c', 'start', '', url]);

	if (process.env.WSL_DISTRO_NAME || process.env.WSL_INTEROP) {
		if (await trySpawn('wslview', [url])) return true;
		if (await trySpawn('cmd.exe', ['/c', 'start', '', url])) return true;
		if (
			await trySpawn('powershell.exe', [
				'-NoProfile',
				'-Command',
				'Start-Process',
				url,
			])
		)
			return true;
	}

	if (await trySpawn('xdg-open', [url])) return true;
	if (await trySpawn('gio', ['open', url])) return true;

	return false;
}

export async function runDocs(
	_args: ParsedArgs,
	output: OutputWriter = new Output(),
) {
	output.banner('ForgeLoop docs', 'Opening the documentation site in your browser.');
	output.item('URL', DOCS_SITE_URL);
	if (!(await openUrl(DOCS_SITE_URL))) {
		output.warn(
			`Could not launch a browser. Open manually: ${DOCS_SITE_URL}`,
		);
	}
}
