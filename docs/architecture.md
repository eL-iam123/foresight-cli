# Architecture

## System flow

```text
CLI
 ↓
Onboarding / Subscription Registry / Runtime Scanner / Dependency Analyzer
 ↓
GitHub + package.json source loaders / Registry Polling + Rule-based Parser Layer
 ↓
Normalization + Severity Scoring
 ↓
SQLite Store
 ↓
Reporting + Live Terminal UI + Slack/Email Alerts
```

## Subscription path

1. `foresight` or `onboard` walks the user through first-run setup.
2. `subscribe` saves a watchlist of packages from `package.json`, GitHub, or manual entries.
3. `monitor` refreshes GitHub-backed subscriptions from the repo, then polls registry metadata.
4. Version changes or deprecation notices are normalized into tracked findings.
5. New findings are persisted immediately.
6. Slack and email alerts are sent when configured.

## GitHub-backed source sync

1. A subscription can store `repo`, `branch`, and `packageFile` metadata.
2. On each `monitor` run, Foresight fetches the latest manifest from GitHub.
3. Current versions are updated from the repo before npm comparisons happen.
4. Newly added dependencies are subscribed automatically.
5. Dependencies removed from the repo are marked inactive locally.

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
