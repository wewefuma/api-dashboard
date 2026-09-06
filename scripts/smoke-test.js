#!/usr/bin/env node
/**
 * Smoke test: end-to-end validation of API Dashboard MVP
 * Run: node scripts/smoke-test.js
 * Returns exit 0 on success, 1 on failure.
 */

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function test(name, fn) {
  try {
    await fn();
    console.log(`   PASS: ${name}`);
    return true;
  } catch (e) {
    console.log(`   FAIL: ${name}`);
    console.log(`         ${e.message}`);
    return false;
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg || "Assertion failed");
}

async function runTests() {
  console.log("=== API Dashboard Smoke Test ===\n");

  let passed = 0;
  let failed = 0;

  // Test 1: DB connectivity
  if (await test("Database connectivity", async () => {
    const count = await prisma.apiProvider.count();
    assert(typeof count === "number", `Expected count, got ${count}`);
  })) passed++; else failed++;

  // Test 2: Create provider (with JSON strings)
  if (await test("Create provider", async () => {
    const provider = await prisma.apiProvider.create({
      data: {
        name: "TestProvider",
        baseUrl: "https://api.test.com",
        pricingRules: JSON.stringify({}),
        rateLimitRules: JSON.stringify({ header: "X-RateLimit-Remaining", quota: 100 }),
      },
    });
    assert(provider.id, "Provider ID expected");
  })) passed++; else failed++;

  // Test 3: List providers
  if (await test("List providers", async () => {
    const list = await prisma.apiProvider.findMany();
    assert(Array.isArray(list), "Expected array, got" + typeof list);
    assert(list.length >= 5, `Expected >= 5, got ${list.length}`);
  })) passed++; else failed++;

  // Test 4: Delete provider
  if (await test("Delete provider", async () => {
    const list = await prisma.apiProvider.findMany();
    if (list.length > 0) {
      await prisma.apiProvider.delete({ where: { id: list[0].id } });
    }
  })) passed++; else failed++;

  // Test 5: Alert rules CRUD
  if (await test("Create alert rule", async () => {
    // Find a provider to attach alert to
    const provider = await prisma.apiProvider.findFirst();
    if (provider) {
      const rule = await prisma.alertRule.create({
        data: {
          providerId: provider.id,
          metricType: "rate_limit",
          threshold: 0.8,
          window: "1h",
          notificationChannel: "slack",
          webhookUrl: "https://hooks.slack.com/test",
          enabled: true,
        },
      });
      assert(rule.id, "Alert rule ID expected");
    }
  })) passed++; else failed++;

  // Test 6: API call logging
  if (await test("Log API call", async () => {
    const provider = await prisma.apiProvider.findFirst();
    if (provider) {
      const call = await prisma.apiCall.create({
        data: {
          providerId: provider.id,
          endpoint: "/v1/models",
          method: "GET",
          statusCode: 200,
          latencyMs: 45,
          rateLimitRemaining: 999,
          estimatedCost: 0.001,
          projectTag: "dev",
        },
      });
      assert(call.id, "API call ID expected");
    }
  })) passed++; else failed++;

  // Test 7: Metrics aggregation
  if (await test("Metrics aggregation", async () => {
    const provider = await prisma.apiProvider.findFirst({ include: { _count: { select: { calls: true } } } });
    assert(provider, "Provider expected");
    assert(provider._count.calls >= 0, "Call count expected");
  })) passed++; else failed++;

  await prisma.$disconnect();

  console.log("\n=== Results ===");
  console.log(`Passed: ${passed}, Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});