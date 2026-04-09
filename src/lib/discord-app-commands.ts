import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { ForgeLoopManifest, ParsedArgs } from '../types.js';
import { getBooleanFlag } from '../utils/args.js';
import { CliError } from '../utils/errors.js';
import { pathExists } from '../utils/fs.js';

const DISCORD_API_BASE_URL = 'https://discord.com/api/v10';
export const DISCORD_API_TIMEOUT_MS = 20_000;

export function assertDeployTargetFlags(args: ParsedArgs) {
	const explicitGlobal = getBooleanFlag(args.flags, 'global');
	const explicitGuild = getBooleanFlag(args.flags, 'guild');

	if (explicitGlobal && explicitGuild) {
		throw new CliError('Use only one of --global or --guild.');
	}
}

export function resolveSyncTarget(args: ParsedArgs) {
	const explicitGlobal = getBooleanFlag(args.flags, 'global');
	const explicitGuild = getBooleanFlag(args.flags, 'guild');

	if (explicitGlobal) {
		return 'global';
	}

	if (explicitGuild) {
		return 'guild';
	}

	return process.env.NODE_ENV === 'production' ? 'global' : 'guild';
}

export function applicationCommandsRoute(clientId: string, guildId?: string) {
	const encodedClientId = encodeURIComponent(clientId);
	if (guildId) {
		return `${DISCORD_API_BASE_URL}/applications/${encodedClientId}/guilds/${encodeURIComponent(guildId)}/commands`;
	}

	return `${DISCORD_API_BASE_URL}/applications/${encodedClientId}/commands`;
}

async function readDiscordApiError(response: Response) {
	const body = await response.text();
	if (!body) {
		return (
			response.statusText ||
			`Empty response body (status ${response.status}).`
		);
	}

	try {
		const parsed = JSON.parse(body) as {
			code?: number;
			message?: string;
		};
		if (typeof parsed.message === 'string') {
			return typeof parsed.code === 'number'
				? `${parsed.message} (code ${parsed.code})`
				: parsed.message;
		}
	} catch {
		// Keep the raw body when Discord returns non-JSON output.
	}

	return body;
}

export async function putDiscordCommands(
	route: string,
	token: string,
	commandPayload: Array<Record<string, unknown>>,
) {
	let response: Response;
	try {
		response = await fetch(route, {
			method: 'PUT',
			signal: AbortSignal.timeout(DISCORD_API_TIMEOUT_MS),
			headers: {
				Authorization: `Bot ${token}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(commandPayload),
		});
	} catch (error) {
		const message =
			error instanceof Error ? error.message : 'Unknown network error.';
		throw new CliError(
			`Discord API request failed before response (${DISCORD_API_TIMEOUT_MS / 1000}s timeout): ${message}`,
		);
	}

	if (response.ok) {
		return;
	}

	throw new CliError(
		`Discord API request failed (${response.status} ${response.statusText}): ${await readDiscordApiError(response)}`,
	);
}

export async function readProjectEnv(projectDir: string) {
	const envPath = path.join(projectDir, '.env');
	const envRaw = await readFile(envPath, 'utf8').catch(() => '');
	const values: Record<string, string> = {};

	for (const line of envRaw.split(/\r?\n/u)) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith('#')) {
			continue;
		}

		const separatorIndex = trimmed.indexOf('=');
		if (separatorIndex <= 0) {
			continue;
		}

		const key = trimmed.slice(0, separatorIndex).trim();
		const rawValue = trimmed.slice(separatorIndex + 1).trim();
		const quoted =
			(rawValue.startsWith('"') && rawValue.endsWith('"')) ||
			(rawValue.startsWith("'") && rawValue.endsWith("'"));
		values[key] = quoted ? rawValue.slice(1, -1) : rawValue;
	}

	return values;
}

export function assertEnvValue(
	key: 'DISCORD_TOKEN' | 'CLIENT_ID' | 'GUILD_ID',
	projectEnv: Record<string, string>,
) {
	const value = process.env[key] ?? projectEnv[key];
	if (!value) {
		throw new CliError(`Missing required environment variable: ${key}`);
	}

	return value;
}

function installHint(packageManager: ForgeLoopManifest['packageManager']) {
	switch (packageManager) {
		case 'pnpm':
			return 'pnpm install';
		case 'yarn':
			return 'yarn install';
		default:
			return 'npm install';
	}
}

/**
 * Command modules import `discord.js`; verify Node can resolve it from the project
 * (same resolution rules as loading `src/commands/*.js`).
 */
async function assertDiscordJsImportable(
	projectDir: string,
	packageManager: ForgeLoopManifest['packageManager'],
) {
	const pkgRoot = path.join(projectDir, 'node_modules', 'discord.js');
	if (!(await pathExists(pkgRoot))) {
		throw new CliError(
			`Missing discord.js in ${projectDir}. Run \`${installHint(packageManager)}\` in that project (commands list/deploy load command files and need node_modules).`,
		);
	}

	const probe =
		"import('discord.js').then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });";
	const stderr = await new Promise<string>((resolve, reject) => {
		const child = spawn(
			'node',
			['--input-type=module', '--eval', probe],
			{
				cwd: projectDir,
				stdio: ['ignore', 'pipe', 'pipe'],
				shell: false,
			},
		);
		let err = '';
		child.stderr.on('data', (chunk) => {
			err += chunk.toString();
		});
		child.on('close', (code) => {
			if (code === 0) {
				resolve('');
				return;
			}

			resolve(err);
		});
		child.on('error', reject);
	});

	if (stderr) {
		throw new CliError(
			`discord.js could not be loaded from ${projectDir}. Slash command files import this package.\n${stderr.trim()}\n\nTry \`${installHint(packageManager)}\` in that directory, or delete node_modules and reinstall if the install looks corrupted.`,
		);
	}
}

function formatPayloadCollectionFailure(
	errorOutput: string,
	projectDir: string,
	packageManager: ForgeLoopManifest['packageManager'],
) {
	const trimmed = errorOutput.trim();
	const hint =
		/\bERR_MODULE_NOT_FOUND\b/u.test(trimmed) ||
		/Cannot find module/u.test(trimmed)
			? `\n\nHint: ensure dependencies are installed in ${projectDir} (\`${installHint(packageManager)}\`). If the error persists, delete node_modules and reinstall.`
			: '';
	return `Failed to load slash command modules: ${trimmed || 'unknown error'}${hint}`;
}

export async function collectCommandPayload(
	projectDir: string,
	manifest: ForgeLoopManifest,
) {
	await assertDiscordJsImportable(projectDir, manifest.packageManager);

	const commandsDir = path.join(projectDir, manifest.paths.commandsDir!);
	const sourceExtension = manifest.language === 'ts' ? 'ts' : 'js';
	const script = `import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const commandsDir = ${JSON.stringify(commandsDir)};
const entries = await readdir(commandsDir, { withFileTypes: true });
const payload = [];

for (const entry of entries) {
  if (!entry.isFile() || !entry.name.endsWith('.${sourceExtension}')) {
    continue;
  }

  const modulePath = pathToFileURL(path.join(commandsDir, entry.name)).href;
  const commandModule = await import(modulePath);
  payload.push(commandModule.data.toJSON());
}

process.stdout.write(JSON.stringify(payload));
`;

	const args =
		manifest.language === 'ts'
			? ['--import', 'tsx', '--input-type=module', '--eval', script]
			: ['--input-type=module', '--eval', script];

	const stdout = await new Promise<string>((resolve, reject) => {
		const child = spawn('node', args, {
			cwd: projectDir,
			stdio: ['ignore', 'pipe', 'pipe'],
			shell: false,
		});

		let output = '';
		let errorOutput = '';

		child.stdout.on('data', (chunk) => {
			output += chunk.toString();
		});

		child.stderr.on('data', (chunk) => {
			errorOutput += chunk.toString();
		});

		child.on('close', (code) => {
			if (code === 0) {
				resolve(output);
				return;
			}

			reject(
				new CliError(
					formatPayloadCollectionFailure(
						errorOutput,
						projectDir,
						manifest.packageManager,
					),
				),
			);
		});

		child.on('error', (error) => reject(error));
	});

	try {
		return JSON.parse(stdout.trim()) as Array<Record<string, unknown>>;
	} catch (error) {
		const message =
			error instanceof Error ? error.message : 'Unknown JSON parse error.';
		throw new CliError(
			`Command payload collection returned invalid JSON: ${message}`,
		);
	}
}

export async function deploySlashCommandsToDiscord(
	projectDir: string,
	manifest: ForgeLoopManifest,
	args: ParsedArgs,
	output: { info: (msg: string) => void; success: (msg: string) => void },
) {
	const projectEnv = await readProjectEnv(projectDir);
	const commandPayload = await collectCommandPayload(projectDir, manifest);
	const target = resolveSyncTarget(args);
	const token = assertEnvValue('DISCORD_TOKEN', projectEnv);
	const clientId = assertEnvValue('CLIENT_ID', projectEnv);

	const mode =
		process.env.NODE_ENV === 'production' ? 'production' : 'development';
	const explicit =
		getBooleanFlag(args.flags, 'global') ||
		getBooleanFlag(args.flags, 'guild');
	const hint = explicit
		? '(explicit flag)'
		: `(${mode}: default when no --global / --guild)`;
	output.info(`Deploy target: ${target} ${hint}`);

	if (target === 'guild') {
		const guildId = assertEnvValue('GUILD_ID', projectEnv);
		await putDiscordCommands(
			applicationCommandsRoute(clientId, guildId),
			token,
			commandPayload,
		);
		output.success(
			`Synced ${commandPayload.length} commands to guild ${guildId}.`,
		);
		return;
	}

	await putDiscordCommands(
		applicationCommandsRoute(clientId),
		token,
		commandPayload,
	);
	output.success(`Synced ${commandPayload.length} commands globally.`);
}
