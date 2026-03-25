# Foresight CLI

Foresight CLI is an open-source command-line tool that helps developers spot deprecation warnings early, save them locally, and review them later in one place.

It is built to be beginner-friendly:

- simple commands
- copy-paste examples
- a built-in `demo` command
- local SQLite storage so you do not need extra infrastructure

## Install

```bash
npm install -g foresight-cli
```

After install, the command is:

```bash
foresight
```

## First 60 seconds

1. Run the built-in example:

```bash
foresight demo
```

2. Check the saved report:

```bash
foresight report
```

3. Scan your own project dependencies:

```bash
foresight deps
```

## Common commands

Scan a command and track runtime warnings:

```bash
foresight scan --cmd "npm test"
```

Scan a log file in real time:

```bash
foresight scan --file ./logs/app.log --follow
```

Show tracked warnings:

```bash
foresight report --history-days 30
```

Fail CI when a high-severity deprecation appears:

```bash
foresight scan --cmd "npm test" --fail-on high
```

## What it does

- captures runtime deprecations from commands and log files
- checks `package.json` dependencies for deprecated packages
- stores results in `.foresight/foresight.db`
- tracks first seen, last seen, and occurrence count
- can send Slack and email alerts

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

Then run scans with `--notify` or rely on the configured channels automatically.

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
