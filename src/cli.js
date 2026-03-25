#!/usr/bin/env node
import { runDepsCommand } from "./commands/deps.js";
import { runDemoCommand } from "./commands/demo.js";
import { runInteractiveCommand } from "./commands/interactive.js";
import { runMonitorCommand } from "./commands/monitor.js";
import { runOnboardingCommand } from "./commands/onboard.js";
import { runReportCommand } from "./commands/report.js";
import { runScanCommand } from "./commands/scan.js";
import { runSubscribeCommand } from "./commands/subscribe.js";
import { runSubscriptionsCommand } from "./commands/subscriptions.js";
import { runTriageCommand } from "./commands/triage.js";
import { parseArgv, printUsage } from "./core/cli.js";

async function main() {
  const { command, options } = parseArgv(process.argv.slice(2));

  if (!command) {
    if (process.stdout.isTTY && process.stdin.isTTY) {
      await runInteractiveCommand(options);
      return;
    }

    printUsage();
    return;
  }

  if (command === "help" || command === "--help") {
    printUsage();
    return;
  }

  switch (command) {
    case "interactive":
      await runInteractiveCommand(options);
      return;
    case "onboard":
      await runOnboardingCommand(options);
      return;
    case "demo":
      await runDemoCommand(options);
      return;
    case "scan":
      await runScanCommand(options);
      return;
    case "deps":
      await runDepsCommand(options);
      return;
    case "subscribe":
      await runSubscribeCommand(options);
      return;
    case "subscriptions":
      await runSubscriptionsCommand(options);
      return;
    case "monitor":
      await runMonitorCommand(options);
      return;
    case "report":
      await runReportCommand(options);
      return;
    case "triage":
      await runTriageCommand(options);
      return;
    case "watch":
      await runReportCommand({
        ...options,
        watch: true
      });
      return;
    default:
      throw new Error(`Unknown command: ${command}`);
  }
}

main().catch((error) => {
  process.stderr.write(`[foresight] ${error.message}\n`);
  process.exitCode = 1;
});
