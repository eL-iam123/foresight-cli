# Architecture

## System flow

```text
CLI
 ↓
Subscription Registry / Runtime Scanner / Dependency Analyzer
 ↓
Registry Polling + Rule-based Parser Layer
 ↓
Normalization + Severity Scoring
 ↓
SQLite Store
 ↓
Reporting + Live Terminal UI + Slack/Email Alerts
```

## Subscription path

1. `subscribe` saves a watchlist of packages from `package.json` or manual entries.
2. `monitor` polls registry metadata for those subscriptions.
3. Version changes or deprecation notices are normalized into tracked findings.
4. New findings are persisted immediately.
5. Slack and email alerts are sent when configured.

## Runtime path

1. `scan --cmd` runs a child process and captures its combined output for deprecation parsing.
2. `scan --file` reads a log file and can keep following appended content in real time.
3. `scan --interactive` renders a live dashboard from the same stream while records are being captured.
4. Parsed runtime deprecations are normalized and persisted immediately.

## Data lifecycle

- A normalized finding is keyed by a fingerprint.
- First sighting inserts a durable record.
- Subsequent sightings append an event and increment occurrence count.
- Reports summarize current open records and recent history.

## Open-source posture

- Tracking is stateful rather than ephemeral.
- Alerting is built into the core data path.
- The codebase is kept small and modular so outside contributors can add parsers and tests without learning a large framework first.
