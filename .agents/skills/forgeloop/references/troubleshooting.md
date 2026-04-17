# ForgeLoop Troubleshooting and Drift Control

Use this when generation/sync behavior is failing or drifting away from ForgeLoop commands.

## First Triage Pass

For existing projects:

```bash
forgeloop info -d ./my-bot
forgeloop doctor -d ./my-bot
```

`info` confirms preset and manifest context.
`doctor` checks config, structure, env, dependencies, and command loading.

## Common Failures

### "No ForgeLoop project found"

- verify working directory or pass `--dir`
- verify one root config exists:
  - `forgeloop.config.mjs`
  - `forgeloop.config.js`
  - `forgeloop.config.cjs`
  - `forgeloop.json`
- for module configs, verify manifest is exported as `default`, `config`, or `manifest`

### `add` / `remove` / `commands` rejected

Likely preset mismatch:
- `basic` does not support maintenance command toolchain
- use manual edits for basic, or migrate/recreate as modular/advanced

### Command load issues

- ensure dependencies are installed
- run `forgeloop commands list`
- if needed: `forgeloop doctor --checks deps,discord -d ./my-bot`

### Deploy or diff failure

- verify `DISCORD_TOKEN` and `CLIENT_ID`
- guild target also requires `GUILD_ID`
- use explicit target (`--guild` or `--global`) when ambiguous
- run `forgeloop commands list` before remote sync

### `init` validation failure

- enforce database/ORM pairing:
  - `none` + `none`
  - `sqlite|postgresql` + `prisma`

## Agent Drift Recovery (Core)

If an agent starts creating ad-hoc command files or custom sync scripts:
1. stop the ad-hoc approach
2. map intent to ForgeLoop command(s)
3. run command-first flow (`info` -> `add/remove/commands`)
4. report the correction and resulting changes

## Remote Sync Checklist

Before `commands deploy` or `remove command --sync`:
1. confirm modular/advanced preset
2. confirm target directory
3. run `forgeloop commands list`
4. optionally run `forgeloop commands diff` for target
5. confirm `--guild` or `--global`
6. confirm required env values
7. explicitly state remote Discord mutation impact
