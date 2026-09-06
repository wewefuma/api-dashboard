// Seed script — creates 5 API providers with pricing rules
// Note: pricingRules and rateLimitRules stored as JSON strings (SQLite)
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const PROVIDERS = [
  {
    name: "OpenAI",
    baseUrl: "https://api.openai.com",
    statusPageUrl: "https://status.openai.com",
    pricingRules: JSON.stringify({ "/v1/chat/completions": { POST: { costPerRequest: 0.03, unit: "1k tokens", model: "gpt-4" } }, "/v1/embeddings": { POST: { costPerRequest: 0.0001, unit: "1k tokens", model: "text-embedding-3-small" } } }),
    rateLimitRules: JSON.stringify({ header: "X-RateLimit-Remaining", quota: 10000, window: "minute" }),
  },
  {
    name: "Stripe",
    baseUrl: "https://api.stripe.com",
    statusPageUrl: "https://status.stripe.com",
    pricingRules: JSON.stringify({ "/v1/charges": { POST: { costPerRequest: 0.003, unit: "per charge", model: "standard" } }, "/v1/payment_intents": { POST: { costPerRequest: 0.003, unit: "per payment", model: "standard" } } }),
    rateLimitRules: JSON.stringify({ header: "X-RateLimit-Remaining", quota: 100, window: "second" }),
  },
  {
    name: "SendGrid",
    baseUrl: "https://api.sendgrid.com",
    statusPageUrl: "https://status.sendgrid.com",
    pricingRules: JSON.stringify({ "/v3/mail/send": { POST: { costPerRequest: 0.0001, unit: "per email", model: "standard" } } }),
    rateLimitRules: JSON.stringify({ header: "X-RateLimit-Remaining", quota: 1000, window: "minute" }),
  },
  {
    name: "Twilio",
    baseUrl: "https://api.twilio.com",
    statusPageUrl: "https://status.twilio.com",
    pricingRules: JSON.stringify({ "/2010-04-01/Accounts/{AccountSid}/Messages.json": { POST: { costPerRequest: 0.0075, unit: "per SMS", model: "standard" } } }),
    rateLimitRules: JSON.stringify({ header: "X-RateLimit-Remaining", quota: 100, window: "minute" }),
  },
  {
    name: "AWS S3",
    baseUrl: "https://s3.amazonaws.com",
    statusPageUrl: "https://status.aws.amazon.com/s3",
    pricingRules: JSON.stringify({ "/{bucket}/{key}": { PUT: { costPerRequest: 0.005, unit: "per 1k PUT", model: "standard" }, GET: { costPerRequest: 0.0004, unit: "per 1k GET", model: "standard" } } }),
    rateLimitRules: JSON.stringify({ header: "X-RateLimit-Remaining", quota: 5000, window: "minute" }),
  },
];

async function main() {
  for (const p of PROVIDERS) {
    const existing = await prisma.apiProvider.findFirst({ where: { name: p.name } });
    if (!existing) {
      await prisma.apiProvider.create({
        data: {
          name: p.name,
          baseUrl: p.baseUrl,
          statusPageUrl: p.statusPageUrl,
          pricingRules: p.pricingRules,
          rateLimitRules: p.rateLimitRules,
        },
      });
      console.log("Created:", p.name);
    } else {
      console.log("Already exists:", p.name);
    }
  }
  console.log("Seed complete");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });