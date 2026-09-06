export default function Home() {
  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">API Dashboard</h1>
          <p className="text-gray-400 text-sm">Track every third-party API you depend on</p>
        </div>
      </header>
      <main className="flex-1 flex flex-col items-center justify-center p-12 text-center">
        <div className="max-w-2xl space-y-6">
          <h2 className="text-4xl font-extrabold">One dashboard to rule them all</h2>
          <p className="text-gray-400 text-lg">Monitor API costs, rate limits, and uptime across all your integrations — in a single view.</p>
          <div className="flex gap-4 justify-center pt-4">
            <a href="/dashboard" className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-base font-semibold transition-colors">View Dashboard →</a>
            <a href="/providers" className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-base font-semibold transition-colors">Manage Providers</a>
          </div>
        </div>
      </main>
      <footer className="border-t border-gray-800 px-6 py-3 text-center text-gray-500 text-sm">
        API Dashboard MVP · Built with Next.js · Self-hosted
      </footer>
    </div>
  );
}
