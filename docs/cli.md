# CLI Reference

## `foresight demo`

Run a built-in example warning so you can verify the install and see how tracking works.

Example:

```bash
foresight demo
```

This command is meant for first-time users.

## `foresight scan`

Execute a command or read a log file, parse runtime deprecations, persist them, and optionally notify Slack or email.

Examples:

```bash
foresight scan --cmd "npm test" --project api
foresight scan --file ./logs/app.log --follow --project api
foresight scan --cmd "node server.js" --notify --fail-on high
```

If `--project` is omitted, Foresight uses your `package.json` name or folder name.

Important options:

- `--cmd`
- `--file`
- `--follow`
- `--project`
- `--db`
- `--notify`
- `--alert-threshold`
- `--alert-mode`
- `--fail-on`
- `--json`

## `foresight deps`

Inspect direct dependencies from `package.json` and track deprecated packages.

Examples:

```bash
foresight deps --project api
foresight deps --package ./package.json --no-include-dev
foresight deps --notify --fail-on medium
```

Important options:

- `--package`
- `--project`
- `--include-dev` / `--no-include-dev`
- `--registry` / `--no-registry`
- `--notify`
- `--fail-on`
- `--json`

## `foresight report`

Query tracked deprecations from SQLite.

Examples:

```bash
foresight report --project api
foresight report --project api --severity high --type runtime
foresight report --json --history-days 30
```

Important options:

- `--project`
- `--severity`
- `--type`
- `--status`
- `--limit`
- `--history-days`
- `--json`
