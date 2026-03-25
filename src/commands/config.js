import { openDatabase } from "../core/db.js";
import { DeprecationStore } from "../core/store.js";
import { resolveDbPath } from "../core/cli.js";
import { createPromptSession } from "../core/prompt.js";

export async function runConfigCommand(options = {}) {
  const db = await openDatabase(resolveDbPath(options));
  const store = new DeprecationStore(db);

  const args = options._ || [];
  const subCommand = args[0];

  try {
    if (subCommand === "set") {
      const key = args[1];
      const value = args[2];
      if (!key || value === undefined) {
        process.stdout.write("Usage: foresight config set <key> <value>\n");
        return;
      }
      store.setSetting(key, value);
      process.stdout.write(`Setting ${key} updated.\n`);
    } else if (subCommand === "list") {
      const settings = store.getAllSettings();
      if (Object.keys(settings).length === 0) {
        process.stdout.write("No settings configured.\n");
      } else {
        process.stdout.write("Current Settings:\n");
        for (const [key, value] of Object.entries(settings)) {
          process.stdout.write(`  ${key}: ${value}\n`);
        }
      }
    } else {
      await runInteractiveConfig(store);
    }
  } finally {
    db.close();
  }
}

async function runInteractiveConfig(store) {
  const prompt = createPromptSession();
  const settings = store.getAllSettings();

  process.stdout.write("\x1b[2J\x1b[H");
  process.stdout.write("Foresight Configuration\n");
  process.stdout.write("Update global settings for alerts and monitoring.\n\n");

  const category = await prompt.select("What do you want to configure?", [
    { label: "Email (SMTP)", value: "email" },
    { label: "Slack", value: "slack" },
    { label: "Telegram", value: "telegram" },
    { label: "AI Agent", value: "ai_agent" },
    { label: "General Settings", value: "general" },
    { label: "Exit", value: "exit" }
  ]);

  if (category === "exit") {
    prompt.close();
    return;
  }

  if (category === "email") {
    const smtpHost = await prompt.text("SMTP Host", { defaultValue: settings.smtpHost || "" });
    const smtpPort = await prompt.text("SMTP Port", { defaultValue: settings.smtpPort || "587" });
    const smtpUser = await prompt.text("SMTP User", { defaultValue: settings.smtpUser || "" });
    const smtpPass = await prompt.text("SMTP Password", { defaultValue: settings.smtpPass || "" });
    const emailFrom = await prompt.text("Email From", { defaultValue: settings.emailFrom || "foresight@localhost" });
    const emailTo = await prompt.text("Default Notification Email(s) (comma separated)", { defaultValue: settings.emailTo || "" });

    store.setSetting("smtpHost", smtpHost);
    store.setSetting("smtpPort", smtpPort);
    store.setSetting("smtpUser", smtpUser);
    store.setSetting("smtpPass", smtpPass);
    store.setSetting("emailFrom", emailFrom);
    store.setSetting("emailTo", emailTo);
  } else if (category === "slack") {
    const slackWebhookUrl = await prompt.text("Slack Webhook URL", { defaultValue: settings.slackWebhookUrl || "" });
    const slackBotToken = await prompt.text("Slack Bot Token", { defaultValue: settings.slackBotToken || "" });
    const slackChannel = await prompt.text("Default Slack Channel", { defaultValue: settings.slackChannel || "" });

    store.setSetting("slackWebhookUrl", slackWebhookUrl);
    store.setSetting("slackBotToken", slackBotToken);
    store.setSetting("slackChannel", slackChannel);
  } else if (category === "telegram") {
    const telegramBotToken = await prompt.text("Telegram Bot Token", { defaultValue: settings.telegramBotToken || "" });
    const telegramChatId = await prompt.text("Telegram Chat ID", { defaultValue: settings.telegramChatId || "" });

    store.setSetting("telegramBotToken", telegramBotToken);
    store.setSetting("telegramChatId", telegramChatId);
  } else if (category === "ai_agent") {
    const aiAgentWebhookUrl = await prompt.text("AI Agent Webhook URL", { defaultValue: settings.aiAgentWebhookUrl || "" });

    store.setSetting("aiAgentWebhookUrl", aiAgentWebhookUrl);
  } else if (category === "general") {
    const alertThreshold = await prompt.select("Alert Severity Threshold", [
      { label: "High", value: "high" },
      { label: "Medium", value: "medium" },
      { label: "Low", value: "low" }
    ], { defaultValue: settings.alertThreshold || "high" });

    const alertMode = await prompt.select("Alert Mode", [
      { label: "New only", value: "new" },
      { label: "All occurrences", value: "all" },
      { label: "Regressions (high severity or new)", value: "regressions" }
    ], { defaultValue: settings.alertMode || "new" });

    store.setSetting("alertThreshold", alertThreshold);
    store.setSetting("alertMode", alertMode);
  }

  process.stdout.write("\nSettings saved successfully!\n");
  prompt.close();
}
