import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { loadManifest } from '../manifest.js';
import type { ForgeLoopManifest, ParsedArgs } from '../types.js';
import { getBooleanFlag } from '../utils/args.js';
import { CliError } from '../utils/errors.js';
import { Output, type OutputWriter } from '../utils/format.js';
import {
	assertHandlerProject,
	resolveProjectDir,
} from '../utils/project.js';

const DISCORD_API_BASE_URL = 'https://discord.com/api/v10';
const DISCORD_API_TIMEOUT_MS = 20_000;

function resolveSyncTarget(guildOnly: boolean) {
	if (guildOnly) {
		return 'guild';
	}

	return process.env.NODE_ENV === 'production' ? 'global' : 'guild';
}

function applicationCommandsRoute(clientId: string, guildId?: string) {
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

async function putDiscordCommands(
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

async function readProjectEnv(projectDir: string) {
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

function assertEnvValue(
	key: 'DISCORD_TOKEN' | 'CLIENT_ID' | 'GUILD_ID',
	projectEnv: Record<string, string>,
) {
	const value = process.env[key] ?? projectEnv[key];
	if (!value) {
		throw new CliError(`Missing required environment variable: ${key}`);
	}

	return value;
}

async function collectCommandPayload(
	projectDir: string,
	manifest: ForgeLoopManifest,
) {
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
					errorOutput.trim() || `Command payload collection failed with exit code ${code ?? 'unknown'}.`,
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

async function deployCommands(
	projectDir: string,
	manifest: ForgeLoopManifest,
	guildOnly: boolean,
	output: OutputWriter,
) {
	const projectEnv = await readProjectEnv(projectDir);
	const commandPayload = await collectCommandPayload(projectDir, manifest);
	const target = resolveSyncTarget(guildOnly);
	const token = assertEnvValue('DISCORD_TOKEN', projectEnv);
	const clientId = assertEnvValue('CLIENT_ID', projectEnv);

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

export async function runDeploy(
	args: ParsedArgs,
	output: OutputWriter = new Output(),
) {
	const deployTarget = args.subcommands[0];
	if (deployTarget !== 'commands') {
		throw new CliError(
			'Usage: forgeloop deploy commands [--guild-only] [--dir ./project]',
		);
	}

	const projectDir = resolveProjectDir(args);
	const manifest = await loadManifest(projectDir);
	assertHandlerProject(
		manifest,
		'This ForgeLoop project uses the "basic" shape, so command deployment is only available for "modular" or "advanced" projects.',
	);

	await deployCommands(
		projectDir,
		manifest,
		getBooleanFlag(args.flags, 'guild-only'),
		output,
	);
}
