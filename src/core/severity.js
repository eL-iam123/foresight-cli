const RANKS = {
  low: 0,
  medium: 1,
  high: 2
};

const HIGH_PATTERNS = [
  /\bwill be removed\b/i,
  /\bremoved in\b/i,
  /\bbreaking\b/i,
  /\bunsupported\b/i,
  /\bend[- ]of[- ]life\b/i,
  /\bno longer maintained\b/i,
  /\bnext major\b/i
];

const MEDIUM_PATTERNS = [
  /\bdeprecat/i,
  /\breplace(?:d|ment)?\b/i,
  /\bmigrat/i,
  /\buse .* instead\b/i
];

export function deriveSeverity(message = "") {
  const normalized = String(message);

  if (HIGH_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return "high";
  }

  if (MEDIUM_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return "medium";
  }

  return "low";
}

export function maxSeverity(left = "low", right = "low") {
  return RANKS[left] >= RANKS[right] ? left : right;
}

export function meetsSeverityThreshold(severity, threshold = "low") {
  return RANKS[severity] >= RANKS[threshold];
}

export function normalizeSeverity(value, fallback = "low") {
  return value in RANKS ? value : fallback;
}

export function compareSeverity(left, right) {
  return RANKS[left] - RANKS[right];
}
