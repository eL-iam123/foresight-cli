import test from "node:test";
import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { openDatabase } from "../src/core/db.js";
import { DeprecationStore } from "../src/core/store.js";
import {
  loadGitHubSubscriptions,
  runSubscriptionMonitor
} from "../src/services/subscriptionMonitor.js";

test("loadGitHubSubscriptions reads dependencies from a GitHub package manifest", async () => {
  const requests = [];
  const subscriptions = await loadGitHubSubscriptions({
    repo: "el-iam213/foresight-cli",
    branch: "main",
    packageFile: "package.json",
    includeDev: false,
    fetchImpl: async (url) => {
      requests.push(url);

      return {
        ok: true,
        text: async () =>
          JSON.stringify({
            dependencies: {
              chalk: "^5.4.1"
            },
            devDependencies: {
              vitest: "^1.6.0"
            }
          })
      };
    }
  });

  assert.equal(
    requests[0],
    "https://raw.githubusercontent.com/el-iam213/foresight-cli/main/package.json"
  );
  assert.deepEqual(subscriptions, [
    {
      targetName: "chalk",
      currentVersion: "^5.4.1",
      metadata: {
        source: "github",
        repo: "el-iam213/foresight-cli",
        branch: "main",
        packageFile: "package.json",
        includeDev: false,
        dependencyType: "dependencies"
      }
    }
  ]);
});

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

test("subscription monitor syncs GitHub subscriptions before checking npm", async () => {
  const dbPath = join(tmpdir(), `foresight-github-sync-${Date.now()}.db`);
  const db = await openDatabase(dbPath);
  const store = new DeprecationStore(db);

  const created = store.upsertSubscription({
    project: "repo-app",
    targetType: "npm-package",
    targetName: "request",
    currentVersion: "1.0.0",
    metadata: {
      source: "github",
      repo: "el-iam213/foresight-cli",
      branch: "main",
      packageFile: "package.json",
      includeDev: true
    }
  });

  const lookups = [];
  const result = await runSubscriptionMonitor({
    subscriptions: [created.subscription],
    store,
    loadSourceSubscriptions: async () => [
      {
        targetName: "request",
        currentVersion: "2.88.2",
        metadata: {
          source: "github",
          repo: "el-iam213/foresight-cli",
          branch: "main",
          packageFile: "package.json",
          includeDev: true,
          dependencyType: "dependencies"
        }
      },
      {
        targetName: "axios",
        currentVersion: "1.7.0",
        metadata: {
          source: "github",
          repo: "el-iam213/foresight-cli",
          branch: "main",
          packageFile: "package.json",
          includeDev: true,
          dependencyType: "dependencies"
        }
      }
    ],
    lookupPackageStatus: async (packageName) => {
      lookups.push(packageName);

      if (packageName === "request") {
        return {
          latestVersion: "2.88.2",
          deprecatedMessage: "request has been deprecated, use axios instead"
        };
      }

      return {
        latestVersion: "1.7.1",
        deprecatedMessage: null
      };
    },
    now: () => "2026-03-25T12:00:00.000Z"
  });

  const subscriptions = store.listSubscriptions({ project: "repo-app", active: true });

  assert.equal(result.checked, 2);
  assert.equal(result.changed, 2);
  assert.deepEqual(lookups.sort(), ["axios", "request"]);
  assert.equal(subscriptions.length, 2);
  assert.equal(
    subscriptions.find((subscription) => subscription.targetName === "request")
      ?.currentVersion,
    "2.88.2"
  );
  assert.ok(subscriptions.find((subscription) => subscription.targetName === "axios"));
  assert.deepEqual(
    result.findings.map((finding) => finding.type).sort(),
    ["subscription", "upgrade"]
  );

  db.close();
  rmSync(dbPath, { force: true });
});
