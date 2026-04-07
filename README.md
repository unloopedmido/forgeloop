<div align="center">
<h1>create-forgeloop</h1>

Scaffold Discord bots with a cleaner starting point and a small set of maintenance commands.

[![npm version](https://img.shields.io/npm/v/create-forgeloop?style=for-the-badge)](https://www.npmjs.com/package/create-forgeloop)
[![npm downloads](https://img.shields.io/npm/dm/create-forgeloop?style=for-the-badge)](https://www.npmjs.com/package/create-forgeloop)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![discord.js](https://img.shields.io/badge/discord.js-14-5865F2?style=for-the-badge&logo=discord&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-black?style=for-the-badge)

</div>

`create-forgeloop` is a scaffold-first CLI for `discord.js` projects. It generates new bot starters, adds commands and events to existing ForgeLoop-managed apps, and checks that generated projects still match their expected structure.

## Quick Start

Create a new bot with the standard package-manager flows:

```bash
npm create forgeloop@latest my-bot
pnpm create forgeloop my-bot
yarn create forgeloop my-bot
npx create-forgeloop@latest my-bot
```

Run the interactive wizard instead:

```bash
npm create forgeloop@latest
```

> [!TIP]
> The published package name is `create-forgeloop`, but the create-style commands use the suffix `forgeloop`.

## What It Generates

ForgeLoop can shape a starter around a few core choices:

- Language: `ts` or `js`
- Preset: `basic`, `modular`, or `advanced`
- Package manager: `npm`, `pnpm`, `yarn`, or `bun`
- Database: `none`, `sqlite`, or `postgresql`
- ORM: currently `prisma`
- Tooling: `eslint-prettier`, `biome`, or `none`
- Optional extras: Git, Docker, GitHub Actions CI, dependency install

Preset overview:

| Preset     | Shape                               | Best for                              |
| ---------- | ----------------------------------- | ------------------------------------- |
| `basic`    | Inline bot logic in `src/index`     | Fast prototypes and minimal bots      |
| `modular`  | Separate command and event handlers | Most production bots                  |
| `advanced` | Core runtime modules plus handlers  | Larger bots with clearer architecture |

## Usage

### Create a project

```bash
npx create-forgeloop@latest my-bot --language ts --preset modular
```

If you install the package globally, the same commands are also available through `forgeloop`.

Generated projects now include `create-forgeloop` as a local dev dependency, so `pnpm forgeloop ...` works inside new pnpm-based ForgeLoop apps after install.

New projects are described by `forgeloop.config.mjs` instead of a JSON manifest. The file is a normal module, so it is easier to read and can opt into package-provided typing with `create-forgeloop/config`.

Common flags:

```bash
--dir ./path
--language ts|js
--preset basic|modular|advanced
--package-manager npm|pnpm|yarn|bun
--database none|sqlite|postgresql
--orm prisma
--tooling eslint-prettier|biome|none
--git
--docker
--ci
--install
--yes
```

### Add files to an existing ForgeLoop project

Generate a slash command:

```bash
cd my-bot
pnpm forgeloop add command status --description "Show current bot status"

# or run the package directly
npx create-forgeloop@latest add command status --description "Show current bot status" --dir ./my-bot
```

Generate an event handler:

```bash
pnpm forgeloop add event messageCreate --on
pnpm forgeloop add event clientReady --once

# or run the package directly
npx create-forgeloop@latest add event messageCreate --on --dir ./my-bot
npx create-forgeloop@latest add event clientReady --once --dir ./my-bot
```

Deploy slash commands explicitly:

```bash
pnpm forgeloop deploy commands
pnpm forgeloop deploy commands --guild-only
```

> [!NOTE]
> `modular` and `advanced` starters now auto-sync commands on startup. Development defaults to guild sync, and production defaults to global sync when `NODE_ENV=production`.

### Inspect an existing project

Show the current project profile:

```bash
npx create-forgeloop@latest info --dir ./my-bot
```

Run structural health checks:

```bash
npx create-forgeloop@latest doctor --dir ./my-bot
```

> [!NOTE]
> `add command` and `add event` are available for `modular` and `advanced` projects. The `basic` preset keeps bot logic inline, so handler generators are intentionally disabled there.

## Why ForgeLoop

- Scaffolds `discord.js` bots without dumping a generic Node template on the user
- Supports both fast starts and more structured project layouts
- Keeps generated projects readable and toolable through `forgeloop.config.mjs`
- Adds follow-up generators instead of treating scaffolding as a one-time step
- Includes a lightweight `doctor` command for template drift and missing files

## Local Development

```bash
npm install
npm run typecheck
npm run lint
npm run test
npm run build
```

The published package ships a `create-forgeloop` executable backed by the compiled files in `dist/`.
