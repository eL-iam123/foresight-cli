import test from "node:test";
import assert from "node:assert/strict";
import { renderReportDashboard, renderScanDashboard } from "../src/core/live-ui.js";

test("renderScanDashboard shows running scan summary", () => {
  const output = renderScanDashboard({
    project: "demo-app",
    input: "npm test",
    source: "command",
    follow: false,
    startedAt: "2026-03-25T10:00:00.000Z",
    completedAt: null,
    captured: [
      {
        severity: "high",
        type: "runtime",
        module: "request",
        packageName: null,
        lastSeenAt: "2026-03-25T10:00:05.000Z",
        message: "request is deprecated and will be removed in v2.0"
      }
    ],
    recentLines: ["DeprecationWarning: request is deprecated"],
    status: "running"
  });

  assert.match(output, /Foresight Live Scan/);
  assert.match(output, /Captured: 1/);
  assert.match(output, /Live updates enabled/);
});

test("renderReportDashboard shows refresh details", () => {
  const output = renderReportDashboard({
    project: "demo-app",
    summary: {
      total: 1,
      high: 1,
      medium: 0,
      low: 0
    },
    history: [
      {
        day: "2026-03-25",
        count: 1
      }
    ],
    items: [
      {
        severity: "high",
        type: "runtime",
        module: "request",
        packageName: null,
        occurrenceCount: 2,
        lastSeenAt: "2026-03-25T10:00:05.000Z",
        message: "request is deprecated and will be removed in v2.0"
      }
    ],
    updatedAt: "2026-03-25T10:00:06.000Z",
    intervalSeconds: 2,
    watchMode: true
  });

  assert.match(output, /Foresight Live Report/);
  assert.match(output, /Refreshing every 2s/);
  assert.match(output, /Tracked Deprecations/);
});
