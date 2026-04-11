import { DISCORD_API_TIMEOUT_MS } from '../../lib/discord-app-commands.js';
import type { DoctorCheck, DoctorContext, DoctorIssue } from '../types.js';

async function runNetwork(ctx: DoctorContext): Promise<DoctorIssue[]> {
	void ctx;
	const issues: DoctorIssue[] = [];
	const timeout = Math.min(DISCORD_API_TIMEOUT_MS, 8000);

	try {
		const response = await fetch('https://discord.com/api/v10/gateway', {
			signal: AbortSignal.timeout(timeout),
		});
		if (!response.ok) {
			issues.push({
				code: 'NETWORK_DISCORD_HTTP',
				severity: 'warning',
				group: 'network',
				title: 'Discord API returned non-OK status',
				message: `GET /gateway returned ${response.status} ${response.statusText}.`,
				fixes: [
					'Check firewall/proxy settings.',
					'Retry when Discord status is healthy: https://discordstatus.com/',
				],
			});
		}
	} catch (error) {
		const message =
			error instanceof Error ? error.message : 'Unknown network error.';
		issues.push({
			code: 'NETWORK_DISCORD_UNREACHABLE',
			severity: 'warning',
			group: 'network',
			title: 'Could not reach Discord API',
			message: `Request failed (${message}).`,
			fixes: [
				'Verify outbound HTTPS to discord.com is allowed.',
				'If you use a proxy, set HTTPS_PROXY for Node.',
			],
		});
	}

	return issues;
}

export const networkCheck: DoctorCheck = {
	group: 'network',
	run: runNetwork,
};
