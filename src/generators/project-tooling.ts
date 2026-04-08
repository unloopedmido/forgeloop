import type { ForgeLoopManifest } from '../types.js';

export function tsconfig(manifest: ForgeLoopManifest) {
	if (manifest.language !== 'ts') {
		return null;
	}

	return JSON.stringify(
		{
			compilerOptions: {
				target: 'ES2022',
				module: 'NodeNext',
				moduleResolution: 'NodeNext',
				outDir: 'dist',
				rootDir: 'src',
				strict: true,
				resolveJsonModule: true,
				esModuleInterop: true,
				skipLibCheck: true,
				types: ['node'],
			},
			include: ['src/**/*.ts'],
		},
		null,
		2,
	);
}

export function eslintConfig(manifest: ForgeLoopManifest) {
	if (manifest.features.tooling !== 'eslint-prettier') {
		return null;
	}

	return manifest.language === 'ts'
		? `import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import { defineConfig } from 'eslint/config';

export default defineConfig([
  {
    files: ['**/*.{ts,mts,cts}'],
    plugins: { js },
    extends: ['js/recommended'],
    languageOptions: {
      globals: globals.node,
    },
  },
  ...tseslint.configs.recommended,
]);
`
		: `import js from '@eslint/js';
import globals from 'globals';
import { defineConfig } from 'eslint/config';

export default defineConfig([
  {
    files: ['**/*.{js,mjs,cjs}'],
    plugins: { js },
    extends: ['js/recommended'],
    languageOptions: {
      sourceType: 'module',
      globals: globals.node,
    },
  },
]);
`;
}

export function prettierConfig(manifest: ForgeLoopManifest) {
	if (manifest.features.tooling !== 'eslint-prettier') {
		return null;
	}

	return JSON.stringify(
		{
			useTabs: true,
			singleQuote: true,
			trailingComma: 'es5',
		},
		null,
		2,
	);
}

export function biomeConfig(manifest: ForgeLoopManifest) {
	if (manifest.features.tooling !== 'biome') {
		return null;
	}

	return JSON.stringify(
		{
			$schema: 'https://biomejs.dev/schemas/1.9.4/schema.json',
			formatter: {
				enabled: true,
				indentStyle: 'tab',
			},
			linter: {
				enabled: true,
				rules: {
					recommended: true,
				},
			},
			javascript: {
				formatter: {
					quoteStyle: 'single',
				},
			},
		},
		null,
		2,
	);
}
