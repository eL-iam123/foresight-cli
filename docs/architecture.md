# Architecture

## System flow

```text
CLI
 ↓
Runtime Scanner / Dependency Analyzer
 ↓
Rule-based Parser Layer
 ↓
Normalization + Severity Scoring
 ↓
SQLite Store
 ↓
Reporting + Slack/Email Alerts
```

## Runtime path

1. `scan --cmd` runs a child process and captures its combined output for deprecation parsing.
2. `scan --file` reads a log file and can keep following appended content in real time.
3. Parsed deprecations are normalized and persisted immediately.
4. New or severe records can trigger Slack and email notifications.

## Data lifecycle

- A normalized deprecation record is keyed by a fingerprint.
- First sighting inserts a durable record.
- Subsequent sightings append an event and increment occurrence count.
- Reports summarize current open records and recent history.

## Open-source posture

- Tracking is stateful rather than ephemeral.
- Alerting is built into the core data path.
- The codebase is kept small and modular so outside contributors can add parsers and tests without learning a large framework first.
