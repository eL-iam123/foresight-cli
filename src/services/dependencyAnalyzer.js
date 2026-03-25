import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { deriveSeverity } from "../core/severity.js";
import { suggestReplacement } from "../core/replacements.js";

export async function analyzeDependencies({
  packageFile = "package.json",
  rootDir = process.cwd(),
  includeDev = true,
  useRegistry = true
}) {
  const absolutePackageFile = resolve(rootDir, packageFile);
  const packageJson = JSON.parse(readFileSync(absolutePackageFile, "utf8"));
  const dependencies = collectDependencies(packageJson, includeDev);

  const results = [];

  for (const dependency of dependencies) {
    const localManifest = loadLocalManifest(rootDir, dependency.name);
    const registryStatus =
      !localManifest?.deprecated && useRegistry
        ? lookupRegistryDeprecation(dependency.name, dependency.requestedVersion)
        : null;

    const deprecatedMessage =
      localManifest?.deprecated || registryStatus?.deprecated || null;

    if (!deprecatedMessage) {
      continue;
    }

    const resolvedVersion =
      localManifest?.version || registryStatus?.version || dependency.requestedVersion;
    const replacement = suggestReplacement(dependency.name, deprecatedMessage);

    results.push({
      type: "dependency",
      module: dependency.name,
      packageName: dependency.name,
      message: deprecatedMessage,
      severity: deriveSeverity(deprecatedMessage),
      source: localManifest ? "npm-local" : "npm-registry",
      replacement,
      metadata: {
        packageFile: absolutePackageFile,
        dependencyType: dependency.scope,
        requestedVersion: dependency.requestedVersion,
        resolvedVersion,
        statusSource: localManifest ? "installed-package" : "registry-query"
      }
    });
  }

  return {
    scannedCount: dependencies.length,
    deprecatedCount: results.length,
    results
  };
}

function collectDependencies(packageJson, includeDev) {
  const entries = [];

  for (const [name, version] of Object.entries(packageJson.dependencies || {})) {
    entries.push({
      name,
      requestedVersion: version,
      scope: "dependencies"
    });
  }

  if (includeDev) {
    for (const [name, version] of Object.entries(packageJson.devDependencies || {})) {
      entries.push({
        name,
        requestedVersion: version,
        scope: "devDependencies"
      });
    }
  }

  return entries;
}

function loadLocalManifest(rootDir, packageName) {
  const packageSegments = packageName.split("/");
  const manifestPath = resolve(rootDir, "node_modules", ...packageSegments, "package.json");

  if (!existsSync(manifestPath)) {
    return null;
  }

  return JSON.parse(readFileSync(manifestPath, "utf8"));
}

function lookupRegistryDeprecation(packageName, requestedVersion) {
  try {
    const spec = `${packageName}@${requestedVersion}`;
    const raw = execFileSync(
      "npm",
      ["view", spec, "deprecated", "version", "--json"],
      {
        cwd: process.cwd(),
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"]
      }
    ).trim();

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);

    if (typeof parsed === "string") {
      return {
        deprecated: parsed,
        version: requestedVersion
      };
    }

    if (Array.isArray(parsed)) {
      return {
        deprecated: parsed.find((value) => typeof value === "string") || null,
        version: requestedVersion
      };
    }

    return {
      deprecated: parsed.deprecated || null,
      version: parsed.version || requestedVersion
    };
  } catch {
    return null;
  }
}
