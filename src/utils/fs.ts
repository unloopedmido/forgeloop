import { mkdir, readFile, readdir, writeFile, access } from 'node:fs/promises';
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
	for (const file of files) {
		const absolutePath = path.join(rootDir, file.path);
		if (await pathExists(absolutePath)) {
			throw new CliError(
				`Refusing to overwrite existing file: ${absolutePath}`,
			);
		}

		await ensureDirectory(path.dirname(absolutePath));
		await writeFile(absolutePath, file.content, 'utf8');
	}
}

export async function readJsonFile<T>(targetPath: string) {
	const raw = await readFile(targetPath, 'utf8');
	return JSON.parse(raw) as T;
}

export async function listFilesRecursive(
	rootDir: string,
	prefix = '',
): Promise<string[]> {
	const directory = path.join(rootDir, prefix);
	const entries = await readdir(directory, { withFileTypes: true });
	const results: string[] = [];

	for (const entry of entries) {
		const relativePath = path.join(prefix, entry.name);
		if (entry.isDirectory()) {
			results.push(...(await listFilesRecursive(rootDir, relativePath)));
			continue;
		}
		results.push(relativePath);
	}

	return results.sort();
}
