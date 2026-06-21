import { useState, useEffect } from "react";
import "../styles/ai-analysis.css";
import { apiURLPromise } from "../api/aiBaseUrl";

// ─── Sub-components ───────────────────────────────────────────────────────────

function RatingRing({ rating }) {
  const pct = (rating / 10) * 100;
  const color =
    rating >= 8 ? "var(--ai-accent-green)" :
    rating >= 5 ? "var(--ai-accent-amber)" :
    "var(--ai-accent-red)";
  const circumference = 2 * Math.PI * 20;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="ai-rating-ring" aria-label={`Rating: ${rating} out of 10`}>
      <svg width="56" height="56" viewBox="0 0 56 56" aria-hidden="true">
        <circle cx="28" cy="28" r="20" fill="none" stroke="var(--ai-track)" strokeWidth="4" />
        <circle
          cx="28" cy="28" r="20" fill="none"
          stroke={color} strokeWidth="4"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 28 28)"
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <span className="ai-rating-number" style={{ color }}>{rating}</span>
    </div>
  );
}

function ComplexityRow({ label, time, space, isBest }) {
  return (
    <div className={`ai-complexity-row ${isBest ? "ai-complexity-row--best" : ""}`}>
      <span className="ai-complexity-label">{label}</span>
      <span className="ai-complexity-val">
        <abbr title="Time complexity">T</abbr> {time}
      </span>
      <span className="ai-complexity-val">
        <abbr title="Space complexity">S</abbr> {space}
      </span>
    </div>
  );
}

function Tag({ children }) {
  return <span className="ai-tag">{children}</span>;
}

// ─── Main component ───────────────────────────────────────────────────────────

/**
 * Calls /chat/analyze directly after a submission — same request pattern
 * as ChatBox.jsx (resolve the health-checked API base via apiURLPromise,
 * POST, parse the JSON response). No WebSocket round-trip and no reliance
 * on the room broadcast.
 *
 * Props:
 *   submitResult – the immediate HTTP response from POST /submit, with a
 *                  `_analysisContext: { code, language, question }`
 *                  snapshot attached by BattleRoom at submit time. Using a
 *                  snapshot (rather than live code/language/question props)
 *                  means the fetch only fires once per submission — not on
 *                  every keystroke or unrelated room broadcast.
 */
export default function AIAnalysisCard({ submitResult }) {
  const [dismissed, setDismissed] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  const context = submitResult?._analysisContext ?? null;

  useEffect(() => {
    setDismissed(false);
    setAnalysis(null);
    setFetchError(null);

    // No context means submit failed client-side before the server ever
    // judged the code — nothing meaningful to analyze.
    if (!submitResult || !context) return;

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const apiURL = await apiURLPromise;
        const res = await fetch(`${apiURL}/chat/analyze`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: context.code,
            language: context.language,
            question: context.question
              ? {
                  title: context.question.title,
                  description: context.question.description,
                  constraints: context.question.constraints,
                }
              : null,
            judge_result: {
              status: submitResult.status,
              passed: submitResult.passed_count ?? 0,
              total: submitResult.total_count ?? 0,
              runtime_ms: submitResult.runtime_ms ?? null,
              memory_kb: submitResult.memory_kb ?? null,
            },
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.detail ?? `Server error ${res.status}`);
        }

        const data = await res.json();
        if (!cancelled) setAnalysis(data);
      } catch (err) {
        if (!cancelled) setFetchError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [submitResult, context]);

  if (!submitResult || !context || dismissed) return null;

  const error = fetchError ?? analysis?.error ?? null;
  const data = error ? null : analysis;

  return (
    <div className="ai-analysis-card" role="region" aria-label="AI Code Analysis" aria-live="polite">
      <div className="ai-analysis-header">
        <span className="ai-analysis-eyebrow">🧠 AI Code Analysis</span>
        <button
          type="button"
          className="ai-analysis-dismiss"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss analysis"
        >
          ✕
        </button>
      </div>

      {loading && (
        <div className="ai-analysis-loading">
          <div className="ai-pulse-dots">
            <span /><span /><span />
          </div>
          <p>Analyzing your solution…</p>
        </div>
      )}

      {error && !loading && (
        <div className="ai-analysis-error">
          <span>⚠ Analysis unavailable</span>
          <p>{error}</p>
        </div>
      )}

      {data && !loading && (
        <div className="ai-analysis-body">

          {/* Rating + Status */}
          <div className="ai-top-row">
            <RatingRing rating={data.rating} />
            <div className="ai-top-meta">
              <p className="ai-section-label">Overall Rating</p>
              <p className="ai-rating-text"><strong>{data.rating}</strong> / 10</p>
              <p className="ai-section-label" style={{ marginTop: "6px" }}>Status</p>
              <p className={`ai-status ai-status--${String(data.status).toLowerCase().replace(/\s+/g, "-")}`}>
                {data.status === "Accepted" ? "✅" :
                 data.status?.includes("Wrong") ? "❌" :
                 data.status?.includes("TLE") ? "⏱" :
                 data.status?.includes("MLE") ? "💾" : "⚠"
                }{" "}
                {data.status} ({data.passedTests})
              </p>
            </div>
          </div>

          <div className="ai-divider" />

          {/* Complexity */}
          <div className="ai-section">
            <p className="ai-section-label">Complexity</p>
            <ComplexityRow label="Yours" time={data.timeComplexity} space={data.spaceComplexity} />
            <ComplexityRow label="Best"  time={data.bestTimeComplexity} space={data.bestSpaceComplexity} isBest />
          </div>

          {/* Optimal badge */}
          <div className="ai-optimal-row">
            <span className="ai-section-label">Optimal</span>
            <span className={`ai-optimal-badge ${data.isOptimal ? "ai-optimal-badge--yes" : "ai-optimal-badge--no"}`}>
              {data.isOptimal ? "🟢 Yes" : "🔴 No"}
            </span>
          </div>

          <div className="ai-divider" />

          {/* Strengths */}
          {data.strengths?.length > 0 && (
            <div className="ai-section">
              <p className="ai-section-label">Strengths</p>
              <ul className="ai-list ai-list--strengths">
                {data.strengths.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          )}

          {/* Issues */}
          {data.issues?.length > 0 && (
            <div className="ai-section">
              <p className="ai-section-label">Issues</p>
              <ul className="ai-list ai-list--issues">
                {data.issues.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          )}

          {/* Recommendation */}
          {data.recommendation && (
            <div className="ai-section">
              <p className="ai-section-label">Recommendation</p>
              <p className="ai-recommendation">{data.recommendation}</p>
            </div>
          )}

          <div className="ai-divider" />

          {/* Concepts */}
          {data.concepts?.length > 0 && (
            <div className="ai-section">
              <p className="ai-section-label">Concepts</p>
              <div className="ai-tags-row">
                {data.concepts.map((c, i) => <Tag key={i}>{c}</Tag>)}
              </div>
            </div>
          )}

          {/* Verdict */}
          {data.verdict && (
            <div className="ai-verdict">
              <p className="ai-section-label">Verdict</p>
              <p>{data.verdict}</p>
            </div>
          )}

        </div>
      )}
    </div>
  );
}