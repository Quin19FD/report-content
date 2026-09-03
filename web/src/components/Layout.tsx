import Link from 'next/link';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="w-64 bg-slate-900 text-white p-6">
        <h2 className="text-xl font-bold mb-8 text-sky-400">CRM Reporting</h2>
        <nav className="space-y-4">
          <Link href="/" className="block p-2 rounded hover:bg-slate-800">Daily Dashboard</Link>
          <Link href="/plan" className="block p-2 rounded hover:bg-slate-800">Monthly Plan</Link>
        </nav>
      </aside>
      <main className="flex-1 p-8">
        {children}
      </main>
    </div>
  );
}
