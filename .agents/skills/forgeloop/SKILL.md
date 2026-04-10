---
name: forgeloop
description: Use ForgeLoop correctly for Discord bot scaffolding and maintenance workflows. Use when users ask to create, modify, inspect, or troubleshoot ForgeLoop projects, including init/add/remove/commands/doctor/info/docs flows.
---

# ForgeLoop Skill

Use this skill when the task involves creating or maintaining a Discord bot project with `create-forgeloop` or `forgeloop`.

## Core Workflow

1. Determine whether the user wants a new project or changes to an existing ForgeLoop project.
2. For existing projects, run `forgeloop info` first to confirm preset and resolved project context.
3. If the project uses the `basic` preset, do not use `add`, `remove`, or `commands`; explain the limitation and either edit manually or suggest a new modular or advanced project.
4. In modular or advanced projects, prefer ForgeLoop commands over manual scaffolding for commands, context menus, events, and interaction handlers.
5. Before remote command sync, run `forgeloop commands list` to validate the local command set.
6. Before `commands deploy` or `remove command --sync`, confirm target scope and required env values.

## Operating Rules

- Treat ForgeLoop as both a scaffolder and a maintenance CLI. Use scaffold flows for new bots and maintenance commands for generated projects.
- Use `--dir` or `-d` whenever the project root is not guaranteed by the current working directory.
- If ForgeLoop reports that no project was found, verify one of these root config files exists: `forgeloop.config.mjs`, `forgeloop.config.js`, `forgeloop.config.cjs`, or legacy `forgeloop.json`.
- Module config files must export the manifest object as `default`, `config`, or `manifest`.
- `commands deploy` and `remove command --sync` affect Discord state. Treat those as explicit remote actions, not routine local edits.

## Safety Guardrails

- Never assume `--global` when the deploy target is ambiguous.
- Never run `remove ... --sync` unless the user asked to mirror the deletion remotely.
- Always verify `DISCORD_TOKEN` and `CLIENT_ID` before deploy or sync, plus `GUILD_ID` for guild-targeted sync.
- For `init`, enforce the database and ORM pairing rules: `none` with `none`, otherwise `sqlite` or `postgresql` with `prisma`.
- If docs and runtime behavior disagree, say so explicitly and prefer repository or runtime evidence.

## Activity Guide

Read only the references needed for the task:

- New project scaffolding, create-style entrypoints, and `init` options: [references/scaffold.md](references/scaffold.md)
- Existing project command workflows for `add`, `remove`, `commands`, `doctor`, `info`, and `docs`: [references/commands.md](references/commands.md)
- Common failures, preset constraints, and deploy triage: [references/troubleshooting.md](references/troubleshooting.md)

## Quick Intent Mapping

- "create a bot" or "scaffold a bot" -> start with [references/scaffold.md](references/scaffold.md)
- "add a slash command" -> `forgeloop add command ...`
- "add a context menu command" -> `forgeloop add context-menu ...`
- "add an event" -> `forgeloop add event ...`
- "add a button, modal, or select menu handler" -> `forgeloop add button|modal|select-menu ...`
- "remove generated artifacts" -> `forgeloop remove ...`
- "what commands exist locally?" -> `forgeloop commands list`
- "deploy or sync commands" -> `forgeloop commands deploy ...`
- "check project health" -> `forgeloop doctor`
- "inspect project manifest" -> `forgeloop info`
- "open the docs site" -> `forgeloop docs`

## Response Contract

When completing a ForgeLoop task, report:

1. Commands run, in order.
2. What changed locally.
3. Whether Discord remote sync or deploy happened, and to which target.
4. Any blockers or follow-up the user still needs to handle.
