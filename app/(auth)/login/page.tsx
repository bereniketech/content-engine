'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { FormEvent, useMemo, useState, Suspense } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase'

type AuthAction = 'password' | 'guest'

function getErrorMessage(error: unknown): string {
	if (error instanceof Error) {
		return error.message
	}

	return 'Something went wrong. Please try again.'
}

function getGuestAuthErrorMessage(errorMessage: string): string {
	if (errorMessage.toLowerCase().includes('anonymous sign-ins are disabled')) {
		return 'Guest login is currently unavailable. Please sign in with email and password, or create an account.'
	}

	return errorMessage
}

function LoginForm() {
	const router = useRouter()
	const searchParams = useSearchParams()
	const nextPath = useMemo(
		() => {
			const requestedPath = searchParams.get('next')
			if (requestedPath && requestedPath.startsWith('/')) {
				return requestedPath
			}

			return '/dashboard'
		},
		[searchParams],
	)

	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [error, setError] = useState<string | null>(null)
	const [loadingAction, setLoadingAction] = useState<AuthAction | null>(null)

	const completeAuth = () => {
		router.replace(nextPath)
		router.refresh()
	}

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		if (loadingAction !== null) {
			return
		}

		setLoadingAction('password')
		setError(null)

		try {
			const supabase = getSupabaseBrowserClient()
			const { error: signInError } = await supabase.auth.signInWithPassword({
				email,
				password,
			})

			if (signInError) {
				setError(signInError.message)
				setLoadingAction(null)
				return
			}

			completeAuth()
		} catch (error: unknown) {
			setError(getErrorMessage(error))
			setLoadingAction(null)
		}
	}

	const handleGuestLogin = async () => {
		if (loadingAction !== null) {
			return
		}

		setLoadingAction('guest')
		setError(null)

		try {
			const supabase = getSupabaseBrowserClient()
			const { error: guestSignInError } = await supabase.auth.signInAnonymously()

			if (guestSignInError) {
				setError(getGuestAuthErrorMessage(guestSignInError.message))
				setLoadingAction(null)
				return
			}

			completeAuth()
		} catch (error: unknown) {
			setError(getErrorMessage(error))
			setLoadingAction(null)
		}
	}

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
						disabled={loadingAction !== null}
						className="w-full rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-70"
					>
						{loadingAction === 'password' ? 'Logging in...' : 'Log in'}
					</button>

					<button
						type="button"
						onClick={handleGuestLogin}
						disabled={loadingAction !== null}
						className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 font-medium text-zinc-800 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-70"
					>
						{loadingAction === 'guest' ? 'Starting guest session...' : 'Continue as guest'}
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
	)
}

export default function LoginPage() {
	return (
		<Suspense fallback={<div className="min-h-screen bg-zinc-50" />}>
			<LoginForm />
		</Suspense>
	)
}
