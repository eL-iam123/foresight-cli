import { openDatabase } from "../core/db.js";
import { DeprecationStore } from "../core/store.js";
import {
  resolveDbPath,
  resolveProjectName,
  toBoolean
} from "../core/cli.js";
import { createLiveRenderer, renderScanDashboard } from "../core/live-ui.js";
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
  const interactive =
    toBoolean(options.interactive, false) &&
    !toBoolean(options.json, false) &&
    Boolean(process.stdout.isTTY);
  const quiet = toBoolean(options.quiet, interactive || toBoolean(options.json, false));
  const captured = [];
  const recentLines = [];
  const startedAt = new Date().toISOString();
  let completedAt = null;
  let matchingSeverityCount = 0;
  const liveRenderer = createLiveRenderer({
    enabled: interactive,
    render: () =>
      renderScanDashboard({
        project,
        input: options.cmd || options.file,
        source: options.cmd ? "command" : "file",
        follow: toBoolean(options.follow, false),
        startedAt,
        completedAt,
        captured,
        recentLines,
        status: completedAt ? "completed" : "running"
      })
  });

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

    liveRenderer.requestRender();
  };

  const recordLine = async (line) => {
    if (!interactive) {
      return;
    }

    recentLines.push(line);
    if (recentLines.length > 8) {
      recentLines.shift();
    }

    liveRenderer.requestRender();
  };

  if (interactive) {
    liveRenderer.renderNow();
  }

  const scanResult = options.cmd
    ? await scanCommand({
        command: options.cmd,
        onFinding: persistFinding,
        mirrorOutput: !interactive && !toBoolean(options.json, false),
        onLine: recordLine
      })
    : await scanFile({
        filePath: options.file,
        follow: toBoolean(options.follow, false),
        onFinding: persistFinding,
        onLine: recordLine
      });

  completedAt = new Date().toISOString();
  liveRenderer.stop({ finalRender: interactive });

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
    if (interactive) {
      process.stdout.write("\n");
    }
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
