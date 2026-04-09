---
name: forgeloop
description: Use ForgeLoop correctly for Discord bot scaffolding and maintenance workflows. Use when users ask to create, modify, inspect, or troubleshoot ForgeLoop projects, including init/add/remove/commands/doctor/info flows.
---

# ForgeLoop Skill

Use this skill when the task involves creating or maintaining a Discord bot project with `create-forgeloop` / `forgeloop`.

## What ForgeLoop Is

- ForgeLoop is a maintenance-first Discord bot scaffolder for `discord.js`.
- It is both:
  - a project initializer (`init` / `npm create forgeloop`)
  - an ongoing maintenance CLI (`add`, `remove`, `commands`, `doctor`, `info`, `docs`)

## Activation Triggers

Activate this skill when the user asks for any of the following:

- scaffold a Discord bot quickly with opinionated structure
- add/remove slash commands, events, or interaction handlers
- deploy or list slash commands
- check a project health/status (`doctor`, `info`)
- troubleshoot ForgeLoop or command deployment behavior

## Documentation Source

- Primary docs website: `https://unloopedmido.github.io/forgeloop/`
- If command behavior is unclear or changed, fetch docs pages from the website before guessing.

## Core Operating Rules

1. Detect context first:
   - **new project**: use `init`/create flows
   - **existing ForgeLoop project**: use maintenance commands
2. Check project shape before command/event generation:
   - `basic` preset does not support handler generators (`add`, `remove`, `commands`)
   - `modular` and `advanced` support them
3. Prefer non-destructive local validation before remote sync:
   - `forgeloop commands list` before `forgeloop commands deploy`
4. For deploy target selection:
   - explicit `--guild` or `--global` wins
   - no flag defaults to guild in development and global in production
5. For Discord deploy or sync, ensure env values exist:
   - `DISCORD_TOKEN`, `CLIENT_ID`
   - `GUILD_ID` when guild target is used

## Recommended Workflow

### 1) Scaffold

Use one of:

```bash
npm create forgeloop@latest my-bot
npx create-forgeloop@latest my-bot
```

For explicit setup:

```bash
npx create-forgeloop@latest my-bot --language ts --preset modular
```

### 2) Inspect

```bash
forgeloop info --dir ./my-bot
forgeloop doctor --dir ./my-bot
```

### 3) Grow

```bash
forgeloop add command status --description "Show bot status" --dir ./my-bot
forgeloop add event interactionCreate --on --dir ./my-bot
forgeloop add button --custom-id ping_btn --dir ./my-bot
```

### 4) Validate + Deploy

```bash
forgeloop commands list --dir ./my-bot
forgeloop commands deploy --guild --dir ./my-bot
```

### 5) Remove Safely

```bash
forgeloop remove command status --dir ./my-bot
forgeloop remove command status --sync --guild --dir ./my-bot
```

Use `--sync` only for slash command removals that must be mirrored to Discord.

## Troubleshooting Heuristics

- If slash command loading fails with module/dependency errors, verify dependencies are installed in the target project.
- If deploy fails, validate `.env` values and target flag consistency.
- If generator commands fail on a basic preset, explain preset limitation and suggest modular/advanced.
- If structure drift is suspected, run `forgeloop doctor` first, then address missing files in order.

## Command Surface (Quick Reference)

- `forgeloop init`
- `forgeloop add command|event|modal|button|select-menu`
- `forgeloop remove command|event|modal|button|select-menu`
- `forgeloop commands list|deploy`
- `forgeloop doctor`
- `forgeloop info`
- `forgeloop docs`

## Additional Resource

For detailed command behavior and guardrails, read [reference.md](reference.md).
