import { openDatabase } from "../core/db.js";
import { DeprecationStore } from "../core/store.js";
import { resolveDbPath, resolveProjectName } from "../core/cli.js";
import { createPromptSession } from "../core/prompt.js";
import { runMonitorCommand } from "./monitor.js";
import { runSubscribeCommand } from "./subscribe.js";

export async function runOnboardingCommand(options = {}, context = {}) {
  const prompt = context.prompt || createPromptSession();
  const ownsPrompt = !context.prompt;
  const defaultProject = resolveProjectName(options);

  try {
    return await runOnboardingFlow({
      prompt,
      defaultProject,
      options
    });
  } finally {
    if (ownsPrompt) {
      prompt.close();
    }
  }
}

export async function shouldRunOnboarding(options = {}) {
  const db = await openDatabase(resolveDbPath(options));
  const store = new DeprecationStore(db);
  const project = resolveProjectName(options);
  const subscriptions = store.listActiveSubscriptions(project);
  db.close();
  return subscriptions.length === 0;
}

async function runOnboardingFlow({ prompt, defaultProject, options }) {
  renderHeader(defaultProject);

  const mode = await prompt.select(
    "What do you want Foresight to watch?",
    [
      {
        label: `This project (${defaultProject})`,
        value: "project",
        description: "Read the local package.json and save the current dependency watchlist."
      },
      {
        label: "A GitHub repo",
        value: "github",
        description: "Track dependencies from a repo's package.json on every monitor run."
      },
      {
        label: "One package",
        value: "package",
        description: "Manually watch a single npm package."
      },
      {
        label: "Skip for now",
        value: "skip",
        description: "Leave onboarding and go back to the main menu."
      }
    ],
    {
      helpText: "You can rerun this anytime with `foresight onboard`."
    }
  );

  if (mode === "skip") {
    process.stdout.write("\nOnboarding skipped.\n");
    return null;
  }

  process.stdout.write("\n");

  let project = defaultProject;

  if (mode === "project") {
    project = await onboardLocalProject(prompt, defaultProject);
  } else if (mode === "github") {
    project = await onboardGitHubRepo(prompt);
  } else if (mode === "package") {
    project = await onboardSinglePackage(prompt, defaultProject);
  }

  const runCheckNow = await prompt.confirm("Run a monitor check now?", true);

  if (runCheckNow) {
    process.stdout.write("\n");
    await runMonitorCommand({
      project
    });
  } else {
    process.stdout.write(
      "\nNext step: run `foresight monitor --notify` on a schedule to keep checking later.\n"
    );
  }

  return project;
}

async function onboardLocalProject(prompt, defaultProject) {
  const includeDev = await prompt.confirm("Include devDependencies?", true);
  const notifyEmail = await prompt.text("Notification email", {
    defaultValue: "",
    allowEmpty: true
  });

  await runSubscribeCommand({
    project: defaultProject,
    includeDev,
    email: notifyEmail || undefined
  });

  return defaultProject;
}

async function onboardGitHubRepo(prompt) {
  const repo = await prompt.text("GitHub repo (owner/repo)");
  const branch = await prompt.text("Branch", {
    defaultValue: "main",
    allowEmpty: true
  });
  const packageFile = await prompt.text("package.json path in the repo", {
    defaultValue: "package.json",
    allowEmpty: true
  });
  const includeDev = await prompt.confirm("Include devDependencies?", true);
  const notifyEmail = await prompt.text("Notification email", {
    defaultValue: "",
    allowEmpty: true
  });
  const project = await prompt.text("Project name inside Foresight", {
    defaultValue: repo.split("/").pop() || "github-project",
    allowEmpty: true
  });

  await runSubscribeCommand({
    project,
    repo,
    branch,
    packageFile,
    includeDev,
    email: notifyEmail || undefined
  });

  process.stdout.write(
    "\nTip: public repos work without auth. Export `GITHUB_TOKEN` if you want private repo access or higher API limits.\n"
  );

  return project;
}

async function onboardSinglePackage(prompt, defaultProject) {
  const packageName = await prompt.text("Package name");
  const version = await prompt.text("Current version", {
    defaultValue: "latest",
    allowEmpty: true
  });
  const notifyEmail = await prompt.text("Notification email", {
    defaultValue: "",
    allowEmpty: true
  });

  await runSubscribeCommand({
    project: defaultProject,
    package: packageName,
    version: version === "latest" ? undefined : version,
    email: notifyEmail || undefined
  });

  return defaultProject;
}

function renderHeader(project) {
  process.stdout.write("\x1b[2J\x1b[H");
  process.stdout.write("Foresight CLI Onboarding\n");
  process.stdout.write("Set up a watchlist once, then let Foresight check it later.\n\n");
  process.stdout.write(`Default project: ${project}\n`);
  process.stdout.write("Use arrow keys and Enter to move quickly.\n\n");
}
