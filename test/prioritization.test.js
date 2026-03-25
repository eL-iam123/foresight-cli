import test from "node:test";
import assert from "node:assert/strict";
import { buildActionPlan, scoreDeprecation } from "../src/core/prioritization.js";

test("prioritization ranks high-severity runtime deprecations above low upgrades", () => {
  const plan = buildActionPlan([
    {
      id: "upgrade-1",
      type: "upgrade",
      module: "chalk",
      severity: "low",
      status: "open",
      occurrenceCount: 1,
      lastSeenAt: "2026-03-20T10:00:00.000Z",
      message: "Newer version available for chalk",
      metadata: {
        currentVersion: "5.0.0",
        latestVersion: "5.1.0"
      }
    },
    {
      id: "runtime-1",
      type: "runtime",
      module: "legacy-api",
      severity: "high",
      status: "open",
      occurrenceCount: 4,
      lastSeenAt: "2026-03-25T10:00:00.000Z",
      message: "legacy-api will be removed in the next major release",
      replacement: "modern-api",
      metadata: {}
    }
  ]);

  assert.equal(plan[0].id, "runtime-1");
  assert.match(plan[0].nextAction, /Replace legacy-api with modern-api/i);
  assert.match(plan[1].reason, /newer npm release is available/i);
  assert.ok(plan[0].priorityScore > plan[1].priorityScore);
});

test("scoreDeprecation caps priority scores at 100", () => {
  const score = scoreDeprecation({
    type: "runtime",
    severity: "high",
    occurrenceCount: 20,
    lastSeenAt: "2026-03-25T10:00:00.000Z",
    message: "critical package will be removed and is unsupported",
    replacement: "new-package"
  });

  assert.equal(score, 100);
});
