// Seed script: creates 5 API providers with pricing rules.
// Run: npx ts-node prisma/seed.ts  (or: node --loader ts-node/esm prisma/seed.ts)
// Since runtime is JS, use: node prisma/seed.js after compiling, or use ts-node for dev.

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const PROVIDERS = [
  {
    name: "OpenAI",
    baseUrl: "https://api.openai.com",
    statusPageUrl: "https://status.openai.com",
    pricingRules: {
      "/v1/chat/completions": {
        POST: { costPerRequest: 0.03, unit: "1k tokens", model: "gpt-4" },
      },
      "/v1/embeddings": {
        POST: { costPerRequest: 0.0001, unit: "1k tokens", model: "text-embedding-3-small" },
      },
    },
    rateLimitRules: {
      header: "X-RateLimit-Remaining",
      quota: 10000,
      window: "minute",
    },
  },
  {
    name: "Stripe",
    baseUrl: "https://api.stripe.com",
    statusPageUrl: "https://status.stripe.com",
    pricingRules: {
      "/v1/charges": { POST: { costPerRequest: 0.003, unit: "per charge", model: "standard" } },
      "/v1/payment_intents": { POST: { costPerRequest: 0.003, unit: "per payment", model: "standard" } },
    },
    rateLimitRules: { header: "X-RateLimit-Remaining", quota: 100, window: "second" },
  },
  {
    name: "SendGrid",
    baseUrl: "https://api.sendgrid.com",
    statusPageUrl: "https://status.sendgrid.com",
    pricingRules: {
      "/v3/mail/send": { POST: { costPerRequest: 0.0001, unit: "per email", model: "standard" } },
    },
    rateLimitRules: { header: "X-RateLimit-Remaining", quota: 1000, window: "minute" },
  },
  {
    name: "Twilio",
    baseUrl: "https://api.twilio.com",
    statusPageUrl: "https://status.twilio.com",
    pricingRules: {
      "/2010-04-01/Accounts/{AccountSid}/Messages.json": {
        POST: { costPerRequest: 0.0075, unit: "per SMS", model: "standard" },
      },
    },
    rateLimitRules: { header: "X-RateLimit-Remaining", quota: 100, window: "minute" },
  },
  {
    name: "AWS S3",
    baseUrl: "https://s3.amazonaws.com",
    statusPageUrl: "https://status.aws.amazon.com/s3",
    pricingRules: {
      "/{bucket}/{key}": {
        PUT: { costPerRequest: 0.005, unit: "per 1k PUT", model: "standard" },
        GET: { costPerRequest: 0.0004, unit: "per 1k GET", model: "standard" },
      },
    },
    rateLimitRules: { header: "X-RateLimit-Remaining", quota: 5000, window: "minute" },
  },
];

async function main() {
  for (const p of PROVIDERS) {
    await prisma.apiProvider.upsert({
      where: { name: p.name },
      update: {},
      create: p,
    });
  }
  console.log("Seeded", PROVIDERS.length, "providers");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });