import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { detectProjectName } from "../src/core/cli.js";

test("detectProjectName uses package name without npm scope", () => {
  const projectDir = mkdtempSync(join(tmpdir(), "foresight-project-"));
  writeFileSync(
    join(projectDir, "package.json"),
    JSON.stringify({ name: "@demo/my-app" }, null, 2)
  );

  assert.equal(detectProjectName(projectDir), "my-app");

  rmSync(projectDir, { recursive: true, force: true });
});

test("detectProjectName falls back to folder name", () => {
  const projectDir = mkdtempSync(join(tmpdir(), "foresight-folder-"));

  assert.match(detectProjectName(projectDir), /^foresight-folder-/);

  rmSync(projectDir, { recursive: true, force: true });
});
