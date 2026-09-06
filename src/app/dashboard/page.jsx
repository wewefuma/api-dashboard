// Dashboard page - shows API metrics with charts
import ApiList from "@/components/ApiList";

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">API Dashboard</h1>
            <p className="text-gray-400 text-sm">Real-time metrics for your API integrations</p>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        <ApiList />
      </main>
    </div>
  );
}
