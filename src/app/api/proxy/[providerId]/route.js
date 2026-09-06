import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req, { params }) {
  try {
    const providerId = params.providerId;
    const provider = await prisma.apiProvider.findUnique({ where: { id: providerId } });
    if (!provider) return new Response(JSON.stringify({ error: "Provider not found" }), { status: 404, headers: { "Content-Type": "application/json" } });

    const url = new URL(req.url);
    const bodyText = await req.text();
    const targetPath = url.pathname.replace(`/api/proxy/${providerId}`, "");
    const targetUrl = `${provider.baseUrl}${targetPath}${url.search}`;

    const start = Date.now();
    const res = await fetch(targetUrl, {
      method: req.method || "POST",
      headers: {
        "Content-Type": "application/json",
        ...Object.fromEntries([...req.headers.entries()].filter(([k]) => !k.toLowerCase().startsWith("host") && k.toLowerCase() !== "content-length")),
      },
      body: bodyText,
    });
    const latencyMs = Date.now() - start;
    const statusCode = res.status;

    // Parse rate limit headers
    let rateLimitRemaining = null;
    const remainingHeader = res.headers.get("x-ratelimit-remaining");
    if (remainingHeader) rateLimitRemaining = parseInt(remainingHeader, 10);

    // Estimate cost (very simplified)
    let estimatedCost = 0;
    try {
      const pricingRules = typeof provider.pricingRules === "string" ? JSON.parse(provider.pricingRules) : provider.pricingRules || {};
      // Simple first-match pricing (real impl would need endpoint/method lookup)
      const firstRule = Object.values(pricingRules)[0] || {};
      estimatedCost = (typeof firstRule === "number" ? firstRule : firstRule.costPerRequest || 0) || 0;
    } catch {}

    await prisma.apiCall.create({
      data: {
        providerId,
        endpoint: targetPath,
        method: req.method || "POST",
        statusCode,
        latencyMs,
        rateLimitRemaining,
        estimatedCost,
        projectTag: "dev",
      },
    });

    const responseBody = await res.text();
    return new Response(responseBody, {
      status: res.status,
      headers: Object.fromEntries(res.headers.entries()),
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}

// GET, PUT, DELETE handlers similar to POST
export async function GET(req, { params }) {
  try {
    const providerId = params.providerId;
    const provider = await prisma.apiProvider.findUnique({ where: { id: providerId } });
    if (!provider) return new Response(JSON.stringify({ error: "Provider not found" }), { status: 404, headers: { "Content-Type": "application/json" } });

    const url = new URL(req.url);
    const targetPath = url.pathname.replace(`/api/proxy/${providerId}`, "");
    const targetUrl = `${provider.baseUrl}${targetPath}${url.search}`;

    const start = Date.now();
    const res = await fetch(targetUrl, {
      method: "GET",
      headers: Object.fromEntries([...req.headers.entries()].filter(([k]) => !k.toLowerCase().startsWith("host"))),
    });
    const latencyMs = Date.now() - start;
    const statusCode = res.status;

    let rateLimitRemaining = null;
    const remainingHeader = res.headers.get("x-ratelimit-remaining");
    if (remainingHeader) rateLimitRemaining = parseInt(remainingHeader, 10);

    let estimatedCost = 0;
    try {
      const pricingRules = typeof provider.pricingRules === "string" ? JSON.parse(provider.pricingRules) : provider.pricingRules || {};
      const firstRule = Object.values(pricingRules)[0] || {};
      estimatedCost = (typeof firstRule === "number" ? firstRule : firstRule.costPerRequest || 0) || 0;
    } catch {}

    await prisma.apiCall.create({
      data: {
        providerId,
        endpoint: targetPath,
        method: "GET",
        statusCode,
        latencyMs,
        rateLimitRemaining,
        estimatedCost,
        projectTag: "dev",
      },
    });

    const responseBody = await res.text();
    return new Response(responseBody, {
      status: res.status,
      headers: Object.fromEntries(res.headers.entries()),
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}

export async function PUT(req, { params }) {
  return POST(req, { params }); // Reuse POST logic for simplicity
}

export async function DELETE(req, { params }) {
  try {
    const providerId = params.providerId;
    const provider = await prisma.apiProvider.findUnique({ where: { id: providerId } });
    if (!provider) return new Response(JSON.stringify({ error: "Provider not found" }), { status: 404, headers: { "Content-Type": "application/json" } });

    const url = new URL(req.url);
    const targetPath = url.pathname.replace(`/api/proxy/${providerId}`, "");
    const targetUrl = `${provider.baseUrl}${targetPath}${url.search}`;

    const start = Date.now();
    const res = await fetch(targetUrl, {
      method: "DELETE",
      headers: Object.fromEntries([...req.headers.entries()].filter(([k]) => !k.toLowerCase().startsWith("host"))),
    });
    const latencyMs = Date.now() - start;
    const statusCode = res.status;

    let rateLimitRemaining = null;
    const remainingHeader = res.headers.get("x-ratelimit-remaining");
    if (remainingHeader) rateLimitRemaining = parseInt(remainingHeader, 10);

    let estimatedCost = 0;
    try {
      const pricingRules = typeof provider.pricingRules === "string" ? JSON.parse(provider.pricingRules) : provider.pricingRules || {};
      const firstRule = Object.values(pricingRules)[0] || {};
      estimatedCost = (typeof firstRule === "number" ? firstRule : firstRule.costPerRequest || 0) || 0;
    } catch {}

    await prisma.apiCall.create({
      data: {
        providerId,
        endpoint: targetPath,
        method: "DELETE",
        statusCode,
        latencyMs,
        rateLimitRemaining,
        estimatedCost,
        projectTag: "dev",
      },
    });

    const responseBody = await res.text();
    return new Response(responseBody, {
      status: res.status,
      headers: Object.fromEntries(res.headers.entries()),
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}