# ForgeLoop Scaffold Reference

## Table of Contents

- Official docs and package entrypoints
- When to use scaffold mode
- `init` command surface
- Database and ORM rules
- Scaffold examples

## Official docs and package entrypoints

- Docs URL: `https://unloopedmido.github.io/forgeloop/`
- Published npm package: `create-forgeloop`
- Supported entry styles:
  - `npm create forgeloop@latest my-bot`
  - `npx create-forgeloop@latest my-bot`
  - `forgeloop init my-bot`
- `create-forgeloop` normalizes create-style argv:
  - empty argv becomes `init`
  - a first token that is not a known command is treated as the project name for `init`

## When to use scaffold mode

Use scaffold mode when the user is creating a new ForgeLoop project rather than changing an existing generated project.

ForgeLoop is a maintenance-first scaffolder for `discord.js`, so a new project should usually be created through `init` or the create-style entrypoint rather than by manually assembling files.

## `init` command surface

- Purpose: scaffold a new project from the selected profile
- Key options:
  - `--language ts|js`
  - `--preset basic|modular|advanced`
  - `--package-manager npm|pnpm|yarn`
  - `--database none|sqlite|postgresql`
  - `--orm none|prisma`
  - `--tooling eslint-prettier|biome|none`
  - `--logging console|json`
  - `--git`
  - `--docker`
  - `--ci`
  - `--install`
  - `--yes` or `-y`
  - `--dir` or `-d`
- Behavior:
  - With no project name and no `--yes` in a TTY, `init` uses the interactive wizard.
  - With `--yes`, a project name is required and omitted values use defaults.

## Database and ORM rules

- If `--database none`, then `--orm` must also be `none`.
- If `--database` is `sqlite` or `postgresql`, then `--orm` must be `prisma`.
- If the user asks for a database-backed project without Prisma, explain that ForgeLoop currently supports Prisma as the ORM for database-enabled projects.

## Scaffold examples

```bash
# Equivalent project creation styles
npm create forgeloop@latest my-bot
npx create-forgeloop@latest my-bot
forgeloop init my-bot

# Explicit non-interactive setup
npx create-forgeloop@latest my-bot --language ts --preset modular
forgeloop init my-bot --language ts --preset modular --yes
```
