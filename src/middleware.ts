import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Check if request is to /api/proxy/:providerId/*
  const proxyMatch = pathname.match(/^\/api\/proxy\/([^/]+)\/(.*)$/);
  if (proxyMatch) {
    const providerId = proxyMatch[1];
    const originalPath = `/${proxyMatch[2]}`;

    // Look up the provider from query or fallback to API lookup
    // For now, forward with limited scope
    const targetUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.example.com"}${originalPath}`;

    try {
      const res = await fetch(targetUrl, {
        method: req.method,
        headers: {
          "content-type": "application/json",
          ...(await req.headers.entries()).reduce((acc, [key, value]) => {
            if (!key.toLowerCase().startsWith("authorization") && !key.toLowerCase().startsWith("host")) {
              acc[key] = value;
            }
            return acc;
          }, {} as Record<string, string>),
        },
      });

      const data = await res.text();
      return new NextResponse(data, {
        status: res.status,
        statusText: res.statusText,
        headers: Object.fromEntries(res.headers.entries()),
      });
    } catch (err) {
      return new NextResponse(JSON.stringify({ error: "Proxy error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  // Let other requests pass through
  return NextResponse.next();
}

export const config = {
  matcher: ["/api/proxy/:path*"],
};