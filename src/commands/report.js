import { openDatabase } from "../core/db.js";
import { DeprecationStore } from "../core/store.js";
import { resolveDbPath, resolveProjectName, toBoolean, toNumber } from "../core/cli.js";
import { formatTable, formatTimestamp, printJson, truncate } from "../core/output.js";

export async function runReportCommand(options) {
  const db = await openDatabase(resolveDbPath(options));
  const store = new DeprecationStore(db);
  const project = options.project || process.env.FORESIGHT_PROJECT || null;
  const limit = toNumber(options.limit, 25);
  const historyDays = toNumber(options.historyDays, 14);

  const summary = store.getSummary({ project });
  const items = store.listDeprecations({
    project,
    severity: options.severity,
    type: options.type,
    status: options.status || "open",
    limit
  });
  const history = store.listDailyEventCounts(historyDays, project);

  const output = {
    project: project || "all-projects",
    summary,
    historyDays,
    history,
    items
  };

  if (toBoolean(options.json, false)) {
    printJson(output);
    db.close();
    return;
  }

  process.stdout.write(`Project: ${project || "all-projects"}\n`);
  process.stdout.write(
    `Open deprecations: ${summary.total} (high: ${summary.high}, medium: ${summary.medium}, low: ${summary.low})\n\n`
  );

  process.stdout.write(
    `${formatTable(
      [
        { key: "severity", label: "Severity" },
        { key: "type", label: "Type" },
        { key: "module", label: "Module/Package" },
        { key: "count", label: "Count" },
        { key: "firstSeenAt", label: "First Seen" },
        { key: "lastSeenAt", label: "Last Seen" },
        { key: "message", label: "Message" }
      ],
      items.map((item) => ({
        severity: item.severity,
        type: item.type,
        module: item.module || item.packageName || "unknown",
        count: item.occurrenceCount,
        firstSeenAt: formatTimestamp(item.firstSeenAt),
        lastSeenAt: formatTimestamp(item.lastSeenAt),
        message: truncate(item.message, 72)
      }))
    )}\n\n`
  );

  process.stdout.write(
    `${formatTable(
      [
        { key: "day", label: "Day" },
        { key: "count", label: "Events" }
      ],
      history
    )}\n`
  );

  db.close();
}
