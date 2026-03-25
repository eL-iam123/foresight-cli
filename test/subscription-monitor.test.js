import test from "node:test";
import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { openDatabase } from "../src/core/db.js";
import { DeprecationStore } from "../src/core/store.js";
import { runSubscriptionMonitor } from "../src/services/subscriptionMonitor.js";

test("subscription monitor detects new versions and deprecations", async () => {
  const dbPath = join(tmpdir(), `foresight-subscriptions-${Date.now()}.db`);
  const db = await openDatabase(dbPath);
  const store = new DeprecationStore(db);

  const created = store.upsertSubscription({
    project: "demo-app",
    targetType: "npm-package",
    targetName: "request",
    currentVersion: "2.88.1",
    notifyEmail: "team@example.com",
    metadata: {
      source: "manual"
    }
  });

  const deliveries = [];
  const result = await runSubscriptionMonitor({
    subscriptions: [created.subscription],
    project: "demo-app",
    store,
    lookupPackageStatus: async () => ({
      latestVersion: "2.88.2",
      deprecatedMessage: "request has been deprecated, use axios instead"
    }),
    notifyFinding: async ({ deprecation, emailTo }) => {
      deliveries.push({
        message: deprecation.message,
        emailTo
      });

      return [
        {
          channel: "email",
          status: "delivered",
          deliveredAt: "2026-03-25T12:00:00.000Z",
          payload: {
            to: emailTo
          }
        }
      ];
    },
    now: () => "2026-03-25T12:00:00.000Z"
  });

  const subscriptions = store.listSubscriptions({ project: "demo-app" });
  const findings = store.listDeprecations({ project: "demo-app", limit: 10, status: "all" });

  assert.equal(result.checked, 1);
  assert.equal(result.changed, 2);
  assert.equal(result.alertsAttempted, 2);
  assert.equal(subscriptions[0].latestVersion, "2.88.2");
  assert.equal(findings.length, 2);
  assert.deepEqual(
    deliveries.map((delivery) => delivery.emailTo),
    ["team@example.com", "team@example.com"]
  );

  db.close();
  rmSync(dbPath, { force: true });
});
