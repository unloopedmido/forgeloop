import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import { constants as fsConstants } from 'node:fs';
import { CliError } from './errors.js';

export interface FileSpec {
	path: string;
	content: string;
}

export async function pathExists(targetPath: string) {
	try {
		await access(targetPath, fsConstants.F_OK);
		return true;
	} catch {
		return false;
	}
}

export async function ensureDirectory(targetPath: string) {
	await mkdir(targetPath, { recursive: true });
}

export async function writeFiles(rootDir: string, files: FileSpec[]) {
	const absolutePaths = files.map((file) => path.join(rootDir, file.path));
	const seenPaths = new Set<string>();

	for (const absolutePath of absolutePaths) {
		if (seenPaths.has(absolutePath)) {
			throw new CliError(
				`Refusing to overwrite existing file: ${absolutePath}`,
			);
		}
		seenPaths.add(absolutePath);
	}

	const existingPaths = await Promise.all(
		absolutePaths.map(async (absolutePath) => ({
			absolutePath,
			exists: await pathExists(absolutePath),
		})),
	);

	for (const { absolutePath, exists } of existingPaths) {
		if (exists) {
			throw new CliError(
				`Refusing to overwrite existing file: ${absolutePath}`,
			);
		}
	}

	for (const [index, file] of files.entries()) {
		const absolutePath = absolutePaths[index]!;
		await ensureDirectory(path.dirname(absolutePath));
		await writeFile(absolutePath, file.content, 'utf8');
	}
}

export async function readJsonFile<T>(targetPath: string) {
	const raw = await readFile(targetPath, 'utf8');
	try {
		return JSON.parse(raw) as T;
	} catch (error) {
		const message =
			error instanceof Error ? error.message : 'Unknown parse error.';
		throw new CliError(
			`Failed to parse JSON file at ${targetPath}: ${message}`,
		);
	}
}
