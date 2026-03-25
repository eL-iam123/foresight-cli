import { existsSync, readFileSync } from "node:fs";
import { basename, resolve } from "node:path";

const BOOLEAN_FLAGS = new Set([
  "all",
  "follow",
  "interactive",
  "json",
  "notify",
  "plan",
  "quiet",
  "registry",
  "includeDev",
  "watch"
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
    "Deprecation intelligence for runtime warnings, package notices, and migration planning.",
    "",
    "Recommended:",
    "  foresight",
    "",
    "This opens the guided interactive menu and first-run onboarding.",
    "",
    "Quick commands:",
    "  foresight onboard",
    "  foresight scan --cmd \"npm test\" --interactive",
    "  foresight deps",
    "  foresight subscriptions",
    "  foresight monitor --notify",
    "  foresight report --plan",
    "  foresight config",
    "",
    "Power user commands:",
    "  foresight interactive",
    "  foresight subscribe",
    "  foresight subscribe --package request --version 2.88.2 --email you@example.com --slack-channel alerts-dev",
    "  foresight subscribe --repo vercel/next.js --branch canary",
    "  foresight triage --id <deprecation-id> --status resolved",
    "  foresight config list",
    "  foresight config set <key> <value>",
    "  foresight service --create",
    "  foresight watch --interval 2",
    "",
    "Env vars (fallback if not in config):",
    "  FORESIGHT_SLACK_WEBHOOK_URL",
    "  FORESIGHT_SLACK_BOT_TOKEN",
    "  FORESIGHT_SLACK_CHANNEL",
    "  FORESIGHT_EMAIL_TO",
    "  FORESIGHT_EMAIL_FROM",
    "  FORESIGHT_SMTP_HOST",
    "  FORESIGHT_SMTP_PORT",
    "  FORESIGHT_SMTP_USER",
    "  FORESIGHT_SMTP_PASS",
    "  FORESIGHT_SMTP_SECURE",
    "  FORESIGHT_TELEGRAM_BOT_TOKEN",
    "  FORESIGHT_TELEGRAM_CHAT_ID",
    "  FORESIGHT_AI_AGENT_WEBHOOK_URL",
    "  FORESIGHT_ALERT_THRESHOLD",
    "  FORESIGHT_ALERT_MODE",
    "  GITHUB_TOKEN",
    ""
  ];

  process.stdout.write(`${lines.join("\n")}\n`);
}

export function resolveProjectName(options) {
  return (
    options.project ||
    projectNameFromRepo(options.repo) ||
    process.env.FORESIGHT_PROJECT ||
    detectProjectName()
  );
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

function projectNameFromRepo(repo) {
  if (!repo) {
    return null;
  }

  const parts = String(repo).split("/");
  return parts[parts.length - 1] || null;
}
