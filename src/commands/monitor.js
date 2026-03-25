import { openDatabase } from "../core/db.js";
import { DeprecationStore } from "../core/store.js";
import {
  resolveDbPath,
  resolveProjectName,
  toBoolean
} from "../core/cli.js";
import { formatTable, printJson, truncate } from "../core/output.js";
import { createAlertDispatcher } from "../services/alertDispatcher.js";
import { runSubscriptionMonitor } from "../services/subscriptionMonitor.js";

export async function runMonitorCommand(options) {
  const db = await openDatabase(resolveDbPath(options));
  const store = new DeprecationStore(db);
  const project = options.all ? null : resolveProjectName(options);
  const subscriptions = store.listActiveSubscriptions(project);
  const alerts = createAlertDispatcher(options);
  const notify = toBoolean(options.notify, alerts.enabled);

  if (subscriptions.length === 0) {
    const emptyOutput = {
      project: project || "all-projects",
      checked: 0,
      changed: 0,
      alertsAttempted: 0,
      findings: []
    };

    if (toBoolean(options.json, false)) {
      printJson(emptyOutput);
    } else {
      process.stdout.write(
        `Project: ${emptyOutput.project}\nNo active subscriptions found. Run \`foresight subscribe\` first.\n`
      );
    }

    db.close();
    return;
  }

  const result = await runSubscriptionMonitor({
    subscriptions,
    project: project || "all-projects",
    store,
    notifyFinding: notify
      ? ({ deprecation, isNew, emailTo }) =>
          alerts.notifyFinding({
            deprecation,
            isNew,
            emailTo
          })
      : null
  });

  const output = {
    project: project || "all-projects",
    checked: result.checked,
    changed: result.changed,
    alertsAttempted: result.alertsAttempted,
    findings: result.findings
  };

  if (toBoolean(options.json, false)) {
    printJson(output);
    db.close();
    return;
  }

  process.stdout.write(
    `Project: ${output.project}\nChecked: ${output.checked}  Changes detected: ${output.changed}  Alerts attempted: ${output.alertsAttempted}\n\n`
  );
  process.stdout.write(
    `${formatTable(
      [
        { key: "type", label: "Type" },
        { key: "packageName", label: "Package" },
        { key: "severity", label: "Severity" },
        { key: "message", label: "Message" }
      ],
      output.findings.map((finding) => ({
        type: finding.type,
        packageName: finding.packageName || finding.module || "unknown",
        severity: finding.severity,
        message: truncate(finding.message, 88)
      }))
    )}\n`
  );

  if (output.findings.length === 0) {
    process.stdout.write("\nNo new deprecations or version changes were found.\n");
  }

  db.close();
}
