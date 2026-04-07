import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { REST, Routes } from 'discord.js';
import { loadManifest } from '../manifest.js';
import type { ForgeLoopManifest, ParsedArgs } from '../types.js';
import { getBooleanFlag, getFlag } from '../utils/args.js';
import { CliError } from '../utils/errors.js';
import { Output } from '../utils/format.js';

function getProjectDir(args: ParsedArgs) {
	return path.resolve(
		(getFlag(args.flags, 'dir') as string | undefined) ?? process.cwd(),
	);
}

function assertHandlerProject(manifest: ForgeLoopManifest) {
	if (!manifest.paths.commandsDir || !manifest.paths.eventsDir) {
		throw new CliError(
			'This ForgeLoop project uses the "basic" shape, so command deployment is only available for "modular" or "advanced" projects.',
		);
	}
}

function resolveSyncTarget(guildOnly: boolean) {
	if (guildOnly) {
		return 'guild';
	}

	return process.env.NODE_ENV === 'production' ? 'global' : 'guild';
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

		child.on('exit', (code) => {
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

	return JSON.parse(stdout) as Array<Record<string, unknown>>;
}

async function deployCommands(
	projectDir: string,
	manifest: ForgeLoopManifest,
	guildOnly: boolean,
	output: Output,
) {
	const projectEnv = await readProjectEnv(projectDir);
	const commandPayload = await collectCommandPayload(projectDir, manifest);
	const target = resolveSyncTarget(guildOnly);
	const token = assertEnvValue('DISCORD_TOKEN', projectEnv);
	const clientId = assertEnvValue('CLIENT_ID', projectEnv);
	const rest = new REST({ version: '10' }).setToken(token);

	if (target === 'guild') {
		const guildId = assertEnvValue('GUILD_ID', projectEnv);
		await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
			body: commandPayload,
		});
		output.success(
			`Synced ${commandPayload.length} commands to guild ${guildId}.`,
		);
		return;
	}

	await rest.put(Routes.applicationCommands(clientId), {
		body: commandPayload,
	});
	output.success(`Synced ${commandPayload.length} commands globally.`);
}

export async function runDeploy(args: ParsedArgs, output = new Output()) {
	const deployTarget = args.subcommands[0];
	if (deployTarget !== 'commands') {
		throw new CliError(
			'Usage: forgeloop deploy commands [--guild-only] [--dir ./project]',
		);
	}

	const projectDir = getProjectDir(args);
	const manifest = await loadManifest(projectDir);
	assertHandlerProject(manifest);

	await deployCommands(
		projectDir,
		manifest,
		getBooleanFlag(args.flags, 'guild-only'),
		output,
	);
}
