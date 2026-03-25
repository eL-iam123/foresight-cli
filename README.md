# Foresight CLI

Foresight CLI is an open-source monitoring tool for developers who want to set up dependency watchlists once and get notified later when something is deprecated or when a newer version becomes available.

It is built to be beginner-friendly:

- run `foresight` and pick from a menu
- subscribe once
- run checks on a schedule
- get email or Slack alerts
- keep local history in SQLite

## Install

```bash
npm install -g foresight-cli
```

After install, start with:

```bash
foresight
```

That opens the guided interactive menu.

## The main workflow

Subscribe the current project from the menu, or directly:

```bash
foresight subscribe
```

Run a monitor check:

```bash
foresight monitor
```

Review what Foresight has tracked:

```bash
foresight report
```

## Common commands

Open the guided menu:

```bash
foresight
```

Subscribe all packages from `package.json`:

```bash
foresight subscribe
```

Subscribe a single package:

```bash
foresight subscribe --package request --version 2.88.2 --email you@example.com
```

List subscriptions:

```bash
foresight subscriptions
```

Check the internet for deprecations and newer versions:

```bash
foresight monitor --notify
```

Keep a live report open while monitor jobs run:

```bash
foresight watch --interval 2
```

Run a manual runtime scan when you want to inspect a command directly:

```bash
foresight scan --cmd "npm test" --interactive
```

## Setup Once And Forget It

The intended pattern is:

1. `foresight subscribe`
2. configure email or Slack
3. run `foresight monitor --notify` from cron, CI, or another scheduler

Example cron job:

```bash
0 9 * * * cd /path/to/project && foresight monitor --notify
```

## What it does

- saves package subscriptions from your project or from manual entries
- checks npm metadata for deprecations and newer versions
- stores findings in `.foresight/foresight.db`
- tracks first seen, last seen, and occurrence count
- can send Slack and email alerts
- still supports manual runtime scanning when needed

## Alerts

Slack:

```bash
export FORESIGHT_SLACK_WEBHOOK_URL="https://hooks.slack.com/services/..."
export FORESIGHT_ALERT_THRESHOLD="medium"
export FORESIGHT_ALERT_MODE="new"
```

Email:

```bash
export FORESIGHT_EMAIL_TO="team@example.com"
export FORESIGHT_EMAIL_FROM="foresight@example.com"
export FORESIGHT_SMTP_HOST="smtp.example.com"
export FORESIGHT_SMTP_PORT="587"
export FORESIGHT_SMTP_USER="smtp-user"
export FORESIGHT_SMTP_PASS="smtp-pass"
```

Then run:

```bash
foresight monitor --notify
```

## Open Source

Foresight CLI is meant to be published as a public npm package and maintained as an open-source project. Contributions, parser improvements, docs fixes, and issue reports are all welcome.

## Publishing Notes

- the package name is `foresight-cli`
- the repository metadata points to `https://github.com/el-iam213/foresight-cli`
- `npm run pack:check` shows exactly what will be published

## Documentation

- [Getting Started](./docs/getting-started.md)
- [CLI Reference](./docs/cli.md)
- [Architecture](./docs/architecture.md)
- [Publishing](./docs/publishing.md)
- [Contributing](./docs/contributing.md)
- [Roadmap](./docs/roadmap.md)
- [PRD](./docs/prd.md)
- [Parsers](./docs/parsers.md)
- [Data Model](./docs/data-model.md)
