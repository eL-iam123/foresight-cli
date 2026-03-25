import { openDatabase } from "../core/db.js";
import { DeprecationStore } from "../core/store.js";
import {
  resolveDbPath,
  resolveProjectName,
  toBoolean
} from "../core/cli.js";
import { formatTable, formatTimestamp, printJson, truncate } from "../core/output.js";
import { meetsSeverityThreshold } from "../core/severity.js";
import { createAlertDispatcher } from "../services/alertDispatcher.js";
import { scanCommand, scanFile } from "../services/runtimeScanner.js";

export async function runScanCommand(options) {
  if (!options.cmd && !options.file) {
    throw new Error(
      "scan requires either --cmd or --file. Try `foresight demo` for a first run."
    );
  }

  const db = await openDatabase(resolveDbPath(options));
  const store = new DeprecationStore(db);
  const alerts = createAlertDispatcher(options);
  const project = resolveProjectName(options);
  const notify = toBoolean(options.notify, alerts.enabled);
  const quiet = toBoolean(options.quiet, toBoolean(options.json, false));
  const captured = [];
  let matchingSeverityCount = 0;

  const persistFinding = async (finding) => {
    const result = store.recordFinding({
      ...finding,
      project,
      detectedAt: new Date().toISOString()
    });

    captured.push({
      ...result.deprecation,
      isNew: result.isNew
    });

    if (notify) {
      const deliveries = await alerts.notifyFinding({
        deprecation: result.deprecation,
        isNew: result.isNew
      });

      for (const delivery of deliveries) {
        store.recordAlert({
          deprecationId: result.deprecation.id,
          ...delivery
        });
      }
    }

    if (!quiet) {
      process.stderr.write(
        `[foresight] captured ${result.deprecation.severity.toUpperCase()} ${result.deprecation.type} deprecation: ${truncate(
          result.deprecation.message,
          96
        )}\n`
      );
    }
  };

  const scanResult = options.cmd
    ? await scanCommand({
        command: options.cmd,
        onFinding: persistFinding,
        mirrorOutput: !toBoolean(options.json, false)
      })
    : await scanFile({
        filePath: options.file,
        follow: toBoolean(options.follow, false),
        onFinding: persistFinding
      });

  const failOn = options.failOn || null;
  if (failOn) {
    matchingSeverityCount = captured.filter((item) =>
      meetsSeverityThreshold(item.severity, failOn)
    ).length;
  }

  const output = {
    project,
    source: options.cmd ? "command" : "file",
    input: options.cmd || options.file,
    matches: captured.length,
    exitCode: scanResult.exitCode ?? 0,
    follow: toBoolean(options.follow, false),
    items: captured
  };

  if (toBoolean(options.json, false)) {
    printJson(output);
  } else {
    process.stdout.write(
      `Project: ${project}\nScanned ${options.cmd ? "command" : "file"}: ${options.cmd || options.file}\n\n`
    );
    process.stdout.write(
      `${formatTable(
        [
          { key: "severity", label: "Severity" },
          { key: "type", label: "Type" },
          { key: "module", label: "Module" },
          { key: "count", label: "Count" },
          { key: "lastSeenAt", label: "Last Seen" },
          { key: "message", label: "Message" }
        ],
        captured.map((item) => ({
          severity: item.severity,
          type: item.type,
          module: item.module || "unknown",
          count: item.occurrenceCount,
          lastSeenAt: formatTimestamp(item.lastSeenAt),
          message: truncate(item.message, 72)
        }))
      )}\n`
    );

    if (captured.length === 0) {
      process.stdout.write(
        "\nNo deprecations were captured in this run.\n"
      );
    }
  }

  db.close();

  if (matchingSeverityCount > 0) {
    process.exitCode = 1;
  } else if (scanResult.exitCode && scanResult.exitCode !== 0) {
    process.exitCode = scanResult.exitCode;
  }
}
