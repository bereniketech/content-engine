export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-12">
      <div className="mx-auto w-full max-w-3xl rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-semibold text-zinc-900">Content Engine</h1>
        <p className="mt-3 text-zinc-600">
          Welcome to the main page. Use the dashboard link after you are signed in.
        </p>
        <a
          href="/dashboard"
          className="mt-6 inline-flex rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white transition hover:bg-emerald-500"
        >
          Open Dashboard
        </a>
      </div>
    </main>
  );
}
