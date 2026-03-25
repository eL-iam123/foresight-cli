const SEVERITY_SCORES = {
  low: 30,
  medium: 60,
  high: 85
};

const TYPE_SCORES = {
  runtime: 12,
  dependency: 10,
  subscription: 10,
  upgrade: 4
};

export function buildActionPlan(items, { limit = items.length } = {}) {
  return items
    .map((item) => {
      const priorityScore = scoreDeprecation(item);
      const metadata = item.metadata || {};

      return {
        id: item.id,
        priorityScore,
        urgency: priorityLabel(priorityScore),
        module: item.module || item.packageName || "unknown",
        type: item.type,
        severity: item.severity,
        status: item.status,
        replacement: item.replacement || null,
        lastSeenAt: item.lastSeenAt,
        reason: summarizeReason(item),
        currentVersion: metadata.currentVersion || null,
        latestVersion: metadata.latestVersion || null,
        nextAction: suggestNextAction(item)
      };
    })
    .sort((left, right) => right.priorityScore - left.priorityScore)
    .slice(0, limit);
}

export function scoreDeprecation(item) {
  const severityScore = SEVERITY_SCORES[item.severity] || 0;
  const typeScore = TYPE_SCORES[item.type] || 6;
  const occurrenceScore = Math.min(Number(item.occurrenceCount || 0) * 2, 12);
  const recentScore = calculateRecentScore(item.lastSeenAt);
  const removalScore = /\bremoved?\b|\bunsupported\b|\bend[- ]of[- ]life\b/i.test(
    item.message || ""
  )
    ? 8
    : 0;
  const replacementScore = item.replacement ? 4 : 0;

  return Math.min(
    severityScore + typeScore + occurrenceScore + recentScore + removalScore + replacementScore,
    100
  );
}

export function suggestNextAction(item) {
  const subject = item.module || item.packageName || "this dependency";
  const metadata = item.metadata || {};

  if (item.replacement) {
    return `Replace ${subject} with ${item.replacement} and validate the upgrade path.`;
  }

  if (item.type === "upgrade" && metadata.currentVersion && metadata.latestVersion) {
    if (normalizeVersionSpec(metadata.currentVersion) === normalizeVersionSpec(metadata.latestVersion)) {
      return `Your package.json already points at the latest stable version. If this came from an older scan, you can mark it resolved.`;
    }

    return `Review the release notes, then test moving ${subject} from ${metadata.currentVersion} to ${metadata.latestVersion} in a branch.`;
  }

  if (item.type === "runtime") {
    return `Find the runtime callsite for ${subject} and remove the deprecated API usage.`;
  }

  if (item.type === "dependency" || item.type === "subscription") {
    return `Review the maintainer notice for ${subject} and plan a migration before the next major release.`;
  }

  return `Investigate ${subject} and decide whether to upgrade, replace, or suppress it.`;
}

function summarizeReason(item) {
  const subject = item.module || item.packageName || "This dependency";
  const metadata = item.metadata || {};

  if (item.type === "upgrade" && metadata.latestVersion) {
    if (normalizeVersionSpec(metadata.currentVersion) === normalizeVersionSpec(metadata.latestVersion)) {
      return `This looks like an older stored upgrade record for ${subject}.`;
    }

    return `A newer npm release is available for ${subject}.`;
  }

  if (item.type === "runtime") {
    return `This warning was seen while your code was running.`;
  }

  if (item.type === "dependency" || item.type === "subscription") {
    return `The package maintainer marked ${subject} as deprecated.`;
  }

  return item.message;
}

function calculateRecentScore(lastSeenAt) {
  if (!lastSeenAt) {
    return 0;
  }

  const ageMs = Date.now() - new Date(lastSeenAt).getTime();

  if (!Number.isFinite(ageMs)) {
    return 0;
  }

  if (ageMs <= 7 * 24 * 60 * 60 * 1000) {
    return 10;
  }

  if (ageMs <= 30 * 24 * 60 * 60 * 1000) {
    return 5;
  }

  return 0;
}

function priorityLabel(score) {
  if (score >= 85) {
    return "now";
  }

  if (score >= 60) {
    return "soon";
  }

  return "later";
}

function normalizeVersionSpec(value) {
  const match = String(value || "").trim().match(/\d+(?:\.\d+){0,2}/);
  return match ? match[0] : null;
}
