import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    // Get metrics for each provider: request count, avg latency, error rate, etc.
    const providers = await prisma.apiProvider.findMany({
      include: {
        _count: { select: { calls: true } },
        calls: {
          orderBy: { timestamp: "desc" },
          take: 1000, // last 1000 calls for calculations
        },
      },
    });

    const metrics = await Promise.all(
      providers.map(async (provider) => {
        const calls = provider.calls || [];
        const totalCalls = calls.length;
        const errorCalls = calls.filter((c) => c.statusCode >= 400).length;
        const successCalls = calls.filter((c) => c.statusCode < 400).length;
        const latencies = calls.map((c) => c.latencyMs);
        const avgLatency =
          latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length || 0;
        const p95Latency =
          latencies.length > 0
            ? latencies
                .sort((a, b) => a - b)
                [Math.floor(0.95 * latencies.length)]
            : 0;
        const totalCost = calls.reduce((sum, call) => sum + (call.estimatedCost || 0), 0);
        const rateLimitRemaining =
          calls.length > 0
            ? calls
                .filter((c) => c.rateLimitRemaining !== null)
                .map((c) => c.rateLimitRemaining)
                .reduce((sum, val) => sum + val, 0) /
              calls.filter((c) => c.rateLimitRemaining !== null).length
            : null;

        return {
          id: provider.id,
          name: provider.name,
          baseUrl: provider.baseUrl,
          requestCount: totalCalls,
          errorRate: totalCalls > 0 ? (errorCalls / totalCalls) * 100 : 0,
          avgLatencyMs: avgLatency,
          p95LatencyMs: p95Latency,
          estimatedCost: totalCost,
          rateLimitRemaining: rateLimitRemaining ?? 0,
          projectTag: "dev", // placeholder
        };
      })
    );

    return new Response(JSON.stringify(metrics), {
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