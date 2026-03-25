import { runDemoCommand } from "./demo.js";
import { runMonitorCommand } from "./monitor.js";
import { runOnboardingCommand, shouldRunOnboarding } from "./onboard.js";
import { runReportCommand } from "./report.js";
import { runScanCommand } from "./scan.js";
import { runSubscribeCommand } from "./subscribe.js";
import { runSubscriptionsCommand } from "./subscriptions.js";
import { runTriageCommand } from "./triage.js";
import { detectProjectName, resolveProjectName } from "../core/cli.js";
import { createPromptSession } from "../core/prompt.js";

export async function runInteractiveCommand(options = {}) {
  const prompt = createPromptSession();
  let activeProject = resolveProjectName(options) || detectProjectName();

  try {
    if (await shouldRunOnboarding({ ...options, project: activeProject })) {
      const onboardedProject = await runOnboardingCommand(
        { ...options, project: activeProject },
        { prompt }
      );

      if (onboardedProject) {
        activeProject = onboardedProject;
        await prompt.pause();
      }
    }

    let shouldExit = false;

    while (!shouldExit) {
      const action = await prompt.select(
        "What do you want to do?",
        [
          {
            label: `Subscribe this project (${activeProject})`,
            value: "subscribe-project",
            description: "Read the local package.json and save its current dependency watchlist."
          },
          {
            label: "Connect a GitHub repo",
            value: "subscribe-github",
            description: "Track a repo's package.json so monitor runs follow the codebase over time."
          },
          {
            label: "Subscribe one package",
            value: "subscribe-package",
            description: "Watch a single npm package by name."
          },
          {
            label: "Run onboarding again",
            value: "onboard",
            description: "Walk through setup from scratch."
          },
          {
            label: "Check for changes now",
            value: "monitor",
            description: "Run a monitor pass immediately."
          },
          {
            label: "View subscriptions",
            value: "subscriptions",
            description: "Show saved watchlists and their sources."
          },
          {
            label: "View report",
            value: "report",
            description: "See tracked findings and history."
          },
          {
            label: "View action plan",
            value: "plan",
            description: "See the highest-priority deprecations and what to do next."
          },
          {
            label: "Triage a finding",
            value: "triage",
            description: "Mark a deprecation as resolved or ignored."
          },
          {
            label: "Run a live runtime scan",
            value: "scan",
            description: "Capture deprecations from command output or log files."
          },
          {
            label: "Run demo",
            value: "demo",
            description: "Populate the database with a sample warning."
          },
          {
            label: "Exit",
            value: "exit",
            description: "Leave the interactive menu."
          }
        ],
        {
          helpText: `Current project: ${activeProject}`
        }
      );

      stdoutBreak();

      switch (action) {
        case "subscribe-project":
          await handleSubscribeProject(prompt, activeProject);
          break;
        case "subscribe-github":
          activeProject = await handleSubscribeGitHub(prompt);
          break;
        case "subscribe-package":
          await handleSubscribePackage(prompt, activeProject);
          break;
        case "onboard": {
          const onboardedProject = await runOnboardingCommand(
            { ...options, project: activeProject },
            { prompt }
          );

          if (onboardedProject) {
            activeProject = onboardedProject;
          }
          break;
        }
        case "monitor":
          await handleMonitor(prompt, activeProject);
          break;
        case "subscriptions":
          await runSubscriptionsCommand({
            project: activeProject
          });
          break;
        case "report":
          await handleReport(prompt, activeProject);
          break;
        case "plan":
          await runReportCommand({
            project: activeProject,
            plan: true
          });
          break;
        case "triage":
          await handleTriage(prompt, activeProject);
          break;
        case "scan":
          await handleScan(prompt, activeProject);
          break;
        case "demo":
          await runDemoCommand({
            interactive: true,
            project: "foresight-demo"
          });
          break;
        case "exit":
          shouldExit = true;
          continue;
        default:
          break;
      }

      if (!shouldExit) {
        await prompt.pause();
      }
    }
  } finally {
    prompt.close();
  }
}

async function handleSubscribeProject(prompt, project) {
  const includeDev = await prompt.confirm("Include devDependencies?", true);
  const notifyEmail = await prompt.text("Notification email", {
    defaultValue: "",
    allowEmpty: true
  });

  await runSubscribeCommand({
    project,
    includeDev,
    email: notifyEmail || undefined
  });
}

async function handleSubscribeGitHub(prompt) {
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
    "\nTip: export `GITHUB_TOKEN` if you want private repo access or higher GitHub API limits.\n"
  );

  return project;
}

async function handleSubscribePackage(prompt, project) {
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
    project,
    package: packageName,
    version: version === "latest" ? undefined : version,
    email: notifyEmail || undefined
  });
}

async function handleMonitor(prompt, project) {
  const notify = await prompt.confirm("Send alerts if something changed?", true);
  await runMonitorCommand({
    project,
    notify
  });
}

async function handleReport(prompt, project) {
  const live = await prompt.confirm("Open live report view?", false);

  await runReportCommand({
    project,
    watch: live,
    interval: live ? 2 : undefined
  });
}

async function handleScan(prompt, project) {
  const source = await prompt.select("What do you want to scan?", [
    {
      label: "Run a command and watch its output",
      value: "command",
      description: "Launch a local command and capture deprecations as they appear."
    },
    {
      label: "Follow a log file",
      value: "file",
      description: "Tail a file and parse deprecations continuously."
    }
  ]);

  if (source === "command") {
    const command = await prompt.text("Command to run", {
      defaultValue: "npm test"
    });

    await runScanCommand({
      project,
      cmd: command,
      interactive: true
    });
    return;
  }

  const filePath = await prompt.text("Log file path");
  const follow = await prompt.confirm("Follow the file for live updates?", true);

  await runScanCommand({
    project,
    file: filePath,
    follow,
    interactive: true
  });
}

async function handleTriage(prompt, project) {
  const id = await prompt.text("Deprecation id");
  const status = await prompt.select("Set status to", [
    {
      label: "open",
      value: "open",
      description: "Show this item in reports again."
    },
    {
      label: "resolved",
      value: "resolved",
      description: "Hide it from the active backlog until it reappears."
    },
    {
      label: "ignored",
      value: "ignored",
      description: "Suppress it from the active backlog."
    }
  ]);

  await runTriageCommand({
    project,
    id,
    status
  });
}

function stdoutBreak() {
  process.stdout.write("\n");
}
