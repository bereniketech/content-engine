import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_AUTH_COOKIE, SUPABASE_FALLBACK_COOKIE } from '@/lib/auth';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SUPABASE_AUTH_COOKIE)?.value ?? cookieStore.get(SUPABASE_FALLBACK_COOKIE)?.value;
  if (!token) redirect('/login');

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) redirect('/login');

  const { data: profile } = await supabase
    .from('users')
    .select('account_type')
    .eq('id', user.id)
    .single();

  if (profile?.account_type !== 'admin') redirect('/dashboard');

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <nav className="flex items-center gap-6 border-b border-gray-800 px-6 py-3 text-sm">
        <span className="font-semibold text-white">Admin</span>
        <a href="/admin/users" className="text-gray-400 hover:text-white">Users</a>
        <a href="/admin/payments" className="text-gray-400 hover:text-white">Payments</a>
        <a href="/admin/abuse" className="text-gray-400 hover:text-white">Abuse</a>
        <a href="/admin/blocklist" className="text-gray-400 hover:text-white">Blocklist</a>
        <a href="/admin/alerts" className="text-gray-400 hover:text-white">Alerts</a>
        <a href="/admin/analytics" className="text-gray-400 hover:text-white">Analytics</a>
      </nav>
      <main className="p-6">{children}</main>
    </div>
  );
}
