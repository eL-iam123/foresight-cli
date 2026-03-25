import nodemailer from "nodemailer";
import { formatTimestamp } from "../core/output.js";
import { meetsSeverityThreshold } from "../core/severity.js";

export function createAlertDispatcher(options = {}) {
  const config = resolveAlertConfig(options);

  return {
    enabled: Boolean(config.slack.webhookUrl || config.slack.botToken || config.smtp.host),
    async notifyFinding({ deprecation, isNew, emailTo, slackChannel }) {
      const runtimeConfig = {
        ...config,
        slack: {
          ...config.slack,
          channel: slackChannel || config.slack.channel
        },
        email: {
          ...config.email,
          to: emailTo ? splitList(emailTo) : config.email.to
        }
      };

      if (!shouldSendAlert(runtimeConfig, deprecation.severity, isNew)) {
        return [];
      }

      const deliveries = [];
      if (runtimeConfig.slack.botToken && runtimeConfig.slack.channel) {
        deliveries.push(sendSlackChannelAlert(runtimeConfig, deprecation, isNew));
      } else if (runtimeConfig.slack.webhookUrl) {
        deliveries.push(sendSlackWebhookAlert(runtimeConfig, deprecation, isNew));
      }

      if (runtimeConfig.smtp.host && runtimeConfig.email.to.length > 0) {
        deliveries.push(sendEmailAlert(runtimeConfig, deprecation, isNew));
      }

      return Promise.all(deliveries);
    }
  };
}

function resolveAlertConfig(options) {
  return {
    mode: options.alertMode || process.env.FORESIGHT_ALERT_MODE || "new",
    threshold:
      options.alertThreshold || process.env.FORESIGHT_ALERT_THRESHOLD || "high",
    slack: {
      webhookUrl:
        options.slackWebhook || process.env.FORESIGHT_SLACK_WEBHOOK_URL || "",
      botToken:
        options.slackBotToken || process.env.FORESIGHT_SLACK_BOT_TOKEN || "",
      channel:
        options.slackChannel || process.env.FORESIGHT_SLACK_CHANNEL || ""
    },
    email: {
      to: splitList(options.emailTo || process.env.FORESIGHT_EMAIL_TO),
      from:
        options.emailFrom ||
        process.env.FORESIGHT_EMAIL_FROM ||
        "foresight@localhost"
    },
    fetchImpl: options.fetchImpl || globalThis.fetch,
    transportFactory: options.transportFactory || nodemailer.createTransport,
    smtp: {
      host: options.smtpHost || process.env.FORESIGHT_SMTP_HOST || "",
      port: Number(options.smtpPort || process.env.FORESIGHT_SMTP_PORT || 587),
      secure: toBoolean(
        options.smtpSecure || process.env.FORESIGHT_SMTP_SECURE,
        false
      ),
      user: options.smtpUser || process.env.FORESIGHT_SMTP_USER || "",
      pass: options.smtpPass || process.env.FORESIGHT_SMTP_PASS || ""
    }
  };
}

function shouldSendAlert(config, severity, isNew) {
  if (!meetsSeverityThreshold(severity, config.threshold)) {
    return false;
  }

  if (config.mode === "all") {
    return true;
  }

  if (config.mode === "new") {
    return isNew;
  }

  if (config.mode === "regressions") {
    return severity === "high" || isNew;
  }

  return isNew;
}

async function sendSlackWebhookAlert(config, deprecation, isNew) {
  const payload = {
    text: renderAlertHeadline(deprecation, isNew),
    blocks: [
      sectionBlock(renderAlertHeadline(deprecation, isNew)),
      sectionBlock(renderAlertBody(deprecation))
    ],
    ...(config.slack.channel ? { channel: config.slack.channel } : {})
  };

  try {
    const response = await config.fetchImpl(config.slack.webhookUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const body = await response.text();
      return {
        channel: "slack",
        status: "failed",
        errorMessage: `Slack webhook rejected alert (${response.status}): ${body}`,
        payload
      };
    }

    return {
      channel: "slack",
      status: "delivered",
      deliveredAt: new Date().toISOString(),
      payload
    };
  } catch (error) {
    return {
      channel: "slack",
      status: "failed",
      errorMessage: error.message,
      payload
    };
  }
}

async function sendSlackChannelAlert(config, deprecation, isNew) {
  const payload = {
    channel: config.slack.channel,
    text: renderAlertHeadline(deprecation, isNew),
    blocks: [
      sectionBlock(renderAlertHeadline(deprecation, isNew)),
      sectionBlock(renderAlertBody(deprecation))
    ]
  };

  try {
    const response = await config.fetchImpl("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.slack.botToken}`,
        "content-type": "application/json; charset=utf-8"
      },
      body: JSON.stringify(payload)
    });
    const body = await response.json();

    if (!response.ok || body.ok === false) {
      return {
        channel: "slack",
        status: "failed",
        errorMessage: `Slack API rejected alert${body.error ? ` (${body.error})` : ""}`,
        payload
      };
    }

    return {
      channel: "slack",
      status: "delivered",
      deliveredAt: new Date().toISOString(),
      payload
    };
  } catch (error) {
    return {
      channel: "slack",
      status: "failed",
      errorMessage: error.message,
      payload
    };
  }
}

async function sendEmailAlert(config, deprecation, isNew) {
  const transport = config.transportFactory({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.secure,
    auth:
      config.smtp.user || config.smtp.pass
        ? {
            user: config.smtp.user,
            pass: config.smtp.pass
          }
        : undefined
  });

  const payload = {
    from: config.email.from,
    to: config.email.to.join(", "),
    subject: renderAlertHeadline(deprecation, isNew),
    text: renderAlertBody(deprecation)
  };

  try {
    await transport.sendMail(payload);
    return {
      channel: "email",
      status: "delivered",
      deliveredAt: new Date().toISOString(),
      payload
    };
  } catch (error) {
    return {
      channel: "email",
      status: "failed",
      errorMessage: error.message,
      payload
    };
  }
}

function renderAlertHeadline(deprecation, isNew) {
  return `[Foresight][${deprecation.severity.toUpperCase()}][${deprecation.project}] ${
    isNew ? "New" : "Updated"
  } ${deprecation.type} deprecation`;
}

function renderAlertBody(deprecation) {
  return [
    `Project: ${deprecation.project}`,
    `Type: ${deprecation.type}`,
    `Severity: ${deprecation.severity}`,
    `Module: ${deprecation.module || deprecation.packageName || "unknown"}`,
    `Message: ${deprecation.message}`,
    `Replacement: ${deprecation.replacement || "none suggested"}`,
    `First seen: ${formatTimestamp(deprecation.firstSeenAt)}`,
    `Last seen: ${formatTimestamp(deprecation.lastSeenAt)}`,
    `Occurrences: ${deprecation.occurrenceCount}`
  ].join("\n");
}

function sectionBlock(text) {
  return {
    type: "section",
    text: {
      type: "mrkdwn",
      text
    }
  };
}

function splitList(value = "") {
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function toBoolean(value, fallback) {
  if (value === undefined || value === "") {
    return fallback;
  }

  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}
