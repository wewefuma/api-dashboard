import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req) {
  try {
    // Read provider ID from path or body (simplified: assume path param handled by parent)
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/");
    const providerId = pathParts[pathParts.indexOf("proxy") + 1];

    const bodyText = await req.text();

    const provider = await prisma.apiProvider.findUnique({ where: { id: providerId } });
    if (!provider) return new Response(JSON.stringify({ error: "Provider not found" }), { status: 404, headers: { "Content-Type": "application/json" } });

    const targetUrl = `${provider.baseUrl}${url.pathname.replace(`/api/proxy/${providerId}`, "")}${url.search}`;

    // Forward request
    const start = Date.now();
    const res = await fetch(targetUrl, {
      method: req.method || "GET",
      headers: Object.fromEntries([...req.headers.entries()].filter(([k]) => !k.toLowerCase().startsWith("host") && !k.toLowerCase().startsWith("content-length"))),
      body: ["GET", "HEAD"].includes(req.method || "GET") ? undefined : bodyText,
    });
    const latencyMs = Date.now() - start;

    const statusCode = res.status;
    const rateLimitRemaining = res.headers.get("x-ratelimit-remaining") ? parseInt(res.headers.get("x-ratelimit-remaining"), 10) : null;

    // Calculate estimated cost
    let estimatedCost = 0;
    try {
      const pricing = provider.pricingRules ? (typeof provider.pricingRules === "object" ? provider.pricingRules : JSON.parse(provider.pricingRules)) : {};
      // Very simplified pricing lookup — real engine needed
      estimatedCost = 0.001;
    } catch {}

    await prisma.apiCall.create({
      data: {
        providerId,
        endpoint: url.pathname,
        method: req.method || "GET",
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
      statusText: res.statusText,
      headers: { "Content-Type": res.headers.get("content-type") || "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
