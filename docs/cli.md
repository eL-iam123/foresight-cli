# CLI Reference

## `foresight`

Open the guided interactive menu.

This is the recommended entrypoint for most users. On a fresh setup it also launches onboarding automatically.

## `foresight onboard`

Run the guided onboarding flow directly.

Use this if you want to set up a local project, a GitHub repo, or a single package without going through the full menu first.

## `foresight demo`

Run a built-in example warning so you can verify the install and see how tracking works.

```bash
foresight demo
```

## `foresight subscribe`

Save one or more packages as monitored subscriptions.

Examples:

```bash
foresight subscribe
foresight subscribe --repo owner/repo
foresight subscribe --repo vercel/next.js --branch canary
foresight subscribe --package request --version 2.88.2
foresight subscribe --package express --email you@example.com
```

Important options:

- `--package`
- `--repo`
- `--branch`
- `--version`
- `--package-file`
- `--include-dev` / `--no-include-dev`
- `--email`
- `--github-token`
- `--project`
- `--json`

Notes:

- `--repo` treats GitHub as the source of truth and refreshes dependency versions from that repo on each monitor run.
- Public repos work without auth. Private repos require `GITHUB_TOKEN`.

## `foresight subscriptions`

List saved subscriptions.

Examples:

```bash
foresight subscriptions
foresight subscriptions --project api
foresight subscriptions --all
```

## `foresight monitor`

Poll the internet for changes affecting your saved subscriptions.

Examples:

```bash
foresight monitor
foresight monitor --notify
foresight monitor --project api --json
```

This command is intended to run from cron, CI, or another scheduler.

If a subscription came from GitHub, `monitor` refreshes the repo's `package.json` before it checks npm for deprecations and new versions.

## `foresight scan`

Execute a command or read a log file, parse runtime deprecations, persist them, and optionally notify Slack or email.

Examples:

```bash
foresight scan --cmd "npm test" --project api
foresight scan --cmd "npm test" --interactive
foresight scan --file ./logs/app.log --follow --project api
foresight scan --cmd "node server.js" --notify --fail-on high
```

If `--project` is omitted, Foresight uses your `package.json` name or folder name.

Important options:

- `--cmd`
- `--file`
- `--follow`
- `--interactive`
- `--project`
- `--db`
- `--notify`
- `--alert-threshold`
- `--alert-mode`
- `--fail-on`
- `--json`

## `foresight deps`

Inspect direct dependencies from `package.json` and track deprecated packages immediately.

Examples:

```bash
foresight deps --project api
foresight deps --package ./package.json --no-include-dev
foresight deps --notify --fail-on medium
```

## `foresight report`

Query tracked deprecations from SQLite.

Examples:

```bash
foresight report --project api
foresight report --project api --severity high --type runtime
foresight report --watch --interval 2
foresight report --json --history-days 30
```

## `foresight watch`

Open a live report view that refreshes tracked results on an interval.

Examples:

```bash
foresight watch
foresight watch --project api --interval 2
```
