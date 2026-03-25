# Getting Started

## Install

```bash
npm install
npm link
```

## First runtime scan

```bash
foresight scan --cmd "node ./test/fixtures/emit-warning.fixture.js" --project demo-app
```

## First dependency scan

```bash
foresight deps --project demo-app
```

## View tracked results

```bash
foresight report --project demo-app --history-days 14
```

## Enable Slack alerts

```bash
export FORESIGHT_SLACK_WEBHOOK_URL="https://hooks.slack.com/services/..."
export FORESIGHT_ALERT_THRESHOLD="medium"
export FORESIGHT_ALERT_MODE="new"
foresight scan --cmd "npm test" --project demo-app --notify
```

## Enable email alerts

```bash
export FORESIGHT_EMAIL_TO="team@example.com"
export FORESIGHT_EMAIL_FROM="foresight@example.com"
export FORESIGHT_SMTP_HOST="smtp.example.com"
export FORESIGHT_SMTP_PORT="587"
export FORESIGHT_SMTP_USER="smtp-user"
export FORESIGHT_SMTP_PASS="smtp-pass"
foresight deps --project demo-app --notify
```
