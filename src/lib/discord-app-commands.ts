import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
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

export function installHint(packageManager: ForgeLoopManifest['packageManager']) {
	switch (packageManager) {
		case 'pnpm':
			return 'pnpm install';
		case 'yarn':
			return 'yarn install';
		default:
			return 'npm install';
	}
}

async function withTempProbeFiles<T>(
	prefix: string,
	run: (paths: { resultPath: string; errorPath: string }) => Promise<T>,
): Promise<T> {
	const tempDir = await mkdtemp(path.join(os.tmpdir(), prefix));
	const resultPath = path.join(tempDir, 'result.txt');
	const errorPath = path.join(tempDir, 'error.txt');

	try {
		return await run({ resultPath, errorPath });
	} finally {
		await rm(tempDir, { recursive: true, force: true }).catch(() => {});
	}
}

/**
 * Returns whether `discord.js` can be resolved and imported from the project (non-throwing; for doctor).
 */
export async function probeDiscordJsImportable(
	projectDir: string,
	packageManager: ForgeLoopManifest['packageManager'],
): Promise<{ ok: true } | { ok: false; message: string }> {
	const pkgRoot = path.join(projectDir, 'node_modules', 'discord.js');
	if (!(await pathExists(pkgRoot))) {
		return {
			ok: false,
			message: `Missing discord.js in ${projectDir}. Run \`${installHint(packageManager)}\` in that project (commands list/deploy load application command modules and need node_modules).`,
		};
	}

	return withTempProbeFiles(
		'forgeloop-discord-probe-',
		async ({ resultPath, errorPath }) => {
			const probe = `import { writeFile } from 'node:fs/promises';

try {
  await import('discord.js');
  await writeFile(${JSON.stringify(resultPath)}, 'ok', 'utf8');
} catch (error) {
  const text = error instanceof Error ? (error.stack ?? error.message) : String(error);
  await writeFile(${JSON.stringify(errorPath)}, text, 'utf8');
  process.exitCode = 1;
}`;

			const exitCode = await new Promise<number | null>((resolve, reject) => {
				const child = spawn(
					'node',
					['--input-type=module', '--eval', probe],
					{
						cwd: projectDir,
						stdio: 'ignore',
						shell: false,
					},
				);
				child.on('close', (code) => resolve(code));
				child.on('error', reject);
			});

			if (exitCode === 0) {
				return { ok: true } as const;
			}

			const errorText = await readFile(errorPath, 'utf8').catch(() => '');
			return {
				ok: false as const,
				message: `discord.js could not be loaded from ${projectDir}. Command modules import this package.\n${errorText.trim() || 'Unknown module loading error.'}\n\nTry \`${installHint(packageManager)}\` in that directory, or delete node_modules and reinstall if the install looks corrupted.`,
			};
		},
	);
}

/**
 * Command modules import `discord.js`; verify Node can resolve it from the project
 * (same resolution rules as loading `src/commands/*.js`).
 */
async function assertDiscordJsImportable(
	projectDir: string,
	packageManager: ForgeLoopManifest['packageManager'],
) {
	const probe = await probeDiscordJsImportable(projectDir, packageManager);
	if (!probe.ok) {
		throw new CliError(probe.message);
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
	return `Failed to load application command modules: ${trimmed || 'unknown error'}${hint}`;
}

export async function collectCommandPayload(
	projectDir: string,
	manifest: ForgeLoopManifest,
) {
	await assertDiscordJsImportable(projectDir, manifest.packageManager);

	if (manifest.language === 'ts') {
		const tsxRoot = path.join(projectDir, 'node_modules', 'tsx');
		if (!(await pathExists(tsxRoot))) {
			throw new CliError(
				`Missing tsx in ${projectDir}. Run \`${installHint(manifest.packageManager)}\` in that project (TypeScript command modules need tsx to load).`,
			);
		}
	}

	const commandsDir = path.join(projectDir, manifest.paths.commandsDir!);
	const sourceExtension = manifest.language === 'ts' ? 'ts' : 'js';
	return withTempProbeFiles(
		'forgeloop-command-payload-',
		async ({ resultPath, errorPath }) => {
			const script = `import { readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

try {
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

  await writeFile(${JSON.stringify(resultPath)}, JSON.stringify(payload), 'utf8');
} catch (error) {
  const text = error instanceof Error ? (error.stack ?? error.message) : String(error);
  await writeFile(${JSON.stringify(errorPath)}, text, 'utf8');
  process.exitCode = 1;
}`;

			const args =
				manifest.language === 'ts'
					? ['--import', 'tsx', '--input-type=module', '--eval', script]
					: ['--input-type=module', '--eval', script];

			const exitCode = await new Promise<number | null>((resolve, reject) => {
				const child = spawn('node', args, {
					cwd: projectDir,
					stdio: 'ignore',
					shell: false,
				});

				child.on('close', (code) => resolve(code));
				child.on('error', (error) => reject(error));
			});

			if (exitCode !== 0) {
				const errorOutput = await readFile(errorPath, 'utf8').catch(() => '');
				throw new CliError(
					formatPayloadCollectionFailure(
						errorOutput,
						projectDir,
						manifest.packageManager,
					),
				);
			}

			const stdout = await readFile(resultPath, 'utf8').catch(() => '');

			try {
				return JSON.parse(stdout.trim()) as Array<Record<string, unknown>>;
			} catch (error) {
				const message =
					error instanceof Error ? error.message : 'Unknown JSON parse error.';
				throw new CliError(
					`Command payload collection returned invalid JSON: ${message}`,
				);
			}
		},
	);
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
