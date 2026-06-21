import { useState, useRef, useEffect } from "react";
import "../styles/chat.css";
import { apiURLPromise } from "../api/aiBaseUrl";

const SUGGESTIONS = [
  "What can I ask you to do?",
  "What projects should I be concerned about right now?",
];

export default function ChatBox() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage(overrideText) {
    const text = (overrideText ?? input).trim();
    if (!text || loading) return;

    setInput("");
    setError(null);
    setMessages((prev) => [...prev, { role: "user", text }]);
    setLoading(true);

    try {
      const apiURL = await apiURLPromise;
      const res = await fetch(`${apiURL}/chat/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail ?? `Server error ${res.status}`);
      }

      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", text: data.reply }]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  const isEmpty = messages.length === 0 && !loading;

  return (
    <div className="cb-root">

      {/* ── Message list ── */}
      <div className="cb-messages">
        {isEmpty ? (
          <div className="cb-empty">
            <span className="cb-sparkle" aria-hidden="true">✦</span>
            <p className="cb-empty-title">Ask our AI anything</p>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => (
              <div key={i} className={`cb-row cb-row--${msg.role}`}>
                <div className={`cb-bubble cb-bubble--${msg.role}`}>
                  {msg.text}
                </div>
              </div>
            ))}

            {loading && (
              <div className="cb-row cb-row--assistant">
                <div className="cb-bubble cb-bubble--assistant cb-bubble--thinking">
                  <span className="cb-dot" />
                  <span className="cb-dot" />
                  <span className="cb-dot" />
                </div>
              </div>
            )}

            {error && (
              <div className="cb-error">{error}</div>
            )}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── Suggestion chips — only when no messages ── */}
      {isEmpty && (
        <div className="cb-suggestions">
          <p className="cb-suggestions-label">Suggestions on what to ask Our AI</p>
          <div className="cb-suggestion-row">
            {SUGGESTIONS.map((s) => (
              <button key={s} className="cb-chip" onClick={() => sendMessage(s)}>
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Input bar ── */}
      <div className="cb-input-wrap">
        <textarea
          className="cb-input"
          rows={1}
          placeholder="Ask me anything about your projects"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
        />
        <button
          className="cb-send"
          onClick={() => sendMessage()}
          disabled={loading || !input.trim()}
          aria-label="Send"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.2"
            strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

    </div>
  );
}