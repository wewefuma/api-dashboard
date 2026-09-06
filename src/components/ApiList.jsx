"use client";
import { useState, useEffect, Suspense } from "react";
import Link from "next/link";

function RateLimitBar({ remaining, quota }) {
  const pct = remaining != null && quota ? Math.min(100, (remaining / quota) * 100) : 100;
  const color = pct < 20 ? "bg-red-500" : pct < 50 ? "bg-yellow-500" : "bg-green-500";
  return (
    <div className="w-full bg-gray-700 rounded-full h-2">
      <div className={`h-2 rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      {remaining != null ? <span className="text-xs text-gray-400 ml-2">{remaining}/{quota}</span> : null}
    </div>
  );
}

function ApiListInner() {
  const [providers, setProviders] = useState([]);
  const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const projectTag = params.get("project") || "all";

  useEffect(() => {
    fetch("/api/providers")
      .then((r) => r.json())
      .then(setProviders)
      .catch(console.error);
  }, []);

  const filtered = projectTag === "all" ? providers : providers.filter((p) => (p.projectTag || "dev") === projectTag);

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="flex gap-2">
        {["all", "dev", "prod"].map((tag) => (
          <a key={tag} href={`/dashboard?project=${tag}`}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${projectTag === tag ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"}`}>
            {tag.charAt(0).toUpperCase() + tag.slice(1)}
          </a>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700 text-left text-gray-400">
              <th className="pb-3 pr-4 font-medium">Name</th>
              <th className="pb-3 pr-4 font-medium">Base URL</th>
              <th className="pb-3 pr-4 font-medium">Requests</th>
              <th className="pb-3 pr-4 font-medium">Avg Latency</th>
              <th className="pb-3 pr-4 font-medium w-48">Rate Limit</th>
              <th className="pb-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="py-8 text-center text-gray-500">No providers found. Add one via the API.</td></tr>
            )}
            {filtered.map((p) => (
              <tr key={p.id} className="hover:bg-gray-900 transition-colors">
                <td className="py-3 pr-4 font-medium text-white">{p.name}</td>
                <td className="py-3 pr-4 text-gray-400 text-xs">{p.baseUrl}</td>
                <td className="py-3 pr-4 text-gray-300">{p._count?.calls || 0}</td>
                <td className="py-3 pr-4 text-gray-300">{p.avgLatencyMs ? `${p.avgLatencyMs}ms` : "—"}</td>
                <td className="py-3 pr-4">
                  <RateLimitBar remaining={p.lastRateLimitRemaining} quota={p.rateLimitQuota} />
                </td>
                <td className="py-3">
                  <Link href={`/dashboard/${p.id}`} className="text-blue-400 hover:text-blue-300 underline text-sm">View →</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function ApiList() {
  return (
    <Suspense fallback={<div className="text-gray-400">Loading...</div>}>
      <ApiListInner />
    </Suspense>
  );
}
