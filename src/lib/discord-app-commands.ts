import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { ForgeLoopManifest, ParsedArgs } from '../types.js';
import { getBooleanFlag } from '../utils/args.js';
import { CliError } from '../utils/errors.js';
import { pathExists } from '../utils/fs.js';

const DISCORD_API_BASE_URL = 'https://discord.com/api/v10';
export const DISCORD_API_TIMEOUT_MS = 20_000;

type ProjectNodeResult = {
	exitCode: number | null;
	stderr: string;
	payloadFd: string;
};

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

export async function getDiscordCommands(route: string, token: string) {
	let response: Response;
	try {
		response = await fetch(route, {
			method: 'GET',
			signal: AbortSignal.timeout(DISCORD_API_TIMEOUT_MS),
			headers: {
				Authorization: `Bot ${token}`,
			},
		});
	} catch (error) {
		const message =
			error instanceof Error ? error.message : 'Unknown network error.';
		throw new CliError(
			`Discord API request failed before response (${DISCORD_API_TIMEOUT_MS / 1000}s timeout): ${message}`,
		);
	}

	if (!response.ok) {
		throw new CliError(
			`Discord API request failed (${response.status} ${response.statusText}): ${await readDiscordApiError(response)}`,
		);
	}

	const payload = (await response.json().catch((error: unknown) => {
		const message =
			error instanceof Error ? error.message : 'Unknown JSON parse error.';
		throw new CliError(
			`Discord API returned invalid JSON for command diff: ${message}`,
		);
	})) as unknown;

	if (!Array.isArray(payload)) {
		throw new CliError('Discord API returned an unexpected command payload.');
	}

	return payload as Array<Record<string, unknown>>;
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

async function runProjectNodeScript(
	projectDir: string,
	language: ForgeLoopManifest['language'],
	script: string,
): Promise<ProjectNodeResult> {
	const args =
		language === 'ts'
			? ['--import', 'tsx', '--input-type=module', '--eval', script]
			: ['--input-type=module', '--eval', script];

	return new Promise<ProjectNodeResult>((resolve, reject) => {
		const child = spawn('node', args, {
			cwd: projectDir,
			stdio: ['ignore', 'ignore', 'pipe', 'pipe'],
			shell: false,
		});

		const stderrChunks: Buffer[] = [];
		const payloadChunks: Buffer[] = [];
		const payloadStream = child.stdio[3];

		child.stderr?.on('data', (chunk: Buffer) => stderrChunks.push(chunk));
		if (payloadStream) {
			payloadStream.on('data', (chunk: Buffer | string) => {
				payloadChunks.push(
					Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, 'utf8'),
				);
			});
		}
		child.on('error', reject);
		child.on('close', (exitCode) => {
			resolve({
				exitCode,
				stderr: Buffer.concat(stderrChunks).toString('utf8'),
				payloadFd: Buffer.concat(payloadChunks).toString('utf8'),
			});
		});
	});
}

function formatProjectScriptFailure(
	stderr: string,
	projectDir: string,
	packageManager: ForgeLoopManifest['packageManager'],
) {
	const trimmed = stderr.trim();
	const hint =
		/\bERR_MODULE_NOT_FOUND\b/u.test(trimmed) ||
		/Cannot find module/u.test(trimmed)
			? `\n\nHint: ensure dependencies are installed in ${projectDir} (\`${installHint(packageManager)}\`).`
			: '';
	return `${trimmed || 'Unknown module loading error.'}${hint}`;
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

	const result = await runProjectNodeScript(
		projectDir,
		'js',
		"await import('discord.js');",
	);
	if (result.exitCode === 0) {
		return { ok: true };
	}

	return {
		ok: false,
		message: `discord.js could not be loaded from ${projectDir}. Command modules import this package.\n${formatProjectScriptFailure(result.stderr, projectDir, packageManager)}`,
	};
}

async function assertDiscordJsImportable(
	projectDir: string,
	packageManager: ForgeLoopManifest['packageManager'],
) {
	const probe = await probeDiscordJsImportable(projectDir, packageManager);
	if (!probe.ok) {
		throw new CliError(probe.message);
	}
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
	const script = `import { writeFileSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
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

writeFileSync(3, JSON.stringify(payload));`;

	const result = await runProjectNodeScript(
		projectDir,
		manifest.language,
		script,
	);
	if (result.exitCode !== 0) {
		throw new CliError(
			`Failed to load application command modules: ${formatProjectScriptFailure(result.stderr, projectDir, manifest.packageManager)}`,
		);
	}

	try {
		return JSON.parse(result.payloadFd.trim()) as Array<Record<string, unknown>>;
	} catch (error) {
		const message =
			error instanceof Error ? error.message : 'Unknown JSON parse error.';
		throw new CliError(
			`Command payload collection returned invalid JSON: ${message}`,
		);
	}
}

const READONLY_COMMAND_FIELDS = new Set([
	'id',
	'application_id',
	'version',
	'guild_id',
]);

function normalizeComparableCommand(value: unknown): unknown {
	if (Array.isArray(value)) {
		return value.map((entry) => normalizeComparableCommand(entry));
	}

	if (!value || typeof value !== 'object') {
		return value;
	}

	return Object.fromEntries(
		Object.entries(value as Record<string, unknown>)
			.filter(([key]) => !READONLY_COMMAND_FIELDS.has(key))
			.sort(([left], [right]) => left.localeCompare(right))
			.map(([key, entryValue]) => [key, normalizeComparableCommand(entryValue)]),
	);
}

function pickComparableShape(reference: unknown, candidate: unknown): unknown {
	if (Array.isArray(reference)) {
		if (!Array.isArray(candidate)) {
			return candidate;
		}

		return reference.map((entry, index) =>
			pickComparableShape(entry, candidate[index]),
		);
	}

	if (
		reference &&
		typeof reference === 'object' &&
		candidate &&
		typeof candidate === 'object' &&
		!Array.isArray(candidate)
	) {
		const picked: Record<string, unknown> = {};
		for (const key of Object.keys(reference as Record<string, unknown>)) {
			picked[key] = pickComparableShape(
				(reference as Record<string, unknown>)[key],
				(candidate as Record<string, unknown>)[key],
			);
		}
		return picked;
	}

	return candidate;
}

function commandPayloadMatches(
	localEntry: Record<string, unknown>,
	remoteEntry: Record<string, unknown>,
) {
	const localComparable = normalizeComparableCommand(localEntry);
	const remoteComparable = pickComparableShape(
		localComparable,
		normalizeComparableCommand(remoteEntry),
	);
	return JSON.stringify(localComparable) === JSON.stringify(remoteComparable);
}

function payloadCommandName(entry: Record<string, unknown>) {
	const name = entry.name;
	return typeof name === 'string' ? name : '(unnamed)';
}

export interface CommandDiffResult {
	localOnly: string[];
	remoteOnly: string[];
	changed: string[];
	unchanged: string[];
}

export function diffCommandPayload(
	localPayload: Array<Record<string, unknown>>,
	remotePayload: Array<Record<string, unknown>>,
): CommandDiffResult {
	const localByName = new Map(
		localPayload.map((entry) => [payloadCommandName(entry), entry] as const),
	);
	const remoteByName = new Map(
		remotePayload.map((entry) => [payloadCommandName(entry), entry] as const),
	);

	const localOnly: string[] = [];
	const remoteOnly: string[] = [];
	const changed: string[] = [];
	const unchanged: string[] = [];

	for (const [name, localEntry] of localByName) {
		const remoteEntry = remoteByName.get(name);
		if (!remoteEntry) {
			localOnly.push(name);
			continue;
		}

		if (commandPayloadMatches(localEntry, remoteEntry)) {
			unchanged.push(name);
		} else {
			changed.push(name);
		}
	}

	for (const name of remoteByName.keys()) {
		if (!localByName.has(name)) {
			remoteOnly.push(name);
		}
	}

	const sortNames = (values: string[]) =>
		values.sort((left, right) => left.localeCompare(right));

	return {
		localOnly: sortNames(localOnly),
		remoteOnly: sortNames(remoteOnly),
		changed: sortNames(changed),
		unchanged: sortNames(unchanged),
	};
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
