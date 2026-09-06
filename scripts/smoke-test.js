#!/usr/bin/env node
/**
 * Smoke test: end-to-end validation of API Dashboard MVP
 * Run: node scripts/smoke-test.js
 * Returns exit 0 on success, 1 on failure.
 */

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const TESTS = [];
let passed = 0;
let failed = 0;

async function test(name, fn) {
  TESTS.push({ name, fn });
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg || "Assertion failed");
}

async function runTests() {
  console.log("=== API Dashboard Smoke Test ===\n");

  try {
    // Test: DB connectivity
    console.log("1. Database connectivity...");
    const dbTest = await prisma.apiProvider.count();
    assert(typeof dbTest === "number", `Expected count, got ${dbTest}`);
    console.log("   PASS: Connected, found", dbTest, "providers");
    passed++;
  } catch (e) {
    console.log("   FAIL:", e.message);
    failed++;
  }

  try {
    // Test: Create provider
    console.log("2. Create provider...");
    const provider = await prisma.apiProvider.create({
      data: {
        name: "TestProvider",
        baseUrl: "https://api.test.com",
        pricingRules: {},
        rateLimitRules: { header: "X-RateLimit-Remaining", quota: 100 },
      },
    });
    assert(provider.id, "Provider ID expected");
    console.log("   PASS: Created", provider.id);
    passed++;
  } catch (e) {
    console.log("   FAIL:", e.message);
    failed++;
  }

  try {
    // Test: CRUD read (list)
    console.log("3. List providers...");
    const list = await prisma.apiProvider.findMany();
    assert(Array.isArray(list), "Expected array, got" + typeof list);
    console.log("   PASS: Return", list.length, "providers");
    passed++;
  } catch (e) {
    console.log("   FAIL:", e.message);
    failed++;
  }

  try {
    // Test: CRUD delete
    console.log("4. Delete provider...");
    const firstId = TESTS.some(t => t.name.includes("create")) ? null : null;
    const list = await prisma.apiProvider.findMany();
    if (list.length > 0) {
      await prisma.apiProvider.delete({ where: { id: list[0].id } });
      console.log("   PASS: Deleted", list[0].id);
    } else {
      console.log("   SKIP: No providers to delete");
    }
    passed++;
  } catch (e) {
    console.log("   FAIL:", e.message);
    failed++;
  }

  await prisma.$disconnect();

  console.log("\n=== Results ===");
  console.log(`Passed: ${passed}, Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});