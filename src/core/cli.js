import { existsSync, readFileSync } from "node:fs";
import { basename, resolve } from "node:path";

const BOOLEAN_FLAGS = new Set([
  "follow",
  "json",
  "notify",
  "quiet",
  "registry",
  "includeDev"
]);

export function parseArgv(argv) {
  const [command, ...tokens] = argv;
  const options = {};
  const positionals = [];

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];

    if (!token.startsWith("--")) {
      positionals.push(token);
      continue;
    }

    if (token.startsWith("--no-")) {
      options[toCamelCase(token.slice(5))] = false;
      continue;
    }

    const [rawKey, inlineValue] = token.slice(2).split("=", 2);
    const key = toCamelCase(rawKey);

    if (inlineValue !== undefined) {
      options[key] = inlineValue;
      continue;
    }

    const nextToken = tokens[index + 1];
    if (!nextToken || nextToken.startsWith("--") || BOOLEAN_FLAGS.has(key)) {
      options[key] = true;
      continue;
    }

    options[key] = nextToken;
    index += 1;
  }

  if (!("registry" in options)) {
    options.registry = true;
  }

  if (!("includeDev" in options)) {
    options.includeDev = true;
  }

  return {
    command,
    options,
    positionals
  };
}

export function printUsage() {
  const lines = [
    "",
    "Foresight CLI",
    "Track deprecations before they turn into breakage.",
    "",
    "Start here:",
    "  foresight demo",
    "  foresight deps",
    "  foresight report",
    "",
    "Commands:",
    "  foresight demo [--project my-app] [--json]",
    "  foresight scan --cmd \"npm test\" [--project my-app] [--db ./.foresight/foresight.db]",
    "  foresight scan --file ./logs/app.log [--follow] [--project my-app]",
    "  foresight deps [--package ./package.json] [--project my-app] [--notify]",
    "  foresight report [--project my-app] [--severity medium] [--type runtime] [--json]",
    "",
    "Tips:",
    "  If you skip --project, Foresight uses your package.json name or folder name.",
    "  Use `foresight demo` after install to make sure everything works.",
    "",
    "Alert env vars:",
    "  FORESIGHT_SLACK_WEBHOOK_URL",
    "  FORESIGHT_EMAIL_TO",
    "  FORESIGHT_EMAIL_FROM",
    "  FORESIGHT_SMTP_HOST",
    "  FORESIGHT_SMTP_PORT",
    "  FORESIGHT_SMTP_USER",
    "  FORESIGHT_SMTP_PASS",
    "  FORESIGHT_SMTP_SECURE",
    "  FORESIGHT_ALERT_THRESHOLD",
    "  FORESIGHT_ALERT_MODE",
    ""
  ];

  process.stdout.write(`${lines.join("\n")}\n`);
}

export function resolveProjectName(options) {
  return options.project || process.env.FORESIGHT_PROJECT || detectProjectName();
}

export function resolveDbPath(options) {
  return options.db || process.env.FORESIGHT_DB || ".foresight/foresight.db";
}

export function toBoolean(value, defaultValue = false) {
  if (value === undefined) {
    return defaultValue;
  }

  if (typeof value === "boolean") {
    return value;
  }

  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

export function toNumber(value, defaultValue) {
  if (value === undefined) {
    return defaultValue;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : defaultValue;
}

export function detectProjectName(baseDir = process.cwd()) {
  const packageJsonPath = resolve(baseDir, "package.json");

  if (existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
      if (packageJson.name) {
        return stripScope(packageJson.name);
      }
    } catch {
      // Fall back to the current folder name if package.json is unreadable.
    }
  }

  return basename(baseDir);
}

function toCamelCase(value) {
  return value.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

function stripScope(packageName) {
  const parts = String(packageName).split("/");
  return parts[parts.length - 1] || "project";
}
