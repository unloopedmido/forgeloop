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
2. In a ForgeLoop project, prefer ForgeLoop commands over manual scaffolding/editing:
   - use `forgeloop add` / `forgeloop remove` instead of hand-creating or deleting command/event/interaction files
   - use `forgeloop commands list|deploy` for slash command sync workflows
   - use `forgeloop info` and `forgeloop doctor` for inspection/health checks
   - only do manual file edits when ForgeLoop has no command for the requested change
3. Check project shape before command/event generation:
   - `basic` preset does not support handler generators (`add`, `remove`, `commands`)
   - `modular` and `advanced` support them
4. Prefer non-destructive local validation before remote sync:
   - `forgeloop commands list` before `forgeloop commands deploy`
5. For deploy target selection:
   - explicit `--guild` or `--global` wins
   - no flag defaults to guild in development and global in production
6. For Discord deploy or sync, ensure env values exist:
   - `DISCORD_TOKEN`, `CLIENT_ID`
   - `GUILD_ID` when guild target is used

## Decision Tree (Always Follow)

1. Is this a new bot request?
   - Yes -> use scaffold flow.
   - No -> continue with existing-project flow.
2. For existing projects, run `forgeloop info` first.
3. Is preset `basic`?
   - Yes -> do not use `add`/`remove`/`commands`; explain limitation and offer migration/new project options.
   - No -> use ForgeLoop command workflows.
4. Is user asking for structural changes (new handlers, remove handlers, command sync)?
   - Yes -> use ForgeLoop commands first.
   - No -> manual edits are fine when no ForgeLoop command applies.
5. Is remote Discord state affected (`commands deploy` or `remove ... --sync`)?
   - Yes -> confirm target (`--guild`/`--global`) and required env before running.

## Safety Guardrails

- Never default to global deploy when target is ambiguous; ask or use explicit user intent.
- Never run `remove ... --sync` unless user asks to mirror deletions remotely.
- Always use `--dir` when the target project path is not guaranteed by current working directory.
- Run `forgeloop commands list` before deploy/removal sync to show local command set.
- If docs and local runtime behavior differ, state it explicitly and prefer repository/runtime evidence.

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

## Intent Mapping (Quick)

When the repository is a ForgeLoop project, apply this default mapping:

- "add/create command" -> `forgeloop add command ...`
- "add/create event" -> `forgeloop add event ...`
- "add/create button|modal|select menu handler" -> `forgeloop add button|modal|select-menu ...`
- "remove command/event/interaction handler" -> `forgeloop remove ...`
- "what commands exist?" -> `forgeloop commands list`
- "sync/deploy slash commands" -> `forgeloop commands deploy ...`
- "check health/issues" -> `forgeloop doctor`
- "inspect project config/profile" -> `forgeloop info`

## Response Contract

When completing a ForgeLoop task, report:

1. Commands run (in order).
2. What changed locally.
3. Whether remote sync/deploy happened and to which target.
4. Any blockers or follow-up needed from the user.

## Additional Resource

For command surface details and extended examples, read [reference.md](reference.md).
