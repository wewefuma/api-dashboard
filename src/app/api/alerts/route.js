import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req) {
  try {
    // Evaluate all active alert rules
    const { evaluateAlerts } = require("../lib/alerts");
    const fired = await evaluateAlerts();
    return new Response(JSON.stringify({ fired, count: fired.length }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

// Manual trigger endpoint
export async function GET(req) {
  try {
    const { evaluateAlerts } = require("../lib/alerts");
    const fired = await evaluateAlerts();
    return new Response(JSON.stringify({ fired, count: fired.length }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}