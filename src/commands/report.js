import { openDatabase } from "../core/db.js";
import { DeprecationStore } from "../core/store.js";
import { resolveDbPath, toBoolean, toNumber } from "../core/cli.js";
import { createLiveRenderer, renderReportDashboard } from "../core/live-ui.js";
import { formatTable, formatTimestamp, printJson, truncate } from "../core/output.js";

export async function runReportCommand(options) {
  const project = options.project || process.env.FORESIGHT_PROJECT || null;
  const limit = toNumber(options.limit, 25);
  const historyDays = toNumber(options.historyDays, 14);
  const watchMode =
    toBoolean(options.watch, false) &&
    !toBoolean(options.json, false) &&
    Boolean(process.stdout.isTTY);

  if (watchMode) {
    await runLiveReport(options, { project, limit, historyDays });
    return;
  }

  const output = await loadReportData(options, { project, limit, historyDays });

  if (toBoolean(options.json, false)) {
    printJson(output);
    return;
  }

  process.stdout.write(`Project: ${output.project}\n`);
  process.stdout.write(
    `Open deprecations: ${output.summary.total} (high: ${output.summary.high}, medium: ${output.summary.medium}, low: ${output.summary.low})\n\n`
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
      output.items.map((item) => ({
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
      output.history
    )}\n`
  );
}

async function loadReportData(options, { project, limit, historyDays }) {
  const db = await openDatabase(resolveDbPath(options));
  const store = new DeprecationStore(db);

  const summary = store.getSummary({ project });
  const items = store.listDeprecations({
    project,
    severity: options.severity,
    type: options.type,
    status: options.status || "open",
    limit
  });
  const history = store.listDailyEventCounts(historyDays, project);

  db.close();

  return {
    project: project || "all-projects",
    summary,
    historyDays,
    history,
    items
  };
}

async function runLiveReport(options, { project, limit, historyDays }) {
  const intervalSeconds = Math.max(1, toNumber(options.interval, 2));
  let latestOutput = await loadReportData(options, { project, limit, historyDays });
  let stopped = false;
  let currentSleepResolve = null;

  const liveRenderer = createLiveRenderer({
    enabled: true,
    render: () =>
      renderReportDashboard({
        project: latestOutput.project,
        summary: latestOutput.summary,
        history: latestOutput.history,
        items: latestOutput.items,
        updatedAt: new Date().toISOString(),
        intervalSeconds,
        watchMode: true
      })
  });

  const stop = () => {
    stopped = true;
    process.exitCode = 0;
    if (currentSleepResolve) {
      currentSleepResolve();
      currentSleepResolve = null;
    }
  };

  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);

  liveRenderer.renderNow();

  while (!stopped) {
    await new Promise((resolve) => {
      currentSleepResolve = resolve;
      setTimeout(resolve, intervalSeconds * 1000);
    });

    currentSleepResolve = null;

    if (stopped) {
      break;
    }

    latestOutput = await loadReportData(options, { project, limit, historyDays });
    liveRenderer.renderNow();
  }

  liveRenderer.stop({ finalRender: true });
  process.stdout.write("\n");
}
