import type { ForgeLoopManifest } from '../types.js';
import type { FileSpec } from '../utils/fs.js';
import { packageManagerScriptCommand } from '../utils/package-manager.js';

function packageManagerTemplates(
	packageManager: ForgeLoopManifest['packageManager'],
) {
	if (packageManager === 'pnpm') {
		return {
			installCommand: 'corepack enable && pnpm install',
			startCommand: '["pnpm", "run", "start"]',
			ciCache: 'pnpm',
			ciInstallSteps: ['corepack enable', 'pnpm install'],
		};
	}

	if (packageManager === 'yarn') {
		return {
			installCommand: 'corepack enable && yarn install',
			startCommand: '["yarn", "start"]',
			ciCache: 'yarn',
			ciInstallSteps: ['corepack enable', 'yarn install'],
		};
	}

	return {
		installCommand: 'npm install',
		startCommand: '["npm", "run", "start"]',
		ciCache: 'npm',
		ciInstallSteps: ['npm install'],
	};
}

export function dockerFiles(manifest: ForgeLoopManifest): FileSpec[] {
	if (!manifest.features.docker) {
		return [];
	}

	const { installCommand, startCommand } = packageManagerTemplates(
		manifest.packageManager,
	);

	return [
		{
			path: 'Dockerfile',
			content: `FROM node:22-alpine

WORKDIR /app
COPY package.json ./
RUN ${installCommand}
COPY . .

CMD ${startCommand}
`,
		},
		{
			path: '.dockerignore',
			content: `node_modules
dist
.env
`,
		},
	];
}

export function ciFiles(manifest: ForgeLoopManifest): FileSpec[] {
	if (!manifest.features.ci) {
		return [];
	}

	const { ciCache, ciInstallSteps } = packageManagerTemplates(
		manifest.packageManager,
	);
	const setupStep = `      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: ${ciCache}`;
	const installStep = [
		setupStep,
		...ciInstallSteps.map((step) => `      - run: ${step}`),
	].join('\n');

	const validationSteps = [
		manifest.language === 'ts'
			? `      - run: ${packageManagerScriptCommand(manifest.packageManager, 'typecheck')}`
			: null,
		manifest.features.tooling === 'none'
			? `      - run: node -e "console.log('No lint or formatter configured')"`
			: `      - run: ${packageManagerScriptCommand(manifest.packageManager, 'lint')}`,
		manifest.language === 'ts'
			? `      - run: ${packageManagerScriptCommand(manifest.packageManager, 'build')}`
			: null,
	]
		.filter((step): step is string => step !== null)
		.join('\n');

	return [
		{
			path: '.github/workflows/ci.yml',
			content: `name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
${installStep}
${validationSteps}
`,
		},
	];
}
