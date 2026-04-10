# ForgeLoop Command Reference

## Table of Contents

- Project discovery
- Global flags
- `add`
- `remove`
- `commands`
- `doctor`
- `info`
- `docs`
- Preset-aware usage
- Common command snippets

## Project discovery

ForgeLoop discovers the project by searching the target directory for these files, in order:

1. `forgeloop.config.mjs`
2. `forgeloop.config.js`
3. `forgeloop.config.cjs`
4. `forgeloop.json`

Module configs must export the manifest object via `default`, `config`, or `manifest`.

## Global flags

- `--dir <path>` or `-d`: target project root
- `--help` or `-h`
- `--version` or `-V`
- `--yes` or `-y`: relevant for `init`

## `add`

- Purpose: generate artifacts in supported projects
- Requires `modular` or `advanced`
- Forms:
  - `add command <name> [--description <text>] [--with-subcommands] [--autocomplete]`
  - `add context-menu <name> [--type user|message]`
  - `add event <eventName> [--once|--on]`
  - `add modal|button|select-menu [--custom-id <id> | --regexp <pattern> [--regexp-flags <flags>] | <customId>]`
- Notes:
  - `select-menu` is the string select component handler flow
  - component handlers can use a literal `customId`, a regexp, or project-local `parseCustomId` or `matchCustomId` modules

## `remove`

- Purpose: delete generated artifacts
- Requires `modular` or `advanced`
- Forms:
  - `remove command <name> [--sync] [--guild|--global]`
  - `remove event <eventName>`
  - `remove modal [--custom-id <id>] [<customId>]`
  - `remove button [--custom-id <id>] [<customId>]`
  - `remove select-menu [--custom-id <id>] [<customId>]`
- `--sync` is meaningful only with `remove command`; it reruns `forgeloop commands deploy` to mirror slash-command deletion in Discord

## `commands`

- Purpose:
  - `list`: print local application command names from `src/commands`
  - `deploy`: upload slash and context-menu commands to Discord
- Requires `modular` or `advanced`
- Target selection:
  - explicit `--guild` or `--global`
  - otherwise non-production defaults to guild and production defaults to global
- Required env:
  - always: `DISCORD_TOKEN`, `CLIENT_ID`
  - guild deploy: `GUILD_ID`

## `doctor`

- Purpose: grouped diagnostics for config, structure, env, dependencies, and command loading
- Flags:
  - `--verbose`
  - `--json`
  - `--strict`
  - `--fix`
  - `--checks <groups>`
- `--checks` accepts a comma-separated subset of `config`, `structure`, `env`, `deps`, `discord`, `network`, and `tooling`
- Default groups omit `network` and `tooling`
- `--fix` creates `.env` from `.env.example` when `.env` is missing

## `info`

- Purpose: print the resolved manifest summary for the project
- Good first command for existing projects because it confirms preset and feature flags before more invasive actions

## `docs`

- Purpose: open the published docs site in the default browser
- Docs URL: `https://unloopedmido.github.io/forgeloop/`

## Preset-aware usage

- `basic`
  - no generator workflows for `add`, `remove`, or `commands`
  - manual edits may be required
- `modular`
  - full maintenance toolchain
- `advanced`
  - full maintenance toolchain with larger architecture boundaries

## Common command snippets

```bash
# Inspect
forgeloop info -d ./my-bot
forgeloop doctor -d ./my-bot

# Generate
forgeloop add command ping --description "Ping command" -d ./my-bot
forgeloop add context-menu inspect --type user -d ./my-bot
forgeloop add event interactionCreate --on -d ./my-bot
forgeloop add button --custom-id ping_btn -d ./my-bot

# Validate and deploy
forgeloop commands list -d ./my-bot
forgeloop commands deploy --guild -d ./my-bot

# Remove
forgeloop remove command ping -d ./my-bot
forgeloop remove command ping --sync --guild -d ./my-bot
forgeloop remove button --custom-id ping_btn -d ./my-bot

# Docs
forgeloop docs
```
