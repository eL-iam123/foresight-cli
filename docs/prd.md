# Product Requirements Document

## Product Name

Foresight CLI

## Overview

Foresight CLI is an open-source developer tool that detects deprecation warnings during runtime and dependency analysis, stores them as durable records, tracks them over time, and helps developers act on them before they become breaking changes.

## Problem Statement

Deprecation warnings are usually transient, unowned, and disconnected from delivery workflows. Teams notice them late, lose historical context, and struggle to prioritize which warnings are actually risky.

## Goals

- Capture runtime and log-based deprecations in real time.
- Normalize, persist, and query deprecations over time.
- Detect deprecated dependencies in Node.js projects.
- Alert teams through Slack and email with minimal operational overhead.
- Support CI/CD gating for medium- and high-severity risks.

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

### Runtime Scanner

- Capture deprecation output from `stdout`, `stderr`, and log files.
- Support live command execution and log following.
- Parse Node.js deprecation warnings into normalized records.

### Dependency Analyzer

- Inspect `package.json` dependencies and dev dependencies.
- Detect deprecated packages from installed manifests when available.
- Fall back to npm registry metadata where needed.

### Tracking and Persistence

- Persist deprecation records in SQLite.
- Track first seen, last seen, occurrence count, and source metadata.
- Support filtering by project, severity, type, and time window.

### Alerts

- Send Slack webhook alerts for new or regressing deprecations.
- Send SMTP email alerts for the same events.
- Support thresholding by severity and alert mode.

### Reporting

- Render terminal tables for fast triage.
- Export structured JSON for automation and CI/CD.
- Provide historical event counts for trend monitoring.

## Non-Functional Requirements

- Linux-first operation
- Low overhead during runtime scans
- Fault-tolerant parsing
- Extensible parser architecture
- Open-source-friendly contribution flow and documentation

## MVP Scope

- Node.js runtime parser
- Direct dependency analyzer
- SQLite storage
- CLI commands: `demo`, `scan`, `deps`, `report`
- Slack and email alert delivery

## Future Scope

- Time-to-break prediction
- Guided migration suggestions
- Monorepo-aware package ownership
- Dashboard and team workflows
- CI/CD policy packs and GitHub App integration
