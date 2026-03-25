import test from "node:test";
import assert from "node:assert/strict";
import { parseRuntimeDeprecation } from "../src/parsers/nodeDeprecationParser.js";

test("parses a node runtime deprecation warning", () => {
  const finding = parseRuntimeDeprecation(
    "(node:1234) [DEP0005] DeprecationWarning: Buffer() is deprecated and will be removed in v2.0"
  );

  assert.equal(finding.type, "runtime");
  assert.equal(finding.severity, "high");
  assert.equal(finding.metadata.code, "DEP0005");
  assert.match(finding.message, /Buffer\(\) is deprecated/);
});

test("returns null for non-deprecation lines", () => {
  const finding = parseRuntimeDeprecation("server started on port 3000");
  assert.equal(finding, null);
});
