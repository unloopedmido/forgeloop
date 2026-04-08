import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import type { InitOptions, PackageManager } from '../types.js';
import { CliError } from '../utils/errors.js';
import {
	resolvePackageManagerCommand,
	shouldUseShellForPackageManager,
} from '../utils/package-manager.js';

const INSTALL_TIMEOUT_MS = 5 * 60 * 1000;

export async function resolveCurrentCliPackage() {
	const packageJsonUrl = new URL('../../package.json', import.meta.url);
	const packageJsonRaw = await readFile(packageJsonUrl, 'utf8').catch(
		() => null,
	);

	if (packageJsonRaw) {
		let packageJson: { name?: string; version?: string };
		try {
			packageJson = JSON.parse(packageJsonRaw) as typeof packageJson;
		} catch {
			return {
				name: 'create-forgeloop',
				version: 'latest',
			};
		}
		return {
			name: packageJson.name ?? 'create-forgeloop',
			version: packageJson.version ?? 'latest',
		};
	}

	return {
		name: 'create-forgeloop',
		version: 'latest',
	};
}

export async function runInstall(
	targetDir: string,
	packageManager: InitOptions['packageManager'],
) {
	const command = {
		cmd: resolvePackageManagerCommand(packageManager),
		args: ['install'],
	};

	await new Promise<void>((resolve, reject) => {
		const child = spawn(command.cmd, command.args, {
			cwd: targetDir,
			stdio: 'inherit',
			shell: shouldUseShellForPackageManager(packageManager),
		});
		const timeout = setTimeout(() => {
			child.kill('SIGTERM');
			reject(
				new CliError(
					`${packageManager} install exceeded ${INSTALL_TIMEOUT_MS / 1000} seconds and was stopped.`,
				),
			);
		}, INSTALL_TIMEOUT_MS);

		child.on('exit', (code) => {
			clearTimeout(timeout);
			if (code === 0) {
				resolve();
				return;
			}
			reject(
				new CliError(
					`${packageManager} install failed with exit code ${code ?? 'unknown'}.`,
				),
			);
		});
		child.on('error', (error) => {
			clearTimeout(timeout);
			reject(error);
		});
	});
}

export async function initializeGitRepository(targetDir: string) {
	await new Promise<void>((resolve, reject) => {
		const child = spawn('git', ['init'], {
			cwd: targetDir,
			stdio: 'ignore',
			shell: false,
		});

		child.on('exit', (code) => {
			if (code === 0) {
				resolve();
				return;
			}
			reject(
				new CliError(`git init failed with exit code ${code ?? 'unknown'}.`),
			);
		});
		child.on('error', (error) => reject(error));
	});
}

export function resolveNextSteps(
	targetDir: string,
	packageManager: PackageManager,
	database: InitOptions['database'],
	install: boolean,
	packageManagerScriptCommand: (packageManager: PackageManager, scriptName: string) => string,
) {
	return [
		`cd ${targetDir}`,
		install ? null : `${packageManager} install`,
		'Rename .env.example to .env',
		database === 'none'
			? 'Fill in DISCORD_TOKEN, CLIENT_ID, and GUILD_ID in .env'
			: 'Fill in DISCORD_TOKEN, CLIENT_ID, GUILD_ID, and DATABASE_URL in .env',
		database === 'none'
			? null
			: `${packageManagerScriptCommand(packageManager, 'db:push')} # generates the Prisma client and syncs the schema`,
		packageManagerScriptCommand(packageManager, 'dev'),
	].filter((step): step is string => step !== null);
}
