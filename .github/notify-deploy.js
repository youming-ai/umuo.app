#!/usr/bin/env node

/**
 * Deployment notification script
 * Can be configured to send notifications to Slack, Discord, or other services
 */

const https = require("https");

// Parse command line arguments
const args = process.argv.slice(2);
const status = args[0] || "unknown";
const deploymentUrl = args[1] || "";
const deploymentId = args[2] || "";

// Environment variables for notification configuration
const {
  SLACK_WEBHOOK_URL,
  DISCORD_WEBHOOK_URL,
  NOTIFICATION_SERVICE,
  APP_NAME = "umuo.app",
  APP_URL = "https://umuo.app",
} = process.env;

function createMessage(status, deploymentUrl, deploymentId) {
  const isProduction = process.env.GITHUB_REF === "refs/heads/main";
  const branch = process.env.GITHUB_REF_NAME || "unknown";
  const commit = process.env.GITHUB_SHA?.substring(0, 7) || "unknown";
  const actor = process.env.GITHUB_ACTOR || "unknown";

  const emoji =
    status === "success" ? "✅" : status === "failure" ? "❌" : "⏳";
  const color =
    status === "success" ? "good" : status === "failure" ? "danger" : "warning";

  const message = {
    text: `${emoji} ${APP_NAME} deployment ${status}`,
    attachments: [
      {
        color: color,
        fields: [
          {
            title: "Environment",
            value: isProduction ? "Production" : branch,
            short: true,
          },
          {
            title: "Status",
            value: status,
            short: true,
          },
          {
            title: "Commit",
            value: commit,
            short: true,
          },
          {
            title: "Triggered by",
            value: actor,
            short: true,
          },
        ],
        actions: deploymentUrl
          ? [
              {
                type: "button",
                text: "View Deployment",
                url: deploymentUrl,
              },
            ]
          : [],
        title: isProduction
          ? "Production Deployment"
          : `${branch} Branch Deployment`,
        title_link: APP_URL,
        footer: "GitHub Actions",
        ts: Math.floor(Date.now() / 1000),
      },
    ],
  };

  if (deploymentId) {
    message.attachments[0].fields.push({
      title: "Deployment ID",
      value: deploymentId,
      short: true,
    });
  }

  return message;
}

function sendSlackNotification(message) {
  return new Promise((resolve, reject) => {
    if (!SLACK_WEBHOOK_URL) {
      reject(new Error("SLACK_WEBHOOK_URL not configured"));
      return;
    }

    const postData = JSON.stringify(message);
    const url = new URL(SLACK_WEBHOOK_URL);

    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(postData),
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on("error", reject);
    req.write(postData);
    req.end();
  });
}

function sendDiscordNotification(message) {
  return new Promise((resolve, reject) => {
    if (!DISCORD_WEBHOOK_URL) {
      reject(new Error("DISCORD_WEBHOOK_URL not configured"));
      return;
    }

    // Convert Slack format to Discord format
    const discordMessage = {
      embeds: [
        {
          title: message.text,
          color:
            message.attachments[0].color === "good"
              ? 0x00ff00
              : message.attachments[0].color === "danger"
                ? 0xff0000
                : 0xffff00,
          fields: message.attachments[0].fields.map((field) => ({
            name: field.title,
            value: field.value,
            inline: field.short,
          })),
          url: APP_URL,
          footer: { text: "GitHub Actions" },
          timestamp: new Date().toISOString(),
        },
      ],
    };

    const postData = JSON.stringify(discordMessage);
    const url = new URL(DISCORD_WEBHOOK_URL);

    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(postData),
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on("error", reject);
    req.write(postData);
    req.end();
  });
}

async function sendNotification(status, deploymentUrl, deploymentId) {
  const message = createMessage(status, deploymentUrl, deploymentId);

  console.log(`📢 Sending ${status} notification...`);

  try {
    if (NOTIFICATION_SERVICE === "slack" || SLACK_WEBHOOK_URL) {
      await sendSlackNotification(message);
      console.log("✅ Slack notification sent");
    }

    if (NOTIFICATION_SERVICE === "discord" || DISCORD_WEBHOOK_URL) {
      await sendDiscordNotification(message);
      console.log("✅ Discord notification sent");
    }

    if (!NOTIFICATION_SERVICE && !SLACK_WEBHOOK_URL && !DISCORD_WEBHOOK_URL) {
      console.log("ℹ️ No notification service configured");
      console.log("📝 Message preview:", JSON.stringify(message, null, 2));
    }
  } catch (error) {
    console.error("❌ Failed to send notification:", error.message);
    process.exit(1);
  }
}

// Main execution
if (require.main === module) {
  sendNotification(status, deploymentUrl, deploymentId);
}

module.exports = { sendNotification, createMessage };
