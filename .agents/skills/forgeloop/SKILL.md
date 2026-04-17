---
name: forgeloop
description: Command-first ForgeLoop workflow for scaffolding and maintaining Discord bots. Always route bot structure and command sync work through ForgeLoop CLI commands, not ad-hoc files or scripts.
---

# ForgeLoop Skill

Use this skill whenever a task involves creating, modifying, validating, or syncing a ForgeLoop-based Discord bot.

## Mission

Keep agent work aligned to ForgeLoop's intended workflow:
- scaffold with `init` / `create-forgeloop`
- maintain with `add`, `remove`, `commands`, `doctor`, `info`, `docs`
- avoid shadow tooling, ad-hoc generators, and custom sync scripts

## Non-Negotiable Rules

1. **Command-first enforcement**: if ForgeLoop has a command for the intent, use that command.
2. **No manual replacement of generators**: do not hand-create command/event/handler files when `forgeloop add` or `forgeloop remove` covers it.
3. **No custom sync/deploy scripts**: do not write bespoke scripts for command sync; use `forgeloop commands diff|deploy` and `forgeloop remove command --sync`.
4. **Existing projects start with context**: run `forgeloop info` first.
5. **Basic preset limitation**: for `basic`, do not use `add`, `remove`, or `commands`; explain constraint and either do a manual edit or propose modular/advanced.
6. **Remote safety gate**: before remote mutation (`commands deploy`, `remove command --sync`), confirm target (`--guild`/`--global`) and env requirements.
7. **Directory certainty**: use `--dir`/`-d` whenever project root is not guaranteed.

## Intent Router (Mandatory)

- Create new bot -> `forgeloop init` or `create-forgeloop` flow
- Add slash command -> `forgeloop add command ...`
- Add context menu -> `forgeloop add context-menu ...`
- Add event -> `forgeloop add event ...`
- Add modal/button/select-menu handler -> `forgeloop add modal|button|select-menu ...`
- Remove generated artifact -> `forgeloop remove ...`
- View local commands -> `forgeloop commands list`
- Compare local vs Discord commands -> `forgeloop commands diff`
- Sync commands to Discord -> `forgeloop commands deploy`
- Run project diagnostics -> `forgeloop doctor`
- Inspect manifest/preset -> `forgeloop info`
- Open docs -> `forgeloop docs`

## Required Execution Order

### A) Existing project change
1. `forgeloop info`
2. If needed: `forgeloop doctor`
3. Perform requested generator/removal command
4. For sync tasks: `forgeloop commands list` then `forgeloop commands diff` then deploy/remove-sync only with explicit target

### B) New project
1. Use `init` / `create-forgeloop`
2. Enforce database/ORM pairing (`none+none`, otherwise `sqlite|postgresql + prisma`)
3. Only after scaffold completes, perform maintenance commands

## Safety Guardrails

- Never assume `--global` on ambiguous deploy requests.
- Never run `remove ... --sync` unless user asked for remote mirroring.
- Always verify `DISCORD_TOKEN` + `CLIENT_ID`; include `GUILD_ID` for guild target.
- If docs conflict with runtime behavior, state conflict and prefer repo/runtime evidence.

## Anti-Drift Recovery

If an agent flow started creating ad-hoc files/scripts for behavior that ForgeLoop already supports:
1. Stop that approach.
2. Switch to mapped ForgeLoop command(s).
3. Report the course correction clearly.

## Reference Map

- Scaffolding and `init`: [references/scaffold.md](references/scaffold.md)
- Maintenance commands and sync workflows: [references/commands.md](references/commands.md)
- Failure triage and preset constraints: [references/troubleshooting.md](references/troubleshooting.md)

## Response Contract

Always report:
1. Commands run (ordered)
2. Local file changes
3. Whether remote Discord state changed, and target scope
4. Remaining blocker(s) or follow-up needed
