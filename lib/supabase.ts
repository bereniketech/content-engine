import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
	throw new Error(
		"Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.",
	);
}

let browserClient: SupabaseClient | undefined;

export function getSupabaseBrowserClient(): SupabaseClient {
	if (!browserClient) {
		browserClient = createBrowserClient(supabaseUrl!, supabaseAnonKey!);
	}

	return browserClient;
}
