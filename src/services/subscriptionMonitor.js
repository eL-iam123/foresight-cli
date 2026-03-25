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
  const entries = [];

  for (const [name, version] of Object.entries(packageJson.dependencies || {})) {
    entries.push({
      targetName: name,
      currentVersion: version,
      metadata: {
        source: "package.json",
        dependencyType: "dependencies",
        packageFile: absolutePackageFile
      }
    });
  }

  if (includeDev) {
    for (const [name, version] of Object.entries(packageJson.devDependencies || {})) {
      entries.push({
        targetName: name,
        currentVersion: version,
        metadata: {
          source: "package.json",
          dependencyType: "devDependencies",
          packageFile: absolutePackageFile
        }
      });
    }
  }

  return entries;
}

export async function runSubscriptionMonitor({
  subscriptions,
  store,
  lookupPackageStatus = lookupNpmPackageStatus,
  notifyFinding,
  now = () => new Date().toISOString()
}) {
  const findings = [];
  let checked = 0;
  let changed = 0;
  let alertsAttempted = 0;

  for (const subscription of subscriptions) {
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

  if (
    status.latestVersion &&
    subscription.currentVersion &&
    status.latestVersion !== subscription.currentVersion
  ) {
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
