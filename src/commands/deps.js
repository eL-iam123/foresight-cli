import { openDatabase } from "../core/db.js";
import { DeprecationStore } from "../core/store.js";
import {
  resolveDbPath,
  resolveProjectName,
  toBoolean
} from "../core/cli.js";
import { formatTable, printJson, truncate } from "../core/output.js";
import { meetsSeverityThreshold } from "../core/severity.js";
import { createAlertDispatcher } from "../services/alertDispatcher.js";
import { analyzeDependencies } from "../services/dependencyAnalyzer.js";

export async function runDepsCommand(options) {
  const db = await openDatabase(resolveDbPath(options));
  const store = new DeprecationStore(db);
  const alerts = createAlertDispatcher(options);
  const project = resolveProjectName(options);
  const notify = toBoolean(options.notify, alerts.enabled);

  const analysis = await analyzeDependencies({
    packageFile: options.package || "package.json",
    rootDir: process.cwd(),
    includeDev: toBoolean(options.includeDev, true),
    useRegistry: toBoolean(options.registry, true)
  });

  const captured = [];
  for (const finding of analysis.results) {
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
  }

  const output = {
    project,
    scannedCount: analysis.scannedCount,
    deprecatedCount: analysis.deprecatedCount,
    items: captured
  };

  if (toBoolean(options.json, false)) {
    printJson(output);
  } else {
    process.stdout.write(
      `Project: ${project}\nScanned dependencies: ${analysis.scannedCount}\nDeprecated packages: ${analysis.deprecatedCount}\n\n`
    );
    process.stdout.write(
      `${formatTable(
        [
          { key: "packageName", label: "Package" },
          { key: "severity", label: "Severity" },
          { key: "replacement", label: "Replacement" },
          { key: "message", label: "Message" }
        ],
        captured.map((item) => ({
          packageName: item.packageName,
          severity: item.severity,
          replacement: item.replacement || "n/a",
          message: truncate(item.message, 72)
        }))
      )}\n`
    );

    if (captured.length === 0) {
      process.stdout.write(
        "\nNo deprecated packages were found in the scanned dependency set.\n"
      );
    }
  }

  const failOn = options.failOn || null;
  if (
    failOn &&
    captured.some((item) => meetsSeverityThreshold(item.severity, failOn))
  ) {
    process.exitCode = 1;
  }

  db.close();
}
