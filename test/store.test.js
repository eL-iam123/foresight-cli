import test from "node:test";
import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { openDatabase } from "../src/core/db.js";
import { DeprecationStore } from "../src/core/store.js";

test("records and aggregates deprecation sightings", async () => {
  const dbPath = join(tmpdir(), `foresight-test-${Date.now()}.db`);
  const db = await openDatabase(dbPath);
  const store = new DeprecationStore(db);

  const baseFinding = {
    type: "runtime",
    project: "test-project",
    module: "request",
    packageName: null,
    message: "request has been deprecated, use axios instead",
    severity: "medium",
    source: "node",
    replacement: "axios",
    metadata: {}
  };

  const first = store.recordFinding(baseFinding);
  const second = store.recordFinding(baseFinding);
  const rows = store.listDeprecations({ project: "test-project", limit: 10 });

  assert.equal(first.isNew, true);
  assert.equal(second.isNew, false);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].occurrenceCount, 2);

  db.close();
  rmSync(dbPath, { force: true });
});

test("triage updates status and resolved findings reopen when seen again", async () => {
  const dbPath = join(tmpdir(), `foresight-triage-${Date.now()}.db`);
  const db = await openDatabase(dbPath);
  const store = new DeprecationStore(db);

  const finding = {
    type: "runtime",
    project: "test-project",
    module: "legacy-api",
    message: "legacy-api will be removed in the next major version",
    severity: "high",
    source: "node",
    metadata: {}
  };

  const created = store.recordFinding(finding);
  const resolved = store.updateDeprecationStatus({
    id: created.deprecation.id,
    status: "resolved",
    project: "test-project"
  });
  const reopened = store.recordFinding(finding);

  assert.equal(resolved.status, "resolved");
  assert.equal(reopened.isNew, false);
  assert.equal(reopened.deprecation.status, "open");

  db.close();
  rmSync(dbPath, { force: true });
});

test("manages global settings", async () => {
  const dbPath = join(tmpdir(), `foresight-settings-${Date.now()}.db`);
  const db = await openDatabase(dbPath);
  const store = new DeprecationStore(db);

  store.setSetting("testKey", "testValue");
  const value = store.getSetting("testKey");
  const nonExistent = store.getSetting("missing", "default");
  const allSettings = store.getAllSettings();

  assert.equal(value, "testValue");
  assert.equal(nonExistent, "default");
  assert.equal(allSettings.testKey, "testValue");

  store.setSetting("testKey", "updatedValue");
  assert.equal(store.getSetting("testKey"), "updatedValue");

  db.close();
  rmSync(dbPath, { force: true });
});
