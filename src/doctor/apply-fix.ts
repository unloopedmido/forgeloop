import { copyFile } from 'node:fs/promises';
import path from 'node:path';
import { pathExists } from '../utils/fs.js';

/**
 * Safe bootstrap: create `.env` from `.env.example` when missing.
 */
export async function applyDoctorFix(projectDir: string): Promise<boolean> {
	const envPath = path.join(projectDir, '.env');
	const examplePath = path.join(projectDir, '.env.example');

	if (await pathExists(envPath)) {
		return false;
	}

	if (!(await pathExists(examplePath))) {
		return false;
	}

	await copyFile(examplePath, envPath);
	return true;
}
