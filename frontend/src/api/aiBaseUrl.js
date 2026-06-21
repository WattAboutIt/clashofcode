// Shared base-URL resolution for the AI-backed endpoints (/chat/, /chat/analyze).
// Tries local dev server first, falls back to Railway. Computed once at
// module load and cached, so every caller (ChatBox, AIAnalysisCard, etc.)
// shares the same resolved URL instead of re-running the health check.

export const RAILWAY_URL = "https://clashofcode-production.up.railway.app";
export const LOCAL_URL = "http://localhost:8000";

export const apiURLPromise = fetch(`${LOCAL_URL}/health`, {
  method: "HEAD",
  signal: AbortSignal.timeout(800),
})
  .then(() => LOCAL_URL)
  .catch(() => RAILWAY_URL);