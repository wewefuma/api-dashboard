// lib/alerts.js — Alert evaluation engine
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function evaluateAlerts() {
  const rules = await prisma.alertRule.findMany({ where: { enabled: true } });
  const fired = [];

  for (const rule of rules) {
    const windowMs = parseWindow(rule.window);
    const since = new Date(Date.now() - windowMs);

    const calls = await prisma.apiCall.findMany({
      where: { providerId: rule.providerId, timestamp: { gte: since } },
      orderBy: { timestamp: "desc" },
    });

    if (!calls.length) continue;

    let breached = false;
    let message = "";

    switch (rule.metricType) {
      case "cost": {
        const total = calls.reduce((s, c) => s + (c.estimatedCost || 0), 0);
        if (total >= rule.threshold) {
          breached = true;
          message = `Cost threshold exceeded: $${total.toFixed(2)} (limit: $${rule.threshold})`;
        }
        break;
      }
      case "rate_limit": {
        const minRemaining = Math.min(...calls.map(c => c.rateLimitRemaining ?? Infinity));
        if (minRemaining <= rule.threshold) {
          breached = true;
          message = `Rate limit low: ${minRemaining} remaining (threshold: ${rule.threshold})`;
        }
        break;
      }
      case "errors": {
        const errors = calls.filter(c => c.statusCode >= 400).length;
        const rate = (errors / calls.length) * 100;
        if (rate >= rule.threshold) {
          breached = true;
          message = `Error rate spike: ${rate.toFixed(1)}% (threshold: ${rule.threshold}%)`;
        }
        break;
      }
      case "latency": {
        const avg = calls.reduce((s, c) => s + c.latencyMs, 0) / calls.length;
        if (avg >= rule.threshold) {
          breached = true;
          message = `Latency high: ${avg.toFixed(0)}ms avg (threshold: ${rule.threshold}ms)`;
        }
        break;
      }
      case "downtime": {
        const last = calls[0];
        const diff = Date.now() - new Date(last.timestamp).getTime();
        if (diff > rule.threshold * 60 * 1000) {
          breached = true;
          message = `API downtime detected: no calls in ${Math.round(diff / 60000)} minutes`;
        }
        break;
      }
    }

    if (breached) {
      fired.push({ rule, message });
    }
  }

  // Send notifications
  for (const f of fired) {
    await sendNotification(f.rule, f.message);
  }

  return fired;
}

function parseWindow(window) {
  const match = window.match(/(\d+)([mhd])/);
  if (!match) return 3600000; // default 1h
  const num = parseInt(match[1], 10);
  const unit = match[2];
  const multipliers = { m: 60000, h: 3600000, d: 86400000 };
  return num * multipliers[unit];
}

async function sendNotification(rule, message) {
  if (!rule.webhookUrl) return;
  const payload = {
    text: `🚨 Alert: ${rule.metricType}`,
    blocks: [
      {
        type: "header",
        text: { type: "plain_text", text: `🚨 Alert: ${rule.metricType}` },
      },
      {
        type: "section",
        text: { type: "plain_text", text: message },
      },
      {
        type: "context",
        elements: [
          { type: "plain_text", text: `Window: ${rule.window} | Channel: ${rule.notificationChannel}` },
        ],
      },
    ],
  };

  try {
    await fetch(rule.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    console.error("Notification failed:", e);
  }
}

module.exports = { evaluateAlerts };