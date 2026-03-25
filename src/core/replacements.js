const KNOWN_REPLACEMENTS = new Map([
  ["request", ["axios", "undici", "node-fetch"]],
  ["uuid", ["crypto.randomUUID"]],
  ["left-pad", []]
]);

export function suggestReplacement(packageName, message = "") {
  const normalizedName = packageName ? packageName.toLowerCase() : "";
  if (KNOWN_REPLACEMENTS.has(normalizedName)) {
    const suggestions = KNOWN_REPLACEMENTS.get(normalizedName);
    return suggestions.length > 0 ? suggestions.join(", ") : null;
  }

  const messageMatch =
    message.match(/\buse\s+["'`]?([@a-z0-9./_-]+)["'`]?\s+instead\b/i) ||
    message.match(/\breplaced by\s+["'`]?([@a-z0-9./_-]+)["'`]?\b/i);

  return messageMatch ? messageMatch[1] : null;
}
