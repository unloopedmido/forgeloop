# ForgeLoop Reference

This reference expands operational details for the `forgeloop` skill.

## Official Documentation Website

- Docs URL: `https://unloopedmido.github.io/forgeloop/`
- Use docs as the source of truth for public CLI usage examples and docs updates.
- When local code behavior and docs appear to differ, state the discrepancy and prefer repository source for exact runtime behavior.

## Product Model

ForgeLoop has two usage modes:

1. **Scaffolding mode**
   - Create new bot projects using create-style commands.
2. **Maintenance mode**
   - Continue evolving a generated project using `forgeloop` commands.

Agents should choose mode based on user intent first, then repository state.

## Command Intent Map

### `init`

- Purpose: scaffold a new project from selected profile.
- Key options:
  - `--language ts|js`
  - `--preset basic|modular|advanced`
  - `--package-manager npm|pnpm|yarn`
  - `--database none|sqlite|postgresql`
  - `--orm none|prisma`
  - `--tooling eslint-prettier|biome|none`
  - `--git`, `--docker`, `--ci`, `--install`, `--yes`
- Behavior:
  - wizard when no name/flags in TTY
  - non-interactive defaults with `--yes`

### `add`

- Purpose: generate bot artifacts in supported projects.
- Requires `modular` or `advanced` preset.
- Forms:
  - `add command <name> [--description <text>]`
  - `add event <eventName> [--once|--on]`
  - `add modal|button|select-menu [--custom-id <id>] [<customId>]`
- Validation notes:
  - command name allows letters/numbers/hyphen/underscore
  - event name should match official Discord.js event names
  - custom IDs are required and length-limited

### `remove`

- Purpose: delete generated artifacts.
- Requires `modular` or `advanced`.
- `--sync` is meaningful for `remove command`:
  - reruns command deploy to mirror deletions in Discord.

### `commands`

- Purpose:
  - `list`: print local slash command names from commands directory
  - `deploy`: upload command payload to Discord API
- Requires `modular` or `advanced`.
- Target selection:
  - explicit `--guild` or `--global`
  - default is env-sensitive: development => guild, production => global
- Required env:
  - always: `DISCORD_TOKEN`, `CLIENT_ID`
  - guild deploy: `GUILD_ID`

### `doctor`

- Purpose: structural and env readiness checks.
- Checks include:
  - required directories/files from manifest and enabled features
  - `.env` presence and required values
  - placeholder detection for unset values (for example `replace-me`)
- If issues exist, command exits non-zero.

### `info`

- Purpose: print manifest summary (language, preset, package manager, DB/tooling feature flags).

## Preset-Aware Strategy

- **basic**
  - command/event logic typically inline
  - no handler generators, removal tooling, or slash command deployment helpers
- **modular**
  - dedicated handler directories
  - full add/remove/commands toolchain
- **advanced**
  - larger architecture boundaries and full maintenance tooling

Before recommending `add`, `remove`, or `commands`, check that the project is not basic.

## Reliable Agent Playbook

1. Confirm the target project path (`--dir` when ambiguous).
2. Run `forgeloop info` to understand shape/features.
3. If modifying structure, run the requested generator/removal action.
4. If slash commands are involved:
   - run `commands list` for local confirmation
   - deploy only when user asks to sync remotely
5. Run `doctor` when troubleshooting or before handoff.

## Common Failure Patterns And Response

- Missing dependencies for command loading:
  - install dependencies in the project, then retry list/deploy.
- Missing env variables:
  - explain exact required keys by deploy target.
- Wrong preset for requested action:
  - explain preset limitation and suggest migration/new project setup.
- Missing manifest/config files:
  - run `doctor`, then restore expected files for enabled features.

## Ready-To-Use Command Snippets

```bash
# Project scaffold
npx create-forgeloop@latest my-bot --language ts --preset modular

# Inspect
forgeloop info --dir ./my-bot
forgeloop doctor --dir ./my-bot

# Generate
forgeloop add command ping --description "Ping command" --dir ./my-bot
forgeloop add event clientReady --once --dir ./my-bot
forgeloop add select-menu --custom-id settings_menu --dir ./my-bot

# Deploy
forgeloop commands list --dir ./my-bot
forgeloop commands deploy --guild --dir ./my-bot

# Remove with sync
forgeloop remove command ping --sync --guild --dir ./my-bot
```
