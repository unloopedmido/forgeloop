# ForgeLoop Scaffold Reference (Strict)

Use this flow only for creating new ForgeLoop projects.

## Official Entry Points

- Docs: `https://unloopedmido.github.io/forgeloop/`
- Package: `create-forgeloop`
- Supported creation styles:
  - `npm create forgeloop@latest my-bot`
  - `npx create-forgeloop@latest my-bot`
  - `forgeloop init my-bot`

`create-forgeloop` normalizes create-style args:
- empty argv -> `init`
- unknown first token -> treated as init project name

## Command-First Scaffolding Rule

For new projects, use `init` / create-style entrypoints.
Do not manually assemble starter files when ForgeLoop scaffold covers the request.

## `init` Surface

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
- `--yes` / `-y`
- `--dir` / `-d`

Behavior:
- no project name + no `--yes` in TTY -> interactive wizard
- `--yes` -> non-interactive defaults; requires project name

## Database/ORM Gate (Required)

- `--database none` requires `--orm none`
- `--database sqlite|postgresql` requires `--orm prisma`

If user requests DB + non-Prisma ORM, explain unsupported pairing and continue with supported combinations only.

## Starter Examples

```bash
npm create forgeloop@latest my-bot
npx create-forgeloop@latest my-bot --language ts --preset modular
forgeloop init my-bot --language ts --preset modular --yes
```
