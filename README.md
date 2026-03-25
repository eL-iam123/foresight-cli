# Foresight CLI

Foresight CLI is an open-source monitoring tool for developers who want to set up dependency watchlists once and get notified later when something is deprecated or when a newer version becomes available.

It is built to be beginner-friendly:

- run `foresight` and follow onboarding
- subscribe once
- point it at a GitHub repo or a local project
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

That opens the guided interactive menu and first-run onboarding.

## The main workflow

Start onboarding from the menu, or directly:

```bash
foresight onboard
```

Subscribe the current project from the menu, or directly:

```bash
foresight subscribe
```

Or subscribe a GitHub repo so Foresight keeps checking the repo's `package.json` later:

```bash
foresight subscribe --repo el-iam213/foresight-cli
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

Open onboarding directly:

```bash
foresight onboard
```

Subscribe all packages from `package.json`:

```bash
foresight subscribe
```

Subscribe packages from a GitHub repo:

```bash
foresight subscribe --repo vercel/next.js --branch canary
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

1. `foresight onboard`
2. configure email or Slack
3. run `foresight monitor --notify` from cron, CI, or another scheduler

Example cron job:

```bash
0 9 * * * cd /path/to/project && foresight monitor --notify
```

## What it does

- saves package subscriptions from your project or from manual entries
- can treat a GitHub repo as the source of truth for dependency versions
- checks npm metadata for deprecations and newer versions
- refreshes GitHub-backed subscriptions from the repo before each monitor run
- stores findings in `.foresight/foresight.db`
- tracks first seen, last seen, and occurrence count
- can send Slack and email alerts
- still supports manual runtime scanning when needed

## GitHub Monitoring

Public repos work without extra setup:

```bash
foresight subscribe --repo owner/repo
foresight monitor
```

For private repos or higher GitHub API limits, export:

```bash
export GITHUB_TOKEN="ghp_your_token"
```

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
- [Security Policy](./SECURITY.md)
- [Publishing](./docs/publishing.md)
- [Contributing](./docs/contributing.md)
- [Roadmap](./docs/roadmap.md)
- [PRD](./docs/prd.md)
- [Parsers](./docs/parsers.md)
- [Data Model](./docs/data-model.md)
