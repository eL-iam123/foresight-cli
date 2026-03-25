# Product Requirements Document

## Product Name

Foresight CLI

## Overview

Foresight CLI is an open-source developer monitoring tool that lets users subscribe once to packages or projects, polls dependency ecosystems for future-breaking changes, stores durable records over time, and notifies users when deprecations or newer versions appear.

## Problem Statement

Developers rarely remember to manually check whether libraries are being deprecated or whether a newer version is available. Important upgrade risks often surface too late, after release notes, registry notices, or ecosystem changes have already moved on.

## Goals

- Enable setup-once monitoring instead of manual repeated checks.
- Detect deprecated dependencies in Node.js projects.
- Support GitHub repos as a live source of dependency truth.
- Detect newer versions and notify users when a watchlist changes.
- Normalize, persist, and query findings over time.
- Alert teams through Slack and email with minimal operational overhead.

## Non-Goals

- Full static analysis for all languages in the MVP.
- AI-based semantic classification in the MVP.
- A browser dashboard in phase 1.
- Enterprise RBAC, billing, and tenancy in phase 1.

## Target Users

- Individual developers
- OSS maintainers
- Small engineering teams
- DevOps and platform teams that want upgrade risk surfaced earlier
- First-time CLI users who need simple workflows and copy-paste examples

## Functional Requirements

### Subscription Monitor

- Save watchlists from `package.json` or manual package entries.
- Save watchlists from GitHub repos and refresh them during later monitor runs.
- Poll the internet for deprecation notices and newer versions.
- Notify users when something changes, without requiring them to remember to scan manually.

### Onboarding

- Open a guided first-run flow from `foresight` or `foresight onboard`.
- Let beginners choose between a local project, a GitHub repo, or a single package.
- Make the default workflow discoverable without requiring users to memorize flags.

### Runtime Scanner

- Capture deprecation output from `stdout`, `stderr`, and log files.
- Support live command execution and log following.
- Parse Node.js deprecation warnings into normalized records.

### Tracking and Persistence

- Persist findings in SQLite.
- Track first seen, last seen, occurrence count, and source metadata.
- Support filtering by project, severity, type, and time window.

### Alerts

- Send Slack webhook alerts for new or regressing findings.
- Send SMTP email alerts for the same events.
- Support thresholding by severity and alert mode.

### Reporting

- Render terminal tables for fast triage.
- Export structured JSON for automation and CI/CD.
- Provide historical event counts for trend monitoring.

## Non-Functional Requirements

- Linux-first operation
- Fault-tolerant parsing
- Extensible parser architecture
- Open-source-friendly contribution flow and documentation

## MVP Scope

- npm package subscription monitor
- GitHub-backed subscription source
- Node.js runtime parser
- SQLite storage
- CLI commands: `onboard`, `demo`, `subscribe`, `subscriptions`, `monitor`, `scan`, `deps`, `report`
- Slack and email alert delivery

## Future Scope

- Time-to-break prediction
- Guided migration suggestions
- Hosted scheduler and managed notifications
- Monorepo-aware package ownership
- Dashboard and team workflows
