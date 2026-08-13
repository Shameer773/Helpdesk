"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getBrowserSupabase } from "@/lib/supabase-browser";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const supabase = getBrowserSupabase();
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
      // Full navigation so proxy.ts re-reads the fresh session cookie.
      router.replace(next);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Sign in failed. Check your details.",
      );
      setLoading(false);
    }
  }

  return (
    <main className="wrap">
      <span className="eyebrow">HelpDesk-Assist</span>
      <h1 className="page-title">Sign in</h1>
      <p className="page-lede">
        Use the email and password your IT administrator gave you.
      </p>

      <form className="ask-card" onSubmit={onSubmit}>
        <div className="ask-label">Email</div>
        <input
          className="text-input"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <div className="ask-label" style={{ marginTop: 14 }}>
          Password
        </div>
        <input
          className="text-input"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {error && (
          <div className="errorbox" style={{ marginTop: 14 }}>
            {error}
          </div>
        )}

        <div className="ask-row" style={{ marginTop: 16 }}>
          <span className="grow" />
          <button
            className="btn btn-violet"
            type="submit"
            disabled={loading || !email.trim() || !password}
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </div>
      </form>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="wrap" />}>
      <LoginForm />
    </Suspense>
  );
}
