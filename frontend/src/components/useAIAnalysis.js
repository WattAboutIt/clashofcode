import { useState, useCallback } from "react";

const GROK_API_URL = "https://api.x.ai/v1/chat/completions";
const GROK_MODEL = "grok-3-mini";

function buildPrompt({ problem, code, language, result }) {
  const passedTests = result?.passed_count !== undefined
    ? `${result.passed_count}/${result.total_count}`
    : result?.passed !== undefined
    ? `${result.passed}/${result.total}`
    : "N/A";

  return `You are an expert competitive programming judge. Analyze this code submission concisely.

Problem: ${problem.title}
Description: ${problem.description}
Constraints: ${problem.constraints || "Not specified"}
Language: ${language}
Status: ${result?.status || "Unknown"}
Passed Tests: ${passedTests}
Execution Time: ${result?.runtime_ms ?? "N/A"} ms
Memory: ${result?.memory_kb ? `${result.memory_kb} KB` : "N/A"}

User's Code:
\`\`\`${language}
${code}
\`\`\`

Return ONLY a valid JSON object with NO markdown fences, NO extra text:
{
  "rating": <number 0–10, one decimal>,
  "status": "<submission status>",
  "passedTests": "<X/Y>",
  "timeComplexity": "<your estimate>",
  "spaceComplexity": "<your estimate>",
  "bestTimeComplexity": "<optimal for this problem>",
  "bestSpaceComplexity": "<optimal for this problem>",
  "isOptimal": <true|false>,
  "strengths": ["<max 3 short points>"],
  "issues": ["<max 3 short points, empty array if none>"],
  "recommendation": "<1–2 sentences max>",
  "concepts": ["<DSA concept>"],
  "verdict": "<1 sentence final verdict>"
}

Rules: Keep total word count under 200 words. Be specific to this code — no generic advice.`;
}

export function useAIAnalysis() {
  const [analysis, setAnalysis] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);

  const analyze = useCallback(async ({ problem, code, language, result }) => {
    if (!problem || !code || !result) return;

    setAnalysisLoading(true);
    setAnalysis(null);
    setAnalysisError(null);

    try {
      const response = await fetch(GROK_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_GROK_API_KEY}`,
        },
        body: JSON.stringify({
          model: GROK_MODEL,
          max_tokens: 600,
          temperature: 0.3,
          messages: [{ role: "user", content: buildPrompt({ problem, code, language, result }) }],
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.error?.message || `Grok API error ${response.status}`);
      }

      const data = await response.json();
      const raw = data.choices?.[0]?.message?.content || "";
      const cleaned = raw.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      setAnalysis(parsed);
    } catch (err) {
      setAnalysisError(err.message || "Analysis failed.");
    } finally {
      setAnalysisLoading(false);
    }
  }, []);

  const clearAnalysis = useCallback(() => {
    setAnalysis(null);
    setAnalysisError(null);
  }, []);

  return { analysis, analysisLoading, analysisError, analyze, clearAnalysis };
}