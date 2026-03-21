"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase";

export default function LoginPage() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const nextPath = useMemo(
		() => {
			const requestedPath = searchParams.get("next");
			if (requestedPath && requestedPath.startsWith("/")) {
				return requestedPath;
			}

			return "/dashboard";
		},
		[searchParams],
	);

	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setLoading(true);
		setError(null);

		const supabase = getSupabaseBrowserClient();
		const { error: signInError } = await supabase.auth.signInWithPassword({
			email,
			password,
		});

		if (signInError) {
			setError(signInError.message);
			setLoading(false);
			return;
		}

		router.replace(nextPath);
		router.refresh();
	};

	return (
		<main className="min-h-screen bg-zinc-50 px-6 py-12">
			<div className="mx-auto w-full max-w-md rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
				<h1 className="text-2xl font-semibold text-zinc-900">Log in</h1>
				<p className="mt-2 text-sm text-zinc-600">
					Access your content engine dashboard.
				</p>

				<form className="mt-6 space-y-4" onSubmit={handleSubmit}>
					<label className="block text-sm font-medium text-zinc-700" htmlFor="email">
						Email
					</label>
					<input
						id="email"
						type="email"
						value={email}
						onChange={(event) => setEmail(event.target.value)}
						className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 outline-none ring-emerald-500 focus:ring-2"
						autoComplete="email"
						required
					/>

					<label
						className="block text-sm font-medium text-zinc-700"
						htmlFor="password"
					>
						Password
					</label>
					<input
						id="password"
						type="password"
						value={password}
						onChange={(event) => setPassword(event.target.value)}
						className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-zinc-900 outline-none ring-emerald-500 focus:ring-2"
						autoComplete="current-password"
						required
					/>

					{error ? <p className="text-sm text-red-600">{error}</p> : null}

					<button
						type="submit"
						disabled={loading}
						className="w-full rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-70"
					>
						{loading ? "Logging in..." : "Log in"}
					</button>
				</form>

				<p className="mt-4 text-sm text-zinc-600">
					Don&apos;t have an account?{" "}
					<Link className="font-medium text-emerald-700 hover:underline" href="/signup">
						Sign up
					</Link>
				</p>
			</div>
		</main>
	);
}
