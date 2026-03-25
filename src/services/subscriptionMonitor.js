import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { deriveSeverity } from "../core/severity.js";
import { suggestReplacement } from "../core/replacements.js";

export function loadPackageSubscriptions({
  packageFile = "package.json",
  rootDir = process.cwd(),
  includeDev = true
}) {
  const absolutePackageFile = resolve(rootDir, packageFile);
  const packageJson = JSON.parse(readFileSync(absolutePackageFile, "utf8"));
  return createSubscriptionsFromPackageJson(packageJson, {
    includeDev,
    metadata: {
      source: "package.json",
      packageFile: absolutePackageFile,
      includeDev
    }
  });
}

export async function loadGitHubSubscriptions({
  repo,
  branch = "main",
  packageFile = "package.json",
  includeDev = true,
  githubToken = process.env.GITHUB_TOKEN || null,
  fetchImpl = globalThis.fetch
}) {
  if (!repo) {
    throw new Error("GitHub repo is required");
  }

  const packageJson = await fetchGitHubPackageJson({
    repo,
    branch,
    packageFile,
    githubToken,
    fetchImpl
  });

  return createSubscriptionsFromPackageJson(packageJson, {
    includeDev,
    metadata: {
      source: "github",
      repo,
      branch,
      packageFile: normalizePackageFile(packageFile),
      includeDev
    }
  });
}

export async function runSubscriptionMonitor({
  subscriptions,
  store,
  lookupPackageStatus = lookupNpmPackageStatus,
  loadSourceSubscriptions = loadGitHubSubscriptions,
  notifyFinding,
  now = () => new Date().toISOString()
}) {
  const sourceSync = await synchronizeSourceSubscriptions({
    subscriptions,
    store,
    loadSourceSubscriptions,
    now
  });
  const findings = [];
  let checked = sourceSync.failedChecks.length;
  let changed = 0;
  let alertsAttempted = 0;

  for (const failedCheck of sourceSync.failedChecks) {
    store.recordSubscriptionCheck({
      subscriptionId: failedCheck.subscription.id,
      checkedAt: failedCheck.checkedAt,
      currentVersion: failedCheck.subscription.currentVersion || null,
      status: "failed",
      latestVersion: failedCheck.subscription.latestVersion || null,
      deprecationMessage: null,
      changeSummary: failedCheck.errorMessage,
      payload: {
        error: failedCheck.errorMessage
      }
    });
  }

  for (const subscription of sourceSync.subscriptions) {
    checked += 1;
    const checkedAt = now();

    try {
      let status;

      if (subscription.targetType === "npm-package") {
        status = await lookupPackageStatus(subscription.targetName);
      } else {
        status = {
          latestVersion: null,
          deprecatedMessage: null
        };
      }

      const detectedFindings = createFindingsFromStatus({
        subscription,
        status
      });

      let alertedAt = null;

      for (const finding of detectedFindings) {
        changed += 1;
        const result = store.recordFinding({
          ...finding,
          detectedAt: checkedAt
        });

        findings.push({
          ...result.deprecation,
          isNew: result.isNew,
          subscriptionId: subscription.id
        });

        if (notifyFinding) {
          const deliveries = await notifyFinding({
            deprecation: result.deprecation,
            isNew: result.isNew,
            emailTo: subscription.notifyEmail || null
          });

          if (deliveries.length > 0) {
            alertedAt = checkedAt;
            alertsAttempted += deliveries.length;

            for (const delivery of deliveries) {
              store.recordAlert({
                deprecationId: result.deprecation.id,
                ...delivery
              });
            }
          }
        }
      }

      store.recordSubscriptionCheck({
        subscriptionId: subscription.id,
        checkedAt,
        currentVersion: subscription.currentVersion || null,
        status: detectedFindings.length > 0 ? "changed" : "ok",
        latestVersion: status.latestVersion || null,
        deprecationMessage: status.deprecatedMessage || null,
        changeSummary:
          detectedFindings.length > 0
            ? detectedFindings.map((finding) => finding.message).join(" | ")
            : null,
        payload: status,
        alertedAt
      });
    } catch (error) {
      store.recordSubscriptionCheck({
        subscriptionId: subscription.id,
        checkedAt,
        currentVersion: subscription.currentVersion || null,
        status: "failed",
        latestVersion: null,
        deprecationMessage: null,
        changeSummary: error.message,
        payload: {
          error: error.message
        }
      });
    }
  }

  return {
    checked,
    changed,
    alertsAttempted,
    findings
  };
}

async function synchronizeSourceSubscriptions({
  subscriptions,
  store,
  loadSourceSubscriptions,
  now
}) {
  const activeSubscriptions = [];
  const failedChecks = [];
  const githubGroups = new Map();

  for (const subscription of subscriptions) {
    if (isGitHubSubscription(subscription)) {
      const key = getGitHubGroupKey(subscription);
      const group = githubGroups.get(key) || {
        project: subscription.project,
        repo: subscription.metadata.repo,
        branch: subscription.metadata.branch || "main",
        packageFile: subscription.metadata.packageFile || "package.json",
        includeDev: subscription.metadata.includeDev !== false,
        subscriptions: []
      };
      group.subscriptions.push(subscription);
      githubGroups.set(key, group);
      continue;
    }

    activeSubscriptions.push(subscription);
  }

  for (const group of githubGroups.values()) {
    try {
      const latestEntries = await loadSourceSubscriptions({
        repo: group.repo,
        branch: group.branch,
        packageFile: group.packageFile,
        includeDev: group.includeDev
      });
      const nextSubscriptions = syncGitHubGroup({
        group,
        latestEntries,
        store
      });

      activeSubscriptions.push(...nextSubscriptions);
    } catch (error) {
      const checkedAt = now();

      for (const subscription of group.subscriptions) {
        failedChecks.push({
          subscription,
          checkedAt,
          errorMessage: error.message
        });
      }
    }
  }

  return {
    subscriptions: activeSubscriptions,
    failedChecks
  };
}

function syncGitHubGroup({ group, latestEntries, store }) {
  const nextSubscriptions = [];
  const currentByTarget = new Map(
    group.subscriptions.map((subscription) => [subscription.targetName, subscription])
  );
  const latestByTarget = new Map();
  const defaultNotifyEmail =
    group.subscriptions.find((subscription) => subscription.notifyEmail)?.notifyEmail ||
    null;

  for (const entry of latestEntries) {
    latestByTarget.set(entry.targetName, entry);

    const existing = currentByTarget.get(entry.targetName);
    const result = store.upsertSubscription({
      project: group.project,
      targetType: "npm-package",
      targetName: entry.targetName,
      currentVersion: entry.currentVersion,
      latestVersion: existing?.latestVersion || null,
      notifyEmail: existing?.notifyEmail || defaultNotifyEmail,
      active: true,
      metadata: {
        ...(existing?.metadata || {}),
        missingFromSource: false,
        ...entry.metadata
      }
    });

    nextSubscriptions.push(result.subscription);
  }

  for (const existing of group.subscriptions) {
    if (latestByTarget.has(existing.targetName)) {
      continue;
    }

    store.upsertSubscription({
      project: existing.project,
      targetType: existing.targetType,
      targetName: existing.targetName,
      currentVersion: existing.currentVersion,
      latestVersion: existing.latestVersion,
      notifyEmail: existing.notifyEmail,
      active: false,
      metadata: {
        ...(existing.metadata || {}),
        missingFromSource: true
      }
    });
  }

  return nextSubscriptions;
}

export function lookupNpmPackageStatus(packageName) {
  const raw = execFileSync(
    "npm",
    ["view", packageName, "deprecated", "version", "dist-tags.latest", "--json"],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    }
  ).trim();

  if (!raw) {
    return {
      latestVersion: null,
      deprecatedMessage: null
    };
  }

  const parsed = JSON.parse(raw);

  if (typeof parsed === "string") {
    return {
      latestVersion: null,
      deprecatedMessage: parsed
    };
  }

  if (Array.isArray(parsed)) {
    return {
      latestVersion: null,
      deprecatedMessage: parsed.find((value) => typeof value === "string") || null
    };
  }

  return {
    latestVersion: parsed["dist-tags"]?.latest || parsed.version || null,
    deprecatedMessage: parsed.deprecated || null
  };
}

function createFindingsFromStatus({ subscription, status }) {
  const findings = [];

  if (shouldCreateUpgradeFinding(subscription.currentVersion, status.latestVersion)) {
    findings.push({
      type: "upgrade",
      project: subscription.project,
      module: subscription.targetName,
      packageName: subscription.targetName,
      message: `Newer version available for ${subscription.targetName}: ${subscription.currentVersion} -> ${status.latestVersion}`,
      severity: "low",
      source: "npm-monitor",
      replacement: null,
      metadata: {
        subscriptionId: subscription.id,
        targetType: subscription.targetType,
        currentVersion: subscription.currentVersion,
        latestVersion: status.latestVersion,
        notifyEmail: subscription.notifyEmail || null
      }
    });
  }

  if (status.deprecatedMessage) {
    findings.push({
      type: "subscription",
      project: subscription.project,
      module: subscription.targetName,
      packageName: subscription.targetName,
      message: status.deprecatedMessage,
      severity: deriveSeverity(status.deprecatedMessage),
      source: "npm-monitor",
      replacement: suggestReplacement(subscription.targetName, status.deprecatedMessage),
      metadata: {
        subscriptionId: subscription.id,
        targetType: subscription.targetType,
        currentVersion: subscription.currentVersion,
        latestVersion: status.latestVersion || null,
        notifyEmail: subscription.notifyEmail || null
      }
    });
  }

  return findings;
}

function shouldCreateUpgradeFinding(currentVersion, latestVersion) {
  if (!currentVersion || !latestVersion) {
    return false;
  }

  const normalizedCurrent = normalizeVersionSpec(currentVersion);
  const normalizedLatest = normalizeVersionSpec(latestVersion);

  if (!normalizedCurrent || !normalizedLatest) {
    return String(currentVersion).trim() !== String(latestVersion).trim();
  }

  return compareVersions(normalizedLatest, normalizedCurrent) > 0;
}

function createSubscriptionsFromPackageJson(packageJson, { includeDev, metadata }) {
  const entries = new Map();

  addDependencyEntries(entries, packageJson.dependencies, "dependencies", metadata);

  if (includeDev) {
    addDependencyEntries(
      entries,
      packageJson.devDependencies,
      "devDependencies",
      metadata
    );
  }

  return [...entries.values()];
}

function addDependencyEntries(entries, dependencies, dependencyType, metadata) {
  for (const [name, version] of Object.entries(dependencies || {})) {
    if (entries.has(name)) {
      continue;
    }

    entries.set(name, {
      targetName: name,
      currentVersion: version,
      metadata: {
        ...metadata,
        dependencyType,
        includeDev: metadata.includeDev !== false
      }
    });
  }
}

async function fetchGitHubPackageJson({
  repo,
  branch,
  packageFile,
  githubToken,
  fetchImpl
}) {
  if (typeof fetchImpl !== "function") {
    throw new Error("Global fetch is unavailable in this runtime");
  }

  const normalizedPackageFile = normalizePackageFile(packageFile);

  if (githubToken) {
    const response = await fetchImpl(
      `https://api.github.com/repos/${repo}/contents/${normalizedPackageFile}?ref=${encodeURIComponent(
        branch
      )}`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${githubToken}`,
          "User-Agent": "foresight-cli"
        }
      }
    );

    if (!response.ok) {
      throw new Error(
        `GitHub request failed for ${repo}: ${response.status} ${response.statusText}`
      );
    }

    const payload = await response.json();

    if (!payload.content) {
      throw new Error(`GitHub did not return ${normalizedPackageFile} for ${repo}`);
    }

    return JSON.parse(
      Buffer.from(payload.content, payload.encoding || "base64").toString("utf8")
    );
  }

  const response = await fetchImpl(
    `https://raw.githubusercontent.com/${repo}/${encodeURIComponent(branch)}/${normalizedPackageFile}`
  );

  if (!response.ok) {
    throw new Error(
      `GitHub request failed for ${repo}: ${response.status} ${response.statusText}`
    );
  }

  return JSON.parse(await response.text());
}

function isGitHubSubscription(subscription) {
  return subscription.metadata?.source === "github" && subscription.metadata?.repo;
}

function getGitHubGroupKey(subscription) {
  return [
    subscription.project,
    subscription.metadata.repo,
    subscription.metadata.branch || "main",
    subscription.metadata.packageFile || "package.json"
  ].join("|");
}

function normalizePackageFile(packageFile) {
  return String(packageFile || "package.json").replace(/^\.?\//, "");
}

function normalizeVersionSpec(value) {
  const match = String(value).trim().match(/\d+(?:\.\d+){0,2}/);
  return match ? match[0] : null;
}

function compareVersions(left, right) {
  const leftParts = left.split(".").map((part) => Number(part));
  const rightParts = right.split(".").map((part) => Number(part));
  const length = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < length; index += 1) {
    const leftValue = leftParts[index] || 0;
    const rightValue = rightParts[index] || 0;

    if (leftValue > rightValue) {
      return 1;
    }

    if (leftValue < rightValue) {
      return -1;
    }
  }

  return 0;
}
