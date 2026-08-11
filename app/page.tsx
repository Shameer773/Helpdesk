"use client";

import { useState } from "react";
import type { Guide } from "@/lib/guide-schema";

export default function EmployeePage() {
  const [problem, setProblem] = useState("");
  const [loading, setLoading] = useState(false);
  const [guide, setGuide] = useState<Guide | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!problem.trim() || loading) return;
    setLoading(true);
    setError(null);
    setGuide(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ problem }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed.");
      setGuide(data.guide as Guide);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="wrap">
      <span className="kb-note">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
        </svg>
        Answers are built only from the IT guides in your company knowledge base.
      </span>

      <form className="ask-card" onSubmit={onSubmit}>
        <div className="ask-label">Describe your IT problem in plain words</div>
        <textarea
          className="ask-field"
          placeholder="e.g. Outlook won't connect — it keeps asking for my password and then says 'disconnected'"
          value={problem}
          onChange={(e) => setProblem(e.target.value)}
        />
        <div className="ask-row">
          <span className="grow" />
          <button className="btn" type="submit" disabled={loading || !problem.trim()}>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
            {loading ? "Working…" : "Get my fix-it guide"}
          </button>
        </div>
      </form>

      {loading && (
        <div className="thinking" role="status">
          <span className="spinner" aria-hidden="true" />
          Reading your company guides and writing your steps… this can take a few
          seconds.
        </div>
      )}

      {error && <div className="errorbox">{error}</div>}

      {guide && guide.status === "ok" && (
        <section>
          <span className="badge badge-ok">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 6 9 17l-5-5" />
            </svg>
            Grounded in company knowledge
          </span>
          <h2 className="result-title">{guide.title}</h2>
          <p className="result-meta">
            {guide.steps.length} step{guide.steps.length === 1 ? "" : "s"}
          </p>
          <ol className="steps">
            {guide.steps.map((s, i) => (
              <li className="step" key={i}>
                <span className="step-num">{i + 1}</span>
                <div className="step-body">
                  <p>{s.text}</p>
                  {s.screenshotSuggestion && (
                    <div className="shot">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      >
                        <rect x="3" y="4" width="18" height="14" rx="2" />
                        <path d="M8 21h8M12 18v3" />
                      </svg>
                      <span>Screenshot suggestion: {s.screenshotSuggestion}</span>
                    </div>
                  )}
                  {s.source && (
                    <div className="source">
                      Source: <b>{s.source}</b>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {guide && guide.status === "insufficient" && (
        <div className="fallback">
          <span className="ic" aria-hidden="true">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
            </svg>
          </span>
          <div>
            <span className="badge badge-warn">Can&apos;t answer confidently</span>
            <h3>{guide.title}</h3>
            <p>
              {guide.message ||
                "None of the published documents cover this yet. Try rephrasing, or ask your IT admin to upload the relevant guide."}
            </p>
          </div>
        </div>
      )}

      <p className="footnote">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4M12 8h.01" />
        </svg>
        The assistant only uses your company&apos;s uploaded documents and will say
        so honestly when they don&apos;t cover your problem.
      </p>
    </main>
  );
}
