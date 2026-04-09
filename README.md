# ForgeLoop

**A maintenance-first Discord bot scaffolder for `discord.js`.**  
Create a bot fast, grow it without chaos, and keep the project clean later with built-in generators and health checks.

[![npm version](https://img.shields.io/npm/v/create-forgeloop?style=for-the-badge)](https://www.npmjs.com/package/create-forgeloop)
[![npm downloads](https://img.shields.io/npm/dm/create-forgeloop?style=for-the-badge)](https://www.npmjs.com/package/create-forgeloop)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![discord.js](https://img.shields.io/badge/discord.js-14^-5865F2?style=for-the-badge&logo=discord&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-black?style=for-the-badge)

ForgeLoop is a **Discord bot starter CLI** built for people who want more than a one-time template.  
It helps you:

- **scaffold** a new Discord bot project
- **add commands and events later**
- **keep the structure consistent**
- **avoid starter-template rot**
- **scale from simple bots to larger projects**

If you like `discord.js` but hate repeating setup, reorganizing folders halfway through, or manually wiring everything every time, ForgeLoop is for you.

---

## Why ForgeLoop?

Most bot starters help you get started.

ForgeLoop helps you **keep going**.

Instead of dumping files and disappearing, ForgeLoop gives you a cleaner path for long-term maintenance:

- **multiple starter shapes** for different project sizes
- **follow-up generators** for commands and events
- **project checks** to catch drift and missing structure
- **config-driven setup** so the project stays understandable
- **TypeScript and JavaScript support**

---

## What you get

You can choose a setup that matches how big or structured you want the bot to be.

### Starter styles

- **Basic** - quick prototypes and tiny bots
- **Modular** - clean command/event separation for most real projects
- **Advanced** - clearer runtime structure for bigger bots

### Project choices

ForgeLoop can scaffold with options like:

- **TypeScript or JavaScript**
- **npm, pnpm, or yarn**
- **SQLite or PostgreSQL**
- **Prisma**
- **ESLint + Prettier, Biome, or no tooling**
- optional **Git**, **Docker**, **CI**, and dependency install

---

## Quick start

Create a new bot:

```bash
npm create forgeloop@latest my-bot
```

Other supported flows:

```bash
pnpm create forgeloop my-bot
yarn create forgeloop my-bot
npx create-forgeloop@latest my-bot
```

Run the interactive wizard:

```bash
npm create forgeloop@latest
```

> The published package name is `create-forgeloop`, but create-style commands use the suffix `forgeloop`.

---

## Keep using it after setup

ForgeLoop is not just a starter.

Inside supported ForgeLoop projects, you can keep using it to grow the bot over time:

* add a new **slash command**
* add a new **event**
* inspect the current project setup
* run a **doctor** check to catch structural issues

That means less copy-pasting, less forgetting boilerplate, and allows you to focus on the bot code instead of the wiring.

---

## Example use cases

* Starting a new Discord bot without hand-rolling the same structure again
* Creating a cleaner base for a production `discord.js` bot
* Adding commands/events later without manually wiring everything
* Keeping a team project consistent across updates

---

## Command examples

Create a TypeScript modular bot:

```bash
npx create-forgeloop@latest my-bot --language ts --preset modular
```

Add a slash command to an existing supported project:

```bash
pnpm forgeloop add command status --description "Show current bot status"
```

Add an event handler:

```bash
pnpm forgeloop add event clientReady --once
```

Run a structural health check:

```bash
npx create-forgeloop@latest doctor --dir ./my-bot
```

---

## Docs

Full docs, setup details, and command reference:

- **GitHub Pages:** [https://unloopedmido.github.io/forgeloop/](https://unloopedmido.github.io/forgeloop/) — enable **Settings → Pages → Build and deployment: GitHub Actions** on the repo the first time you publish.

Local docs development:

```bash
npm run docs:dev
```

Build docs locally:

```bash
npm run docs:build
```

Preview the built site:

```bash
npm run docs:serve
```

---

## Package

* **npm:** [https://www.npmjs.com/package/create-forgeloop](https://www.npmjs.com/package/create-forgeloop)
* **GitHub:** [https://github.com/unloopedmido/forgeloop](https://github.com/unloopedmido/forgeloop)

---

## License

[MIT LICENSE](./LICENSE)
