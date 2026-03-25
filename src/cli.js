#!/usr/bin/env node
import { runDepsCommand } from "./commands/deps.js";
import { runDemoCommand } from "./commands/demo.js";
import { runReportCommand } from "./commands/report.js";
import { runScanCommand } from "./commands/scan.js";
import { parseArgv, printUsage } from "./core/cli.js";

async function main() {
  const { command, options } = parseArgv(process.argv.slice(2));

  if (!command || command === "help" || command === "--help") {
    printUsage();
    return;
  }

  switch (command) {
    case "demo":
      await runDemoCommand(options);
      return;
    case "scan":
      await runScanCommand(options);
      return;
    case "deps":
      await runDepsCommand(options);
      return;
    case "report":
      await runReportCommand(options);
      return;
    default:
      throw new Error(`Unknown command: ${command}`);
  }
}

main().catch((error) => {
  process.stderr.write(`[foresight] ${error.message}\n`);
  process.exitCode = 1;
});
