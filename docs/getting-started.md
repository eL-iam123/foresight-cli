# Getting Started

## Install from npm

```bash
npm install -g foresight-cli
```

## Start with the guided menu

```bash
foresight
```

This is the easiest way to use the tool. On first run it opens onboarding, then the guided menu for subscribe, monitor, report, and scan flows.

## Run onboarding directly

```bash
foresight onboard
```

## Subscribe once

The main workflow starts here:

```bash
foresight subscribe
```

This reads `package.json` and saves the current dependency set as a watchlist.

## Scan for deprecations right now

Check installed dependencies:

```bash
foresight deps
```

Check a real runtime path:

```bash
foresight scan --cmd "npm test" --interactive
```

## Or subscribe a GitHub repo

```bash
foresight subscribe --repo owner/repo
```

This fetches the repo's `package.json`, saves its dependencies as subscriptions, and refreshes them from GitHub on future monitor runs.

Use this as a source input, not as the main product story. The main value is still deprecation tracking, runtime capture, and action planning.

## Run the monitor later

```bash
foresight monitor
```

This checks the internet for:

- deprecation notices
- newer package versions

## Set up email notifications

```bash
export FORESIGHT_EMAIL_TO="you@example.com"
export FORESIGHT_EMAIL_FROM="foresight@example.com"
export FORESIGHT_SMTP_HOST="smtp.example.com"
export FORESIGHT_SMTP_PORT="587"
export FORESIGHT_SMTP_USER="smtp-user"
export FORESIGHT_SMTP_PASS="smtp-pass"
foresight monitor --notify
```

## Schedule it and forget it

```bash
0 9 * * * cd /path/to/project && foresight monitor --notify
```

## View the report

```bash
foresight report --history-days 14
```

## View the prioritized action plan

```bash
foresight report --plan
```

This shows the highest-priority cleanup work first.

## Triage known items

```bash
foresight triage --id <deprecation-id> --status resolved
```

Valid statuses:

- `open`
- `resolved`
- `ignored`

## Keep a live report open

```bash
foresight watch --interval 2
```

This is useful in a second terminal while another monitor or scan is running.

## Subscribe a single package

```bash
foresight subscribe --package request --version 2.88.2 --email you@example.com
```

## Private GitHub repos

Export a token if the repo is private or if you want higher rate limits:

```bash
export GITHUB_TOKEN="ghp_your_token"
foresight subscribe --repo owner/private-repo
```

## Manual runtime scans still exist

If you also want to capture deprecations from actual command output:

```bash
foresight scan --cmd "npm test" --interactive
```

## Enable Slack alerts

```bash
export FORESIGHT_SLACK_WEBHOOK_URL="https://hooks.slack.com/services/..."
export FORESIGHT_ALERT_THRESHOLD="medium"
export FORESIGHT_ALERT_MODE="new"
foresight monitor --notify
```

## Run the demo first

If you want a quick local example before subscribing a real project:

```bash
foresight demo
```
