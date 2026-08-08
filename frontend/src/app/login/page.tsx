"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [candidateId, setCandidateId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateId }),
      });
      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        setError(data.error ?? "Login failed");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-[#0f172a] px-4 py-16">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900/80 p-8 shadow-2xl">
        <p className="text-sm font-medium uppercase tracking-widest text-indigo-300">
          AI Technical Interviewer
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-white">
          Candidate sign in
        </h1>
        <p className="mt-2 text-sm text-slate-300">
          Enter your candidate ID (for example,{" "}
          <span className="font-mono text-indigo-200">CAND-001</span>).
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-slate-200">
              Candidate ID
            </span>
            <input
              type="text"
              autoComplete="username"
              placeholder="CAND-001"
              value={candidateId}
              onChange={(e) => setCandidateId(e.target.value)}
              className="mt-2 w-full rounded-lg border border-white/15 bg-slate-900/80 px-4 py-3 font-mono text-white placeholder:text-slate-500 outline-none ring-indigo-400 focus:ring-2"
              required
            />
          </label>

          {error && (
            <p
              className="rounded-lg border border-red-400/30 bg-red-950/40 px-3 py-2 text-sm text-red-200"
              role="alert"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-none bg-slate-200 py-3 font-medium text-slate-900 transition-colors hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-200 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-400"
          >
            {loading ? "Signing in…" : "Continue to dashboard"}
          </button>
        </form>
      </div>
    </div>
  );
}
