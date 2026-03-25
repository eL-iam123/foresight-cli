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
