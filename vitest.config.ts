import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const root = path.dirname(fileURLToPath(new URL(import.meta.url)));

export default defineConfig({
	root,
	test: {
		environment: 'node',
		include: ['tests/**/*.test.ts'],
		setupFiles: ['tests/setup.ts'],
		globalSetup: ['tests/global-setup.ts'],
		testTimeout: 60_000,
		hookTimeout: 60_000,
		disableConsoleIntercept: true,
		pool: 'forks',
		poolOptions: {
			forks: {
				singleFork: false,
			},
		},
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json-summary'],
			include: ['src/**/*.ts'],
			exclude: ['src/**/*.d.ts'],
			// Spawned CLI integration tests exercise `dist/` in a child process; line
			// coverage here reflects in-process unit tests + imports only.
		},
	},
});
