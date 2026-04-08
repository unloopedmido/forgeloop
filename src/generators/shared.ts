import type { Language } from '../types.js';

export interface RenderProjectFilesOptions {
	cliPackageName?: string;
	cliPackageVersion?: string;
}

export function fileExtension(language: Language) {
	return language === 'ts' ? 'ts' : 'js';
}
