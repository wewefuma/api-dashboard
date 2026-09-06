import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export async function GET(req, { params }) {
  try {
    const p = await prisma.apiProvider.findUnique({
      where: { id: params.id },
      include: { _count: { select: { calls: true } }, calls: { take: 100, orderBy: { timestamp: "desc" } } }
    });
    if (!p) return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
    return new Response(JSON.stringify(p), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e) { return new Response(JSON.stringify({ error: e.message }), { status: 500 }); }
}

export async function DELETE(req, { params }) {
  try {
    await prisma.apiProvider.delete({ where: { id: params.id } });
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e) { return new Response(JSON.stringify({ error: e.message }), { status: 500 }); }
}

export async function PUT(req, { params }) {
  try {
    const body = await req.json();
    const updated = await prisma.apiProvider.update({ where: { id: params.id }, data: { name: body.name, baseUrl: body.baseUrl, pricingRules: body.pricingRules, rateLimitRules: body.rateLimitRules } });
    return new Response(JSON.stringify(updated), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e) { return new Response(JSON.stringify({ error: e.message }), { status: 500 }); }
}
