import { deriveSeverity } from "../core/severity.js";

const NODE_WARNING_PATTERNS = [
  /^\(node:\d+\)\s*(?:\[(?<code>[A-Z0-9_]+)\]\s*)?DeprecationWarning:\s*(?<message>.+)$/i,
  /^(?:\[(?<code>[A-Z0-9_]+)\]\s*)?DeprecationWarning:\s*(?<message>.+)$/i,
  /^(?<message>.+?\bdeprecated\b.+)$/i
];

export function parseRuntimeDeprecation(line, context = {}) {
  const normalizedLine = String(line || "").trim();
  if (!normalizedLine) {
    return null;
  }

  for (const pattern of NODE_WARNING_PATTERNS) {
    const match = normalizedLine.match(pattern);
    if (!match) {
      continue;
    }

    const message = match.groups?.message?.trim() || normalizedLine;
    const code = match.groups?.code || inferCodeFromMessage(normalizedLine);
    const moduleName = extractModuleName(message);
    const breakingHint = extractBreakingHint(message);

    return {
      type: "runtime",
      module: moduleName,
      packageName: null,
      message,
      severity: deriveSeverity(message),
      source: context.source || "node",
      rawLine: normalizedLine,
      metadata: {
        code,
        stream: context.stream || null,
        command: context.command || null,
        file: context.file || null,
        breakingHint
      }
    };
  }

  return null;
}

function inferCodeFromMessage(message) {
  const match = message.match(/\[(DEP[A-Z0-9_]+)\]/i);
  return match ? match[1] : null;
}

function extractModuleName(message) {
  const patterns = [
    /\b(?:package|module|library|dependency)\s+["'`]?(@?[\w./-]+)["'`]?/i,
    /\b["'`]?(@?[\w./-]+)["'`]?\s+(?:has been|is)\s+deprecated\b/i,
    /\buse\s+["'`]?(@?[\w./-]+)["'`]?\s+instead\b/i
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}

function extractBreakingHint(message) {
  const versionMatch = message.match(/\bremoved in v?(\d+(?:\.\d+){0,2})\b/i);
  if (versionMatch) {
    return `removed-in-v${versionMatch[1]}`;
  }

  const dateMatch = message.match(/\b(?:after|on)\s+(\d{4}-\d{2}-\d{2})\b/i);
  if (dateMatch) {
    return dateMatch[1];
  }

  return null;
}
