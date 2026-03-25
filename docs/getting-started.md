# Getting Started

## Install from npm

```bash
npm install -g foresight-cli
```

## Run the demo first

If you are brand new to the tool, start here:

```bash
foresight demo
```

That command runs a built-in sample deprecation and stores it locally so you can see the full workflow.

## Scan your own project

```bash
foresight scan --cmd "npm test"
```

## Check dependencies

```bash
foresight deps
```

## View the report

```bash
foresight report --history-days 14
```

## Use a custom project name

Foresight uses your `package.json` name automatically. You can override it:

```bash
foresight scan --cmd "npm test" --project my-api
```

## Enable Slack alerts

```bash
export FORESIGHT_SLACK_WEBHOOK_URL="https://hooks.slack.com/services/..."
export FORESIGHT_ALERT_THRESHOLD="medium"
export FORESIGHT_ALERT_MODE="new"
foresight scan --cmd "npm test" --notify
```

## Enable email alerts

```bash
export FORESIGHT_EMAIL_TO="team@example.com"
export FORESIGHT_EMAIL_FROM="foresight@example.com"
export FORESIGHT_SMTP_HOST="smtp.example.com"
export FORESIGHT_SMTP_PORT="587"
export FORESIGHT_SMTP_USER="smtp-user"
export FORESIGHT_SMTP_PASS="smtp-pass"
foresight deps --notify
```
