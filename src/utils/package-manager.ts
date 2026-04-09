import type { PackageManager } from '../types.js';

type PackageManagerCommand = PackageManager;

const WINDOWS_SHELL_PACKAGE_MANAGERS = new Set<PackageManager>([
	'npm',
	'pnpm',
	'yarn',
]);

const PACKAGE_MANAGER_FIELDS: Record<PackageManager, string> = {
	npm: 'npm@10',
	pnpm: 'pnpm@10.22.0',
	yarn: 'yarn@1.22.22',
};

export function resolvePackageManagerCommand(
	packageManager: PackageManagerCommand,
	platform = process.platform,
) {
	if (
		platform === 'win32' &&
		WINDOWS_SHELL_PACKAGE_MANAGERS.has(packageManager)
	) {
		return `${packageManager}.cmd`;
	}

	return packageManager;
}

export function shouldUseShellForPackageManager(
	packageManager: PackageManagerCommand,
	platform = process.platform,
) {
	return (
		platform === 'win32' &&
		WINDOWS_SHELL_PACKAGE_MANAGERS.has(packageManager)
	);
}

export function packageManagerInstallCommand(packageManager: PackageManager) {
	return `${packageManager} install`;
}

export function packageManagerScriptCommand(
	packageManager: PackageManager,
	scriptName: string,
) {
	if (packageManager === 'yarn') {
		return `yarn ${scriptName}`;
	}

	return `${packageManager} run ${scriptName}`;
}

export function packageManagerCliCommand(
	packageManager: PackageManager,
	command: string,
) {
	if (packageManager === 'pnpm') {
		return `pnpm forgeloop ${command}`;
	}

	if (packageManager === 'yarn') {
		return `yarn forgeloop ${command}`;
	}

	return `npx forgeloop ${command}`;
}

export function packageManagerField(packageManager: PackageManager) {
	return PACKAGE_MANAGER_FIELDS[packageManager];
}
