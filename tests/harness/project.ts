import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	'../..',
);

export async function makeTempProjectParent() {
	return mkdtemp(path.join(os.tmpdir(), 'forgeloop-vitest-'));
}

export async function removeDir(dir: string) {
	await rm(dir, { recursive: true, force: true });
}

export async function linkRepoNodeModules(projectRoot: string) {
	await symlink(
		path.join(repoRoot, 'node_modules'),
		path.join(projectRoot, 'node_modules'),
		'dir',
	);
}

export async function installDiscordJsStub(projectRoot: string) {
	const pkgDir = path.join(projectRoot, 'node_modules', 'discord.js');
	await mkdir(pkgDir, { recursive: true });
	await writeFile(
		path.join(pkgDir, 'package.json'),
		JSON.stringify(
			{
				name: 'discord.js',
				type: 'module',
				exports: './index.js',
			},
			null,
			2,
		),
		'utf8',
	);
	await writeFile(
		path.join(pkgDir, 'index.js'),
		`export class SlashCommandBuilder {
  constructor() {
    this.payload = {};
  }

  setName(name) {
    this.payload.name = name;
    return this;
  }

  setDescription(description) {
    this.payload.description = description;
    return this;
  }

  toJSON() {
    return { ...this.payload };
  }
}
`,
		'utf8',
	);
}
