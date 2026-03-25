# Security Policy

## Supported Versions

Security fixes are handled on a best-effort basis for:

| Version | Supported |
| --- | --- |
| Latest npm release | Yes |
| `main` branch | Yes |
| Older releases | No |

If you are running an older version, upgrade to the latest published release before reporting a security issue unless the upgrade path itself is affected.

## Reporting A Vulnerability

Please do not open a public GitHub issue for a suspected vulnerability.

Preferred path:

1. Use GitHub's private vulnerability reporting for this repository once it is enabled.
2. If private reporting is not available yet, contact the maintainer privately through the contact details on the GitHub profile or npm package metadata.

When reporting, include:

- affected version
- operating system
- clear reproduction steps
- impact assessment
- proof of concept or logs if safe to share
- whether credentials, tokens, or webhook URLs may have been exposed

## What To Report

Examples of issues that should be reported privately:

- arbitrary command execution
- reading or writing files outside expected project paths
- exposure of SMTP credentials, GitHub tokens, Slack webhooks, or other secrets
- unsafe handling of untrusted input that leads to code execution or data exposure
- dependency vulnerabilities with a realistic exploit path in Foresight CLI itself

Examples that usually do not need private disclosure:

- general bugs without security impact
- feature requests
- documentation issues
- outdated dependencies without a demonstrated impact on Foresight CLI

## Response Expectations

Best-effort targets:

- initial acknowledgment within 72 hours
- status update within 7 days
- fix or mitigation plan as soon as the issue is validated

## Disclosure

Please allow time for validation and a fix before public disclosure.

Once a fix is available, the maintainer may publish:

- a patched release
- release notes
- a GitHub security advisory or changelog entry

## Scope Notes

Foresight CLI is a developer tool that can execute local commands, read local log files, store data in SQLite, and send outbound notifications. Reports involving those trust boundaries are especially important.
