import type { ForgeLoopManifest } from '../types.js';
import type { FileSpec } from '../utils/fs.js';
import { fileExtension } from './shared.js';

function prismaAdapterDependency(manifest: ForgeLoopManifest) {
	return manifest.features.database?.provider === 'postgresql'
		? '@prisma/adapter-pg'
		: '@prisma/adapter-better-sqlite3';
}

function databaseRuntimeModulePath(manifest: ForgeLoopManifest) {
	return manifest.preset === 'advanced'
		? `src/core/database/client.${fileExtension(manifest.language)}`
		: `src/lib/database.${fileExtension(manifest.language)}`;
}

export function applyPrismaPackageJson(
	manifest: ForgeLoopManifest,
	dependencies: Record<string, string>,
	devDependencies: Record<string, string>,
	scripts: Record<string, string>,
) {
	if (manifest.features.database?.orm !== 'prisma') {
		return;
	}

	scripts['db:generate'] = 'prisma generate';
	scripts['db:push'] = 'prisma db push && prisma generate';
	scripts['db:migrate'] = 'prisma migrate dev && prisma generate';
	scripts['db:studio'] = 'prisma studio';
	Object.assign(dependencies, {
		'@prisma/client': '^7.7.0',
		[prismaAdapterDependency(manifest)]: '^7.7.0',
	});
	if (manifest.features.database.provider === 'postgresql') {
		Object.assign(dependencies, {
			pg: '^8.16.0',
		});
	}
	if (manifest.features.database.provider === 'sqlite') {
		Object.assign(dependencies, {
			'better-sqlite3': '^12.2.0',
		});
	}
	Object.assign(devDependencies, {
		prisma: '^7.7.0',
	});
}

export function prismaFiles(manifest: ForgeLoopManifest): FileSpec[] {
	if (!manifest.features.database) {
		return [];
	}

	return [
		{
			path: 'prisma.config.ts',
			content: `import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: env('DATABASE_URL'),
  },
});
`,
		},
		{
			path: 'prisma/schema.prisma',
			content: `generator client {
  provider = "${manifest.language === 'ts' ? 'prisma-client' : 'prisma-client-js'}"${manifest.language === 'ts' ? '\n  output   = "../src/generated/prisma"' : ''}
}

datasource db {
  provider = "${manifest.features.database.provider}"
}

model Healthcheck {
  id        Int      @id @default(autoincrement())
  label     String   @default("clientReady")
  createdAt DateTime @default(now())
}
`,
		},
	];
}

export function databaseFiles(manifest: ForgeLoopManifest): FileSpec[] {
	if (manifest.features.database?.orm !== 'prisma') {
		return [];
	}

	const ts = manifest.language === 'ts';
	const isSqlite = manifest.features.database.provider === 'sqlite';
	const clientImportStatement = ts
		? `import { PrismaClient } from '${manifest.preset === 'advanced' ? '../../generated/prisma/client' : '../generated/prisma/client'}.js';`
		: "import { PrismaClient } from '@prisma/client';";
	const adapterImport = isSqlite
		? "import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';\n"
		: "import { PrismaPg } from '@prisma/adapter-pg';\n";
	const adapterFactory = isSqlite
		? `  const adapter = new PrismaBetterSqlite3({
    url: resolveDatabaseUrl(),
  });`
		: `  const adapter = new PrismaPg({
    connectionString: resolveDatabaseUrl(),
  });`;
	const loggerImport =
		manifest.preset === 'advanced'
			? "import { logScope } from '../logging/logger.js';\n"
			: '';
	const loggerCall =
		manifest.preset === 'advanced'
			? "  logScope('database', 'Prisma connection established');\n"
			: "  console.log('[database] Prisma connection established');\n";
	const globalType = ts
		? '\ndeclare global {\n  var __forgeloopPrisma__: PrismaClient | undefined;\n}\n'
		: '';
	const globalCast = ts
		? ` as typeof globalThis & {
  __forgeloopPrisma__?: PrismaClient;
}`
		: '';

	return [
		{
			path: databaseRuntimeModulePath(manifest),
			content: `import 'dotenv/config';
${clientImportStatement}
${adapterImport}${loggerImport}${globalType}
const globalForPrisma = globalThis${globalCast};

function resolveDatabaseUrl() {
  const value = process.env.DATABASE_URL;
${isSqlite ? "  if (!value) {\n    return 'file:./dev.db';\n  }\n" : ''}  if (!value) {
    throw new Error('Missing required environment variable: DATABASE_URL');
  }

  return value;
}

function createPrismaClient() {
${adapterFactory}
  return new PrismaClient({ adapter });
}

export const prisma =
  globalForPrisma.__forgeloopPrisma__ ??
  createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__forgeloopPrisma__ = prisma;
}

export async function connectDatabase() {
  await prisma.$connect();
${loggerCall}}
`,
		},
	];
}
