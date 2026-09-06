import { AppRouter } from "next/link";
import type { Link } from "next/link";

// Simple router for the dashboard
const Home = () => (
  <div className="min-h-screen bg-gray-950 text-white">
    <header className="p-6 border-b border-gray-800">
      <h1 className="text-2xl font-bold">API Dashboard</h1>
      <p className="text-gray-400">Personal Portfolio MVP</p>
    </header>
    <main className="p-6">
      <p>Track third‑party API costs, rate limits, and health in one place.</p>
      <Link href="/providers" className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded">
        <span>Providers</span>
      </Link>
      <Link href="/dashboard" className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded">
        <span>Dashboard</span>
      </Link>
    </main>
  </div>
);

export default Home;
