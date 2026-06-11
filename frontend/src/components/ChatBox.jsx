import { useState, useRef, useEffect } from "react";

const RAILWAY_URL = "https://your-backend.up.railway.app";
const LOCAL_URL = "http://localhost:8000";

const API_URL = import.meta.env.VITE_API_URL ?? (
  import.meta.env.DEV ? LOCAL_URL : RAILWAY_URL
);

export default function ChatBox() {
  const [messages, setMessages] = useState([
    { role: "assistant", text: "Hi! Ask me anything about coding, debugging, or the challenges." }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const bottomRef = useRef(null);

  // Scroll to latest message whenever messages change.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    setError(null);
    setMessages(prev => [...prev, { role: "user", text }]);
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/chat/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail ?? `Server error ${res.status}`);
      }

      const data = await res.json();
      setMessages(prev => [...prev, { role: "assistant", text: data.reply }]);
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

  return (
    <div style={styles.wrapper}>
      <div style={styles.messageList}>
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              ...styles.bubble,
              ...(msg.role === "user" ? styles.userBubble : styles.assistantBubble),
            }}
          >
            {msg.text}
          </div>
        ))}

        {loading && (
          <div style={{ ...styles.bubble, ...styles.assistantBubble, opacity: 0.5 }}>
            Thinking…
          </div>
        )}

        {error && (
          <div style={styles.error}>
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div style={styles.inputRow}>
        <textarea
          style={styles.textarea}
          rows={2}
          placeholder="Ask anything… (Enter to send)"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
        />
        <button
          style={{
            ...styles.sendBtn,
            ...(loading || !input.trim() ? styles.sendBtnDisabled : {}),
          }}
          onClick={sendMessage}
          disabled={loading || !input.trim()}
        >
          Send
        </button>
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    display: "flex",
    flexDirection: "column",
    height: "480px",
    border: "1px solid #2a2a3a",
    borderRadius: "8px",
    overflow: "hidden",
    background: "#0f0f1a",
    fontFamily: "inherit",
  },
  messageList: {
    flex: 1,
    overflowY: "auto",
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  bubble: {
    maxWidth: "75%",
    padding: "10px 14px",
    borderRadius: "12px",
    fontSize: "14px",
    lineHeight: "1.5",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
  userBubble: {
    alignSelf: "flex-end",
    background: "#4f46e5",
    color: "#fff",
    borderBottomRightRadius: "2px",
  },
  assistantBubble: {
    alignSelf: "flex-start",
    background: "#1e1e2e",
    color: "#e2e8f0",
    borderBottomLeftRadius: "2px",
  },
  error: {
    alignSelf: "center",
    color: "#f87171",
    fontSize: "13px",
    padding: "6px 12px",
    background: "#2d1515",
    borderRadius: "6px",
  },
  inputRow: {
    display: "flex",
    gap: "8px",
    padding: "12px",
    borderTop: "1px solid #2a2a3a",
    background: "#0f0f1a",
  },
  textarea: {
    flex: 1,
    resize: "none",
    padding: "8px 12px",
    borderRadius: "6px",
    border: "1px solid #2a2a3a",
    background: "#1e1e2e",
    color: "#e2e8f0",
    fontSize: "14px",
    outline: "none",
    fontFamily: "inherit",
  },
  sendBtn: {
    padding: "0 20px",
    borderRadius: "6px",
    border: "none",
    background: "#4f46e5",
    color: "#fff",
    fontWeight: 600,
    fontSize: "14px",
    cursor: "pointer",
    transition: "opacity 0.15s",
  },
  sendBtnDisabled: {
    opacity: 0.4,
    cursor: "not-allowed",
  },
};