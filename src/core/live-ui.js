import { formatTable, formatTimestamp, truncate } from "./output.js";

export function createLiveRenderer({ enabled, render, refreshMs = 120 }) {
  if (!enabled) {
    return {
      requestRender() {},
      renderNow() {},
      stop() {}
    };
  }

  let timer = null;
  let stopped = false;

  const flush = () => {
    if (stopped) {
      return;
    }

    timer = null;
    process.stdout.write("\x1b[2J\x1b[H");
    process.stdout.write(render());
  };

  return {
    requestRender() {
      if (stopped || timer) {
        return;
      }

      timer = setTimeout(flush, refreshMs);
    },
    renderNow() {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }

      flush();
    },
    stop({ finalRender = true } = {}) {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }

      stopped = true;

      if (finalRender) {
        process.stdout.write("\x1b[2J\x1b[H");
        process.stdout.write(render());
      }
    }
  };
}

export function renderScanDashboard({
  project,
  input,
  source,
  follow,
  startedAt,
  completedAt,
  captured,
  recentLines,
  status
}) {
  const severity = countBySeverity(captured);
  const durationMs =
    new Date(completedAt || new Date()).getTime() - new Date(startedAt).getTime();
  const recentItems = captured.slice(-8).reverse();
  const findingsTable = recentItems.length > 0
    ? formatTable(
        [
          { key: "severity", label: "Severity" },
          { key: "type", label: "Type" },
          { key: "module", label: "Module" },
          { key: "seen", label: "Last Seen" },
          { key: "message", label: "Message" }
        ],
        recentItems.map((item) => ({
          severity: item.severity,
          type: item.type,
          module: item.module || item.packageName || "unknown",
          seen: formatTimestamp(item.lastSeenAt),
          message: truncate(item.message, 80)
        }))
      )
    : "Waiting for deprecations...";

  const outputBlock = recentLines.length > 0
    ? recentLines.map((line) => `  ${truncate(line, 112)}`).join("\n")
    : "  No output captured yet.";

  const lines = [
    "Foresight Live Scan",
    "",
    `Status: ${status.toUpperCase()}  Duration: ${formatDuration(durationMs)}  Captured: ${captured.length}`,
    `Project: ${project}`,
    `Source: ${source}${follow ? " (follow mode)" : ""}`,
    `Input: ${input}`,
    `Severity: high ${severity.high} | medium ${severity.medium} | low ${severity.low}`,
    "",
    "Recent Findings",
    findingsTable,
    "",
    "Recent Output",
    outputBlock
  ];

  if (status === "running") {
    lines.push("", "Live updates enabled. Press Ctrl+C to stop.");
  } else {
    lines.push("", `Completed at ${formatTimestamp(completedAt)}.`);
  }

  return `${lines.join("\n")}\n`;
}

export function renderReportDashboard({
  project,
  summary,
  history,
  items,
  updatedAt,
  intervalSeconds,
  watchMode
}) {
  const itemTable = formatTable(
    [
      { key: "severity", label: "Severity" },
      { key: "type", label: "Type" },
      { key: "module", label: "Module/Package" },
      { key: "count", label: "Count" },
      { key: "lastSeenAt", label: "Last Seen" },
      { key: "message", label: "Message" }
    ],
    items.map((item) => ({
      severity: item.severity,
      type: item.type,
      module: item.module || item.packageName || "unknown",
      count: item.occurrenceCount,
      lastSeenAt: formatTimestamp(item.lastSeenAt),
      message: truncate(item.message, 80)
    }))
  );

  const historyTable = formatTable(
    [
      { key: "day", label: "Day" },
      { key: "count", label: "Events" }
    ],
    history
  );

  const lines = [
    watchMode ? "Foresight Live Report" : "Foresight Report",
    "",
    `Project: ${project}`,
    `Last refresh: ${formatTimestamp(updatedAt)}`,
    `Open deprecations: ${summary.total} (high: ${summary.high}, medium: ${summary.medium}, low: ${summary.low})`,
    "",
    "Tracked Deprecations",
    itemTable,
    "",
    "Recent History",
    historyTable
  ];

  if (watchMode) {
    lines.push("", `Refreshing every ${intervalSeconds}s. Press Ctrl+C to stop.`);
  }

  return `${lines.join("\n")}\n`;
}

function countBySeverity(items) {
  return items.reduce(
    (accumulator, item) => {
      accumulator[item.severity] += 1;
      return accumulator;
    },
    { high: 0, medium: 0, low: 0 }
  );
}

function formatDuration(durationMs) {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes === 0) {
    return `${seconds}s`;
  }

  return `${minutes}m ${seconds}s`;
}
