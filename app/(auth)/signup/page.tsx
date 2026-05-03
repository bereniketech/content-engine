"use client";

import { useState } from "react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase";

export default function SignupPage() {
  const supabase = getSupabaseBrowserClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleEmailSignup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/dashboard` },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  }

  async function handleGoogleSignup() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="w-full max-w-md space-y-4 rounded-xl border border-border bg-card p-8 text-center shadow-sm">
          <h1 className="text-xl font-semibold">Check your email</h1>
          <p className="text-sm text-foreground-3">
            We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account.
          </p>
          <Link href="/login" className="text-sm text-primary hover:underline">
            Back to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[420px] bg-card rounded-xl shadow-lg px-9 py-8 space-y-6">
      {/* Heading */}
      <div className="space-y-1 text-center">
        <h1
          className="text-[26px] font-bold text-foreground"
          style={{ letterSpacing: "-0.02em" }}
        >
          Create your account
        </h1>
        <p className="text-[14px] text-foreground-3 mt-0.5">Start creating content in minutes</p>
      </div>

      {/* Google SSO */}
      <button
        type="button"
        onClick={handleGoogleSignup}
        disabled={loading}
        className="w-full h-12 flex items-center justify-center gap-3 bg-card border border-border rounded-sm text-sm font-medium text-foreground hover:bg-surface-low transition-colors disabled:opacity-60"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        Continue with Google
      </button>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <hr className="flex-1 border-foreground-4/40" />
        <span className="text-[12px] text-foreground-3">or</span>
        <hr className="flex-1 border-foreground-4/40" />
      </div>

      {/* Email/password form */}
      <form onSubmit={handleEmailSignup} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1.5">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
            required
            className="w-full px-3.5 py-2.5 border border-foreground-4 rounded-md bg-card text-foreground placeholder:text-foreground-3 focus:border-secondary focus:ring-2 focus:ring-secondary/10 outline-none transition-colors"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1.5">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
            required
            minLength={8}
            className="w-full px-3.5 py-2.5 border border-foreground-4 rounded-md bg-card text-foreground placeholder:text-foreground-3 focus:border-secondary focus:ring-2 focus:ring-secondary/10 outline-none transition-colors"
            placeholder="At least 8 characters"
          />
        </div>

        {error && (
          <p className="text-sm text-destructive rounded-md bg-destructive/10 px-3 py-2">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full h-[52px] rounded-md bg-primary text-primary-foreground text-[15px] font-bold transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {loading ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="text-center text-[13px] text-foreground-3">
        Already have an account?{" "}
        <Link href="/login" className="text-primary font-medium hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
