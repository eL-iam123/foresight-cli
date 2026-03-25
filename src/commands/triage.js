import { openDatabase } from "../core/db.js";
import { DeprecationStore } from "../core/store.js";
import { resolveDbPath, resolveProjectName, toBoolean } from "../core/cli.js";
import { printJson } from "../core/output.js";

const VALID_STATUSES = new Set(["open", "resolved", "ignored"]);

export async function runTriageCommand(options) {
  const id = options.id;
  const status = options.status;

  if (!id) {
    throw new Error("Pass --id with the deprecation record you want to update");
  }

  if (!VALID_STATUSES.has(status)) {
    throw new Error("Pass --status open, resolved, or ignored");
  }

  const db = await openDatabase(resolveDbPath(options));
  const store = new DeprecationStore(db);
  const project = options.all ? null : resolveProjectName(options);
  const updated = store.updateDeprecationStatus({
    id,
    status,
    project
  });

  if (!updated) {
    db.close();
    throw new Error("No deprecation record matched that id");
  }

  const output = {
    project: project || updated.project,
    item: updated
  };

  if (toBoolean(options.json, false)) {
    printJson(output);
    db.close();
    return;
  }

  process.stdout.write(
    `Updated ${updated.id}\nStatus: ${updated.status}\nModule: ${updated.module || updated.packageName || "unknown"}\n`
  );

  db.close();
}
