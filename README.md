# Foresight CLI

Foresight CLI is an open-source deprecation intelligence tool for developers who want early warning on future-breaking changes, not just version bump notifications.

It watches runtime warnings, dependency deprecation notices, and saved subscriptions, then turns them into a tracked backlog with alerts, action plans, and triage.

It is built to be beginner-friendly:

- run `foresight` and follow onboarding
- scan a local project, logs, or a GitHub-backed subscription source
- turn warnings into a prioritized action plan
- mark findings resolved or ignored so the backlog stays clean
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

Scan the current project for deprecated dependencies:

```bash
foresight deps
```

Run a real command and catch runtime deprecations live:

```bash
foresight scan --cmd "npm test" --interactive
```

Subscribe a GitHub repo if you want GitHub to be one source of dependency truth:

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

See only the ranked action plan:

```bash
foresight report --plan
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

Scan direct dependencies for deprecations right now:

```bash
foresight deps
```

Run a live runtime scan:

```bash
foresight scan --cmd "npm test" --interactive
```

Subscribe packages from a GitHub repo:

```bash
foresight subscribe --repo vercel/next.js --branch canary
```

Subscribe a single package:

```bash
foresight subscribe --package request --version 2.88.2 --email you@example.com
```

Subscribe a package and send alerts directly to a Slack channel too:

```bash
foresight subscribe --package request --version 2.88.2 --email you@example.com --slack-channel alerts-dev
```

List subscriptions:

```bash
foresight subscriptions
```

Check the internet for deprecations and newer versions:

```bash
foresight monitor --notify
```

Show the prioritized cleanup plan:

```bash
foresight report --plan
```

Mark a known item resolved or ignored:

```bash
foresight triage --id <deprecation-id> --status resolved
```

Keep a live report open while monitor jobs run:

```bash
foresight watch --interval 2
```

## Setup Once And Forget It

The intended pattern is:

1. `foresight onboard`
2. run `foresight deps` or `foresight scan --cmd "npm test"` to capture current debt
3. configure email or Slack
4. run `foresight monitor --notify` from cron, CI, or another scheduler

Example cron job:

```bash
0 9 * * * cd /path/to/project && foresight monitor --notify
```

## What it does

- captures runtime deprecations from real command output and log files
- scans direct dependencies for maintainer deprecation notices
- saves subscriptions from local projects, manual packages, or GitHub-backed sources
- checks npm metadata for deprecations and newer versions
- ranks findings into a prioritized action plan
- lets you triage findings as open, resolved, or ignored
- stores findings in `.foresight/foresight.db`
- tracks first seen, last seen, and occurrence count
- can send Slack and email alerts
- refreshes GitHub-backed subscriptions from the repo before each monitor run

## Features That Stand Out

- Runtime-aware detection: catches warnings that package bots never see.
- Prioritized action plan: `foresight report --plan` ranks what to fix first.
- Triage workflow: `foresight triage` lets you manage the backlog like real maintenance work.
- Local history: the same issue can be tracked across scans, monitor runs, and dependency checks.
- GitHub as input, not product: repos can feed subscriptions without making this a GitHub-only tool.

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

Slack webhook:

```bash
export FORESIGHT_SLACK_WEBHOOK_URL="https://hooks.slack.com/services/..."
export FORESIGHT_ALERT_THRESHOLD="medium"
export FORESIGHT_ALERT_MODE="new"
```

Slack bot token plus direct channel delivery:

```bash
export FORESIGHT_SLACK_BOT_TOKEN="xoxb-your-bot-token"
export FORESIGHT_SLACK_CHANNEL="alerts-dev"
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

If you save a subscription with `--email` or `--slack-channel`, `monitor --notify` uses those per-subscription targets directly.

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
