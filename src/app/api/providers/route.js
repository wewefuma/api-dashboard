import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export async function GET(req) {
  const url = new URL(req.url);
  const id = url.pathname.split("/").pop();
  try {
    if (id && id !== "providers") {
      const p = await prisma.apiProvider.findUnique({ where: { id }, include: { calls: { take: 50, orderBy: { timestamp: "desc" } } } });
      return new Response(JSON.stringify(p || { error: "Not found" }), { status: p ? 200 : 404, headers: { "Content-Type": "application/json" } });
    }
    const list = await prisma.apiProvider.findMany({ include: { _count: { select: { calls: true } } } });
    return new Response(JSON.stringify(list), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e) { return new Response(JSON.stringify({ error: e.message }), { status: 500 }); }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const created = await prisma.apiProvider.create({ data: { name: body.name, baseUrl: body.baseUrl, pricingRules: body.pricingRules || {}, rateLimitRules: body.rateLimitRules || {} } });
    return new Response(JSON.stringify(created), { status: 201, headers: { "Content-Type": "application/json" } });
  } catch (e) { return new Response(JSON.stringify({ error: e.message }), { status: 500 }); }
}
