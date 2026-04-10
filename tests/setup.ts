import { afterEach } from 'vitest';

afterEach(() => {
	// Reset between tests (spawned CLIs set exitCode on the Vitest worker).
	process.exitCode = undefined;
});
