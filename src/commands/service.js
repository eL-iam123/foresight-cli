import { resolve } from "node:path";
import { resolveDbPath, resolveProjectName } from "../core/cli.js";

export async function runServiceCommand(options = {}) {
  const dbPath = resolve(process.cwd(), resolveDbPath(options));
  const project = resolveProjectName(options);
  const foresightPath = process.argv[1];

  if (options.create) {
    renderServiceOptions(foresightPath, dbPath, project);
  } else {
    process.stdout.write("Usage: foresight service --create\n");
  }
}

function renderServiceOptions(foresightPath, dbPath, project) {
  process.stdout.write("\x1b[2J\x1b[H");
  process.stdout.write("Foresight Service Setup\n");
  process.stdout.write("Choose how you want to run Foresight on a schedule.\n\n");

  process.stdout.write("Option 1: Cron Job (Recommended for most users)\n");
  process.stdout.write("Add this to your crontab (`crontab -e`):\n\n");
  process.stdout.write(`0 9 * * * ${process.execPath} ${foresightPath} monitor --notify --db ${dbPath} --project ${project}\n\n`);

  process.stdout.write("Option 2: Systemd Service (For Linux servers)\n");
  process.stdout.write("Create a file at `/etc/systemd/system/foresight.service`:\n\n");
  process.stdout.write("[Unit]\n");
  process.stdout.write("Description=Foresight Deprecation Monitor\n");
  process.stdout.write("After=network.target\n\n");
  process.stdout.write("[Service]\n");
  process.stdout.write(`Type=oneshot\n`);
  process.stdout.write(`ExecStart=${process.execPath} ${foresightPath} monitor --notify --db ${dbPath} --project ${project}\n`);
  process.stdout.write(`User=${process.env.USER || "your-user"}\n`);
  process.stdout.write(`WorkingDirectory=${process.cwd()}\n\n`);
  process.stdout.write("[Install]\n");
  process.stdout.write("WantedBy=multi-user.target\n\n");

  process.stdout.write("Then create a timer at `/etc/systemd/system/foresight.timer`:\n\n");
  process.stdout.write("[Unit]\n");
  process.stdout.write("Description=Run Foresight Monitor Daily\n\n");
  process.stdout.write("[Timer]\n");
  process.stdout.write("OnCalendar=daily\n");
  process.stdout.write("Persistent=true\n\n");
  process.stdout.write("[Install]\n");
  process.stdout.write("WantedBy=timers.target\n\n");

  process.stdout.write("Enable it with:\n");
  process.stdout.write("sudo systemctl enable --now foresight.timer\n\n");
}
