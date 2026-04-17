# ForgeLoop Command-First Reference

This reference enforces maintenance through ForgeLoop CLI commands instead of manual scaffolding.

## Discovery and Scope

- Project discovery looks for:
  1. `forgeloop.config.mjs`
  2. `forgeloop.config.js`
  3. `forgeloop.config.cjs`
  4. `forgeloop.json`
- Use `--dir` / `-d` if working directory is not guaranteed.
- For existing projects, run `forgeloop info` first.

## Preset Gate

- `basic`: no `add`, `remove`, `commands` workflows.
- `modular` and `advanced`: full maintenance toolchain available.

## Golden Paths by Intent

### Add artifacts
- Slash command: `forgeloop add command <name> [--description <text>] [--with-subcommands] [--autocomplete]`
- Context menu: `forgeloop add context-menu <name> [--type user|message]`
- Event: `forgeloop add event <eventName> [--once|--on]`
- Interaction handlers:
  - `forgeloop add modal [--custom-id <id> | --regexp <pattern> [--regexp-flags <flags>] | <customId>]`
  - `forgeloop add button ...`
  - `forgeloop add select-menu ...`

### Remove artifacts
- Slash command: `forgeloop remove command <name> [--sync] [--guild|--global]`
- Event: `forgeloop remove event <eventName>`
- Interaction handlers:
  - `forgeloop remove modal [--custom-id <id>] [<customId>]`
  - `forgeloop remove button [--custom-id <id>] [<customId>]`
  - `forgeloop remove select-menu [--custom-id <id>] [<customId>]`

### Command lifecycle
- Local inventory: `forgeloop commands list`
- Local vs remote comparison: `forgeloop commands diff [--guild|--global]`
- Remote sync: `forgeloop commands deploy [--guild|--global]`

### Diagnostics and project context
- Health checks: `forgeloop doctor [--verbose] [--json] [--strict] [--fix] [--checks <groups>]`
- Manifest summary: `forgeloop info`
- Docs site: `forgeloop docs`

## Remote Mutation Protocol (Required)

Before `commands deploy` or `remove command --sync`:
1. Confirm project is `modular` or `advanced`.
2. Run `forgeloop commands list`.
3. Run `forgeloop commands diff` for intended target when possible.
4. Confirm explicit target (`--guild` or `--global`).
5. Confirm env values:
   - always: `DISCORD_TOKEN`, `CLIENT_ID`
   - guild: `GUILD_ID`
6. State clearly that Discord state will be changed.

## Explicitly Forbidden Substitutions

Do **not** replace ForgeLoop maintenance commands with:
- custom file generators for commands/events/handlers
- custom deploy/sync scripts
- direct ad-hoc command payload sync scripts

If a mapped ForgeLoop command exists, use it.

## Fast Examples

```bash
# Context
forgeloop info -d ./my-bot

# Generate
forgeloop add command ping --description "Ping command" -d ./my-bot
forgeloop add event interactionCreate --on -d ./my-bot
forgeloop add button --custom-id ping_btn -d ./my-bot

# Validate + sync
forgeloop commands list -d ./my-bot
forgeloop commands diff --guild -d ./my-bot
forgeloop commands deploy --guild -d ./my-bot

# Remove + optional mirror
forgeloop remove command ping -d ./my-bot
forgeloop remove command ping --sync --guild -d ./my-bot
```
