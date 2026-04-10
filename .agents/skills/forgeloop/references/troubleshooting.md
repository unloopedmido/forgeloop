# ForgeLoop Troubleshooting Reference

## Table of Contents

- First triage pass
- Common failures
- Preset constraints
- Remote sync checklist

## First triage pass

For existing projects, start with:

```bash
forgeloop info -d ./my-bot
forgeloop doctor -d ./my-bot
```

Use `info` to confirm preset and manifest shape. Use `doctor` to surface config, structure, env, dependency, and command-loading issues before making assumptions.

## Common failures

### No ForgeLoop project found

- Confirm the working directory or pass `--dir`
- Verify one of these files exists in the project root:
  - `forgeloop.config.mjs`
  - `forgeloop.config.js`
  - `forgeloop.config.cjs`
  - `forgeloop.json`
- For module configs, verify the manifest is exported as `default`, `config`, or `manifest`

### Command loading fails

- Check that project dependencies are installed
- Re-run `forgeloop commands list` after dependencies are present
- If needed, run `forgeloop doctor --checks deps,discord -d ./my-bot`

### Deploy fails

- Verify `DISCORD_TOKEN` and `CLIENT_ID`
- For guild deploys, verify `GUILD_ID`
- Confirm the intended target with `--guild` or `--global`
- Run `forgeloop commands list` first so the local command set is clear before sync

### `init` validation fails

- Enforce database and ORM pairing:
  - `--database none` requires `--orm none`
  - `sqlite` or `postgresql` requires `--orm prisma`

## Preset constraints

- If the project is `basic`, do not use `add`, `remove`, or `commands`
- Explain that the preset does not support generator-driven maintenance workflows
- Either make the requested manual edit or suggest creating a modular or advanced project if the user wants ongoing CLI-based maintenance

## Remote sync checklist

Use this checklist before `commands deploy` or `remove command --sync`:

1. Confirm the project is modular or advanced.
2. Confirm the target directory.
3. Run `forgeloop commands list`.
4. Confirm `--guild` or `--global`.
5. Confirm required env values for that target.
6. State clearly whether a remote Discord mutation will happen.
