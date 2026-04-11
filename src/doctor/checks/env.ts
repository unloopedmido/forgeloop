import path from 'node:path';
import { readProjectEnv } from '../../lib/discord-app-commands.js';
import { pathExists } from '../../utils/fs.js';
import type { DoctorCheck, DoctorContext, DoctorIssue } from '../types.js';

const PLACEHOLDER_TOKENS = [
	'replace-me',
	'changeme',
	'your-token',
	'your_token',
	'xxx',
	'todo',
];

function isUnsetEnvValue(value: string | undefined): boolean {
	if (value === undefined) {
		return true;
	}

	const trimmed = value.trim();
	if (trimmed === '') {
		return true;
	}

	const lower = trimmed.toLowerCase();
	if (lower === 'replace-me') {
		return true;
	}

	for (const token of PLACEHOLDER_TOKENS) {
		if (lower.includes(token)) {
			return true;
		}
	}

	return false;
}

function looksLikeDiscordSnowflake(value: string): boolean {
	return /^\d{17,20}$/u.test(value.trim());
}

function databaseUrlMatchesProvider(
	url: string,
	provider: 'sqlite' | 'postgresql',
): boolean {
	const t = url.trim().toLowerCase();
	if (provider === 'sqlite') {
		return t.startsWith('file:') || t.includes('sqlite');
	}

	return t.startsWith('postgresql:') || t.startsWith('postgres:');
}

async function runEnv(ctx: DoctorContext): Promise<DoctorIssue[]> {
	const issues: DoctorIssue[] = [];
	const envPath = path.join(ctx.projectDir, '.env');
	const hasEnv = await pathExists(envPath);

	if (!hasEnv) {
		issues.push({
			code: 'ENV_MISSING_FILE',
			severity: 'error',
			group: 'env',
			title: 'No .env file',
			message:
				'No .env file found. Copy .env.example to .env and set Discord (and database) variables.',
			fixes: [
				'cp .env.example .env   (or copy manually on Windows)',
				'Fill DISCORD_TOKEN, CLIENT_ID, and GUILD_ID.',
				ctx.manifest.features.database
					? 'Set DATABASE_URL for your database provider.'
					: '',
			].filter(Boolean),
		});
		return issues;
	}

	const projectEnv = await readProjectEnv(ctx.projectDir);
	const keys: string[] = ['DISCORD_TOKEN', 'CLIENT_ID', 'GUILD_ID'];
	if (ctx.manifest.features.database) {
		keys.push('DATABASE_URL');
	}

	for (const key of keys) {
		const value = projectEnv[key];
		if (isUnsetEnvValue(value)) {
			issues.push({
				code: 'ENV_MISSING_OR_PLACEHOLDER',
				severity: 'error',
				group: 'env',
				title: `Invalid ${key}`,
				message: `Missing or placeholder value for ${key} in .env.`,
				fixes: [`Set a real value for ${key} in .env (see .env.example).`],
				evidence: { key },
			});
			continue;
		}

		if (key === 'CLIENT_ID' || key === 'GUILD_ID') {
			if (value && !looksLikeDiscordSnowflake(value)) {
				issues.push({
					code: 'ENV_INVALID_SNOWFLAKE',
					severity: 'warning',
					group: 'env',
					title: `Unusual ${key} format`,
					message: `${key} should be a numeric Discord snowflake (typically 17–20 digits).`,
					fixes: [
						'Copy the Application ID from the Discord Developer Portal for CLIENT_ID.',
						'Use your test server ID for GUILD_ID when using guild command sync.',
					],
					evidence: { key, length: String(value.length) },
				});
			}
		}

		if (key === 'DATABASE_URL' && ctx.manifest.features.database) {
			const provider = ctx.manifest.features.database.provider;
			if (
				value &&
				!databaseUrlMatchesProvider(value, provider)
			) {
				issues.push({
					code: 'ENV_DATABASE_URL_MISMATCH',
					severity: 'warning',
					group: 'env',
					title: 'DATABASE_URL may not match provider',
					message: `Database provider is "${provider}" but DATABASE_URL does not look like a matching connection string.`,
					fixes: [
						provider === 'sqlite'
							? 'Use a value like file:./dev.db for SQLite.'
							: 'Use a postgresql:// or postgres:// URL for PostgreSQL.',
					],
					evidence: { provider },
				});
			}
		}
	}

	return issues;
}

export const envCheck: DoctorCheck = {
	group: 'env',
	run: runEnv,
};
