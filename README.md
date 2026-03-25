# Foresight CLI

Foresight CLI is a commercial-grade developer intelligence tool that captures deprecation warnings in real time, persists them in SQLite, and routes actionable alerts to Slack and email before upgrade risk turns into production breakage.

## What ships in this scaffold

- Real-time runtime warning capture from a live command or log file
- Dependency deprecation analysis for Node.js projects
- SQLite-backed history with first-seen, last-seen, and occurrence tracking
- Alert delivery hooks for Slack webhooks and SMTP email
- CLI reporting for terminal workflows and CI/CD gates

## Quick start

```bash
npm install
npm link
foresight scan --cmd "node ./test/fixtures/emit-warning.fixture.js" --project demo-app
foresight report --project demo-app
```

## Core commands

```bash
foresight scan --cmd "npm test" --project api
foresight scan --file ./logs/app.log --follow --project api
foresight deps --project api
foresight report --project api --history-days 30
```

## Alert configuration

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

Then run scans with `--notify` or rely on the configured channels automatically.

## Command behavior

- `scan` captures runtime deprecations from a command or log file and persists them immediately.
- `deps` inspects direct dependencies from `package.json`, prefers installed package metadata, and can fall back to npm registry lookups.
- `report` shows open deprecations, severity distribution, and recent event history from SQLite.

## Documentation

- [PRD](./docs/prd.md)
- [Getting Started](./docs/getting-started.md)
- [Architecture](./docs/architecture.md)
- [CLI](./docs/cli.md)
- [Parsers](./docs/parsers.md)
- [Data Model](./docs/data-model.md)
- [Contributing](./docs/contributing.md)
- [Roadmap](./docs/roadmap.md)
