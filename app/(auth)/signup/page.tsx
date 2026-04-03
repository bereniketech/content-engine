"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { getPublicSiteUrl } from "@/lib/utils";

export default function SignupPage() {
	const router = useRouter();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [message, setMessage] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setLoading(true);
		setError(null);
		setMessage(null);

		const supabase = getSupabaseBrowserClient();
		const { data, error: signUpError } = await supabase.auth.signUp({
			email,
			password,
			options: {
				emailRedirectTo: `${getPublicSiteUrl()}/login`,
			},
		});

		if (signUpError) {
			setError(signUpError.message);
			setLoading(false);
			return;
		}

		if (data.session) {
			router.replace("/dashboard");
			router.refresh();
			return;
		}

		setMessage("Account created. If email confirmation is enabled, check your inbox.");
		setLoading(false);
	};

	return (
		<main className="min-h-screen bg-zinc-50 px-6 py-12">
			<div className="mx-auto w-full max-w-md rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
				<h1 className="text-2xl font-semibold text-zinc-900">Sign up</h1>
				<p className="mt-2 text-sm text-zinc-600">Create your account to get started.</p>

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
						autoComplete="new-password"
						minLength={8}
						required
					/>

					{error ? <p className="text-sm text-red-600">{error}</p> : null}
					{message ? <p className="text-sm text-emerald-700">{message}</p> : null}

					<button
						type="submit"
						disabled={loading}
						className="w-full rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-70"
					>
						{loading ? "Creating account..." : "Create account"}
					</button>
				</form>

				<p className="mt-4 text-sm text-zinc-600">
					Already have an account?{" "}
					<Link className="font-medium text-emerald-700 hover:underline" href="/login">
						Log in
					</Link>
				</p>
			</div>
		</main>
	);
}
