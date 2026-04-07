#!/usr/bin/env node
import { runCli } from './cli.js';
import { normalizeCreateArgv } from './utils/create-entry.js';

await runCli(normalizeCreateArgv(process.argv.slice(2)));
