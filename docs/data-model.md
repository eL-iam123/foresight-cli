# Data Model

## `deprecations`

Tracks the durable record for each normalized deprecation fingerprint.

Fields:

- `id`
- `fingerprint`
- `type`
- `project`
- `module`
- `package_name`
- `message`
- `severity`
- `source`
- `replacement`
- `first_seen_at`
- `last_seen_at`
- `occurrence_count`
- `status`
- `metadata_json`

## `deprecation_events`

Tracks every sighting over time.

Fields:

- `id`
- `deprecation_id`
- `detected_at`
- `raw_line`
- `metadata_json`

## `alerts`

Tracks alert delivery attempts.

Fields:

- `id`
- `deprecation_id`
- `channel`
- `status`
- `created_at`
- `delivered_at`
- `error_message`
- `payload_json`
