import { openDatabase } from "../core/db.js";
import { DeprecationStore } from "../core/store.js";
import {
  resolveDbPath,
  resolveProjectName,
  toBoolean
} from "../core/cli.js";
import { formatTable, printJson } from "../core/output.js";
import {
  loadGitHubSubscriptions,
  loadPackageSubscriptions
} from "../services/subscriptionMonitor.js";

export async function runSubscribeCommand(options) {
  if (options.package && options.repo) {
    throw new Error("Use either --package or --repo, not both");
  }

  if (options.repo && !/^[^/]+\/[^/]+$/.test(String(options.repo))) {
    throw new Error("GitHub repos must be in owner/repo format");
  }

  const db = await openDatabase(resolveDbPath(options));
  const store = new DeprecationStore(db);
  const project = resolveProjectName(options);
  const notifyEmail = options.email || null;
  let subscriptionsToCreate = [];

  if (options.package) {
    subscriptionsToCreate = [
      {
        targetName: options.package,
        currentVersion: options.version || null,
        metadata: {
          source: "manual"
        }
      }
    ];
  } else if (options.repo) {
    subscriptionsToCreate = await loadGitHubSubscriptions({
      repo: options.repo,
      branch: options.branch || "main",
      packageFile: options.packageFile || "package.json",
      includeDev: toBoolean(options.includeDev, true),
      githubToken: options.githubToken || process.env.GITHUB_TOKEN || null
    });
  } else {
    subscriptionsToCreate = loadPackageSubscriptions({
      packageFile: options.packageFile || "package.json",
      rootDir: process.cwd(),
      includeDev: toBoolean(options.includeDev, true)
    });
  }

  const results = subscriptionsToCreate.map((subscription) =>
    store.upsertSubscription({
      project,
      targetType: "npm-package",
      targetName: subscription.targetName,
      currentVersion: subscription.currentVersion,
      notifyEmail,
      metadata: subscription.metadata
    })
  );

  const output = {
    project,
    created: results.filter((result) => result.isNew).length,
    updated: results.filter((result) => !result.isNew).length,
    items: results.map((result) => ({
      ...result.subscription,
      isNew: result.isNew
    }))
  };

  if (toBoolean(options.json, false)) {
    printJson(output);
    db.close();
    return;
  }

  process.stdout.write(
    `Project: ${project}\nCreated: ${output.created}  Updated: ${output.updated}\n\n`
  );
  process.stdout.write(
    `${formatTable(
      [
        { key: "targetName", label: "Target" },
        { key: "source", label: "Source" },
        { key: "currentVersion", label: "Current Version" },
        { key: "notifyEmail", label: "Notify Email" },
        { key: "state", label: "State" }
      ],
      output.items.map((item) => ({
        targetName: item.targetName,
        source:
          item.metadata?.source === "github"
            ? `${item.metadata.repo}:${item.metadata.packageFile}`
            : item.metadata?.source || "manual",
        currentVersion: item.currentVersion || "unknown",
        notifyEmail: item.notifyEmail || "env/default",
        state: item.isNew ? "created" : "updated"
      }))
    )}\n`
  );
  process.stdout.write("\n");
  process.stdout.write(
    options.repo
      ? "Next step: run `foresight monitor` on a schedule so Foresight can refresh this GitHub repo and alert you when dependencies change.\n"
      : "Next step: run `foresight monitor` on a schedule so Foresight can check for deprecations and new versions.\n"
  );

  db.close();
}
