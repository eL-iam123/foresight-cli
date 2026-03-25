import { runDemoCommand } from "./demo.js";
import { runMonitorCommand } from "./monitor.js";
import { runReportCommand } from "./report.js";
import { runScanCommand } from "./scan.js";
import { runSubscribeCommand } from "./subscribe.js";
import { runSubscriptionsCommand } from "./subscriptions.js";
import { detectProjectName } from "../core/cli.js";
import { createPromptSession } from "../core/prompt.js";

export async function runInteractiveCommand() {
  const prompt = createPromptSession();
  const defaultProject = detectProjectName();

  try {
    let shouldExit = false;

    while (!shouldExit) {
      renderHeader(defaultProject);

      const action = await prompt.select("What do you want to do?", [
        {
          label: `Subscribe this project (${defaultProject})`,
          value: "subscribe-project"
        },
        {
          label: "Subscribe one package",
          value: "subscribe-package"
        },
        {
          label: "Check for changes now",
          value: "monitor"
        },
        {
          label: "View subscriptions",
          value: "subscriptions"
        },
        {
          label: "View report",
          value: "report"
        },
        {
          label: "Run a live runtime scan",
          value: "scan"
        },
        {
          label: "Run demo",
          value: "demo"
        },
        {
          label: "Exit",
          value: "exit"
        }
      ]);

      stdoutBreak();

      switch (action) {
        case "subscribe-project":
          await handleSubscribeProject(prompt, defaultProject);
          break;
        case "subscribe-package":
          await handleSubscribePackage(prompt, defaultProject);
          break;
        case "monitor":
          await handleMonitor(prompt, defaultProject);
          break;
        case "subscriptions":
          await runSubscriptionsCommand({
            project: defaultProject
          });
          break;
        case "report":
          await handleReport(prompt, defaultProject);
          break;
        case "scan":
          await handleScan(prompt, defaultProject);
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

async function handleSubscribeProject(prompt, defaultProject) {
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
}

async function handleSubscribePackage(prompt, defaultProject) {
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
}

async function handleMonitor(prompt, defaultProject) {
  const notify = await prompt.confirm("Send alerts if something changed?", true);
  await runMonitorCommand({
    project: defaultProject,
    notify
  });
}

async function handleReport(prompt, defaultProject) {
  const live = await prompt.confirm("Open live report view?", false);

  await runReportCommand({
    project: defaultProject,
    watch: live,
    interval: live ? 2 : undefined
  });
}

async function handleScan(prompt, defaultProject) {
  const source = await prompt.select("What do you want to scan?", [
    {
      label: "Run a command and watch its output",
      value: "command"
    },
    {
      label: "Follow a log file",
      value: "file"
    }
  ]);

  if (source === "command") {
    const command = await prompt.text("Command to run", {
      defaultValue: "npm test"
    });

    await runScanCommand({
      project: defaultProject,
      cmd: command,
      interactive: true
    });
    return;
  }

  const filePath = await prompt.text("Log file path");
  const follow = await prompt.confirm("Follow the file for live updates?", true);

  await runScanCommand({
    project: defaultProject,
    file: filePath,
    follow,
    interactive: true
  });
}

function renderHeader(project) {
  process.stdout.write("\x1b[2J\x1b[H");
  process.stdout.write("Foresight CLI\n");
  process.stdout.write("Setup once and monitor package changes over time.\n\n");
  process.stdout.write(`Current project: ${project}\n`);
  process.stdout.write("Use the menu below instead of memorizing flags.\n");
}

function stdoutBreak() {
  process.stdout.write("\n");
}
