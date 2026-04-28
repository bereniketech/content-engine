export default function AdminHomePage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Admin Dashboard</h1>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: 'Users', href: '/admin/users' },
          { label: 'Payments', href: '/admin/payments' },
          { label: 'Abuse Log', href: '/admin/abuse' },
          { label: 'Blocklist', href: '/admin/blocklist' },
        ].map(({ label, href }) => (
          <a
            key={href}
            href={href}
            className="rounded-lg border border-gray-800 bg-gray-900 p-6 text-center text-sm font-medium text-gray-300 hover:border-indigo-500 hover:text-white"
          >
            {label}
          </a>
        ))}
      </div>
    </div>
  );
}
