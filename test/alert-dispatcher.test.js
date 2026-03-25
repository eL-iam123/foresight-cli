import test from "node:test";
import assert from "node:assert/strict";
import { createAlertDispatcher } from "../src/services/alertDispatcher.js";

test("alert dispatcher sends directly to the overridden email and slack channel", async () => {
  const slackCalls = [];
  const emailCalls = [];
  const dispatcher = createAlertDispatcher({
    alertMode: "all",
    alertThreshold: "low",
    slackBotToken: "xoxb-test-token",
    transportFactory: () => ({
      async sendMail(payload) {
        emailCalls.push(payload);
      }
    }),
    fetchImpl: async (url, init) => {
      slackCalls.push({
        url,
        init
      });

      return {
        ok: true,
        async json() {
          return {
            ok: true
          };
        }
      };
    },
    smtpHost: "smtp.example.com",
    emailTo: "fallback@example.com",
    emailFrom: "foresight@example.com"
  });

  assert.equal(dispatcher.enabled, true);

  const deliveries = await dispatcher.notifyFinding({
    deprecation: {
      project: "demo-app",
      type: "runtime",
      severity: "medium",
      module: "legacy-api",
      packageName: null,
      message: "legacy-api is deprecated",
      replacement: "modern-api",
      firstSeenAt: "2026-03-25T12:00:00.000Z",
      lastSeenAt: "2026-03-25T12:00:00.000Z",
      occurrenceCount: 1
    },
    isNew: true,
    emailTo: "user@example.com",
    slackChannel: "alerts-team"
  });

  assert.equal(deliveries.length, 2);
  assert.equal(emailCalls.length, 1);
  assert.equal(emailCalls[0].to, "user@example.com");
  assert.equal(slackCalls.length, 1);
  assert.equal(slackCalls[0].url, "https://slack.com/api/chat.postMessage");

  const slackPayload = JSON.parse(slackCalls[0].init.body);
  assert.equal(slackPayload.channel, "alerts-team");
});
