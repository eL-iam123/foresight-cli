import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { runScanCommand } from "./scan.js";

const MODULE_DIR = dirname(fileURLToPath(import.meta.url));
const FIXTURE_PATH = resolve(MODULE_DIR, "../../fixtures/emit-warning.fixture.js");

export async function runDemoCommand(options) {
  if (!options.json) {
    process.stdout.write(
      "Running a built-in demo so you can see how Foresight stores a deprecation.\n\n"
    );
  }

  await runScanCommand({
    ...options,
    cmd: `node "${FIXTURE_PATH}"`,
    project: options.project || "foresight-demo"
  });
}
