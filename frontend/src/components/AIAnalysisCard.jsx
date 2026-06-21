import "../styles/ai-analysis.css";

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

export default function AIAnalysisCard({ analysis, loading, error, onDismiss }) {
  if (!loading && !analysis && !error) return null;

  return (
    <div className="ai-analysis-card" role="region" aria-label="AI Code Analysis" aria-live="polite">
      <div className="ai-analysis-header">
        <span className="ai-analysis-eyebrow">🧠 AI Code Analysis</span>
        {onDismiss && (
          <button
            type="button"
            className="ai-analysis-dismiss"
            onClick={onDismiss}
            aria-label="Dismiss analysis"
          >
            ✕
          </button>
        )}
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

      {analysis && !loading && (
        <div className="ai-analysis-body">

          {/* Rating + Status */}
          <div className="ai-top-row">
            <RatingRing rating={analysis.rating} />
            <div className="ai-top-meta">
              <p className="ai-section-label">Overall Rating</p>
              <p className="ai-rating-text"><strong>{analysis.rating}</strong> / 10</p>
              <p className="ai-section-label" style={{ marginTop: "6px" }}>Status</p>
              <p className={`ai-status ai-status--${String(analysis.status).toLowerCase().replace(/\s+/g, "-")}`}>
                {analysis.status === "Accepted" ? "✅" :
                 analysis.status?.includes("Wrong") ? "❌" :
                 analysis.status?.includes("TLE") ? "⏱" :
                 analysis.status?.includes("MLE") ? "💾" : "⚠"
                }{" "}
                {analysis.status} ({analysis.passedTests})
              </p>
            </div>
          </div>

          <div className="ai-divider" />

          {/* Complexity */}
          <div className="ai-section">
            <p className="ai-section-label">Complexity</p>
            <ComplexityRow label="Yours" time={analysis.timeComplexity} space={analysis.spaceComplexity} />
            <ComplexityRow label="Best" time={analysis.bestTimeComplexity} space={analysis.bestSpaceComplexity} isBest />
          </div>

          {/* Optimal badge */}
          <div className="ai-optimal-row">
            <span className="ai-section-label">Optimal</span>
            <span className={`ai-optimal-badge ${analysis.isOptimal ? "ai-optimal-badge--yes" : "ai-optimal-badge--no"}`}>
              {analysis.isOptimal ? "🟢 Yes" : "🔴 No"}
            </span>
          </div>

          <div className="ai-divider" />

          {/* Strengths */}
          {analysis.strengths?.length > 0 && (
            <div className="ai-section">
              <p className="ai-section-label">Strengths</p>
              <ul className="ai-list ai-list--strengths">
                {analysis.strengths.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          )}

          {/* Issues */}
          {analysis.issues?.length > 0 && (
            <div className="ai-section">
              <p className="ai-section-label">Issues</p>
              <ul className="ai-list ai-list--issues">
                {analysis.issues.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          )}

          {/* Recommendation */}
          {analysis.recommendation && (
            <div className="ai-section">
              <p className="ai-section-label">Recommendation</p>
              <p className="ai-recommendation">{analysis.recommendation}</p>
            </div>
          )}

          <div className="ai-divider" />

          {/* Concepts */}
          {analysis.concepts?.length > 0 && (
            <div className="ai-section">
              <p className="ai-section-label">Concepts</p>
              <div className="ai-tags-row">
                {analysis.concepts.map((c, i) => <Tag key={i}>{c}</Tag>)}
              </div>
            </div>
          )}

          {/* Verdict */}
          {analysis.verdict && (
            <div className="ai-verdict">
              <p className="ai-section-label">Verdict</p>
              <p>{analysis.verdict}</p>
            </div>
          )}

        </div>
      )}
    </div>
  );
}