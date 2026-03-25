import { openDatabase } from "../core/db.js";
import { DeprecationStore } from "../core/store.js";
import { resolveDbPath, resolveProjectName, toBoolean } from "../core/cli.js";
import { formatTable, formatTimestamp, printJson } from "../core/output.js";

export async function runSubscriptionsCommand(options) {
  const db = await openDatabase(resolveDbPath(options));
  const store = new DeprecationStore(db);
  const project = options.all ? null : resolveProjectName(options);
  const items = store.listSubscriptions({
    project,
    active: options.active === false ? false : true
  });

  const output = {
    project: project || "all-projects",
    count: items.length,
    items
  };

  if (toBoolean(options.json, false)) {
    printJson(output);
    db.close();
    return;
  }

  process.stdout.write(`Project: ${output.project}\nSubscriptions: ${output.count}\n\n`);
  process.stdout.write(
    `${formatTable(
      [
        { key: "targetName", label: "Target" },
        { key: "source", label: "Source" },
        { key: "currentVersion", label: "Current Version" },
        { key: "latestVersion", label: "Latest Known" },
        { key: "lastCheckedAt", label: "Last Checked" },
        { key: "notifyEmail", label: "Notify Email" }
      ],
      items.map((item) => ({
        targetName: item.targetName,
        source:
          item.metadata?.source === "github"
            ? `${item.metadata.repo}:${item.metadata.packageFile}`
            : item.metadata?.source || "manual",
        currentVersion: item.currentVersion || "unknown",
        latestVersion: item.latestVersion || "unknown",
        lastCheckedAt: formatTimestamp(item.lastCheckedAt),
        notifyEmail: item.notifyEmail || "env/default"
      }))
    )}\n`
  );

  db.close();
}
