import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import { useParams, useNavigate } from "react-router-dom";

import api from "../api/axios";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import { useAuth } from "../context/AuthContext";
import "../styles/room.css";

const DIFF_LABELS = { easy: "Easy", medium: "Medium", hard: "Hard" };
const LANGUAGE_META = {
  python: { label: "Python", monaco: "python", extension: "py" },
  javascript: { label: "JavaScript", monaco: "javascript", extension: "js" },
  java: { label: "Java", monaco: "java", extension: "java" },
  cpp: { label: "C++", monaco: "cpp", extension: "cpp" },
};
const MOBILE_TABS = ["Problem", "Code", "Console", "Players", "Chat"];

function toDisplay(value, fallback = "N/A") {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function extractError(err, fallback) {
  const detail = err?.response?.data?.detail || err?.response?.data?.error || err?.message;
  if (!detail) return fallback;
  return typeof detail === "string" ? detail : JSON.stringify(detail);
}

function normalizeCases(question) {
  const sampleCases = question?.sample_cases || question?.test_cases || [];
  return sampleCases.map((item, index) => ({
    name: item.name || `Case ${index + 1}`,
    input: item.input ?? {},
    expected: item.expected ?? item.expected_output ?? item.output,
  }));
}

function getDraftKey(roomCode, language) {
  return `clashofcode:draft:${roomCode}:${language}`;
}

function messageKey(item, index) {
  return item?.id ?? `${item?.username || "anon"}-${item?.created_at || ""}-${index}-${item?.message || ""}`;
}

function StatusPill({ status }) {
  const normalized = String(status || "Idle").toLowerCase().replace(/\s+/g, "-");
  return <span className={`battle-room__status-pill battle-room__status-pill--${normalized}`}>{status || "Idle"}</span>;
}

function CountdownTimer({ room, onExpire }) {
  const [remaining, setRemaining] = useState(room?.remaining_seconds ?? null);

  useEffect(() => {
    if (!room?.ends_at || room?.status !== "active") {
      return undefined;
    }

    const tick = () => {
      const diff = Math.max(0, Math.floor((new Date(room.ends_at).getTime() - Date.now()) / 1000));
      setRemaining(diff);
      if (diff === 0) onExpire?.();
    };

    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [room?.ends_at, room?.remaining_seconds, room?.status, onExpire]);

  if (remaining === null || remaining === undefined) return <span className="battle-room__timer">--:--</span>;
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  return (
    <span className={`battle-room__timer ${remaining <= 60 ? "battle-room__timer--danger" : ""}`}>
      {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
    </span>
  );
}

function ProblemPane({ question, difficulty, active, onTab }) {
  if (!question) {
    return <div className="battle-room__empty-pane">The problem appears when the battle starts.</div>;
  }

  return (
    <div className="battle-room__problem-shell">
      <div className="battle-room__panel-tabs" role="tablist" aria-label="Problem sections">
        {["Description", "Examples", "Constraints"].map((tab) => (
          <button
            key={tab}
            type="button"
            className={`battle-room__panel-tab ${active === tab ? "battle-room__panel-tab--active" : ""}`}
            onClick={() => onTab(tab)}
            role="tab"
            aria-selected={active === tab}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="battle-room__problem-scroll">
        <div className="battle-room__problem-header">
          <div>
            <p className="label-text">Problem</p>
            <h2 className="battle-room__problem-title">{question.title}</h2>
          </div>
          <div className="battle-room__chip-row">
            <span className="battle-room__chip battle-room__chip--difficulty">{DIFF_LABELS[difficulty] || difficulty}</span>
            <span className="battle-room__chip battle-room__chip--points">{question.points} pts</span>
          </div>
        </div>

        {active === "Description" && <div className="battle-room__copy">{question.description}</div>}

        {active === "Examples" && (
          <div className="battle-room__example-grid">
            {(question.examples || []).length ? question.examples.map((example, index) => (
              <article key={`${question.id}-${index}`} className="battle-room__example-card">
                <span className="battle-room__example-index">Example {index + 1}</span>
                <p><strong>Input:</strong> <span className="font-mono">{toDisplay(example.input)}</span></p>
                <p><strong>Output:</strong> <span className="font-mono">{toDisplay(example.output)}</span></p>
                {example.explanation && <p className="muted-text">{example.explanation}</p>}
              </article>
            )) : <div className="room-empty">No written examples were provided.</div>}
          </div>
        )}

        {active === "Constraints" && (
          question.constraints
            ? <div className="battle-room__constraint-box">{question.constraints}</div>
            : <div className="room-empty">No explicit constraints were provided.</div>
        )}
      </div>
    </div>
  );
}

function MonacoCodeEditor({ code, language, locked, onChange, onMount }) {
  const meta = LANGUAGE_META[language] || LANGUAGE_META.python;

  return (
    <div className="battle-room__monaco-shell">
      <div className="battle-room__editor-bar">
        <div className="battle-room__editor-file">
          <span className="battle-room__editor-pill">{meta.label}</span>
          <span className="battle-room__editor-name">solution.{meta.extension}</span>
        </div>
        <span className="battle-room__editor-state">{locked ? "Locked" : "Autosaving"}</span>
      </div>
      <Editor
        height="100%"
        language={meta.monaco}
        value={code}
        theme="vs-dark"
        loading={<div className="battle-room__editor-loading">Loading editor...</div>}
        options={{
          readOnly: locked,
          fontSize: 14,
          fontLigatures: true,
          minimap: { enabled: true },
          bracketPairColorization: { enabled: true },
          guides: { bracketPairs: true, indentation: true },
          automaticLayout: true,
          tabSize: 2,
          scrollBeyondLastLine: false,
          wordWrap: "on",
          formatOnPaste: true,
          formatOnType: true,
          suggestOnTriggerCharacters: true,
        }}
        onChange={(value) => onChange(value || "")}
        onMount={onMount}
      />
    </div>
  );
}

function TestcaseTabs({ cases, result, selected, onSelect }) {
  const results = result?.results || [];
  const rows = results.length ? results : cases;
  if (!rows.length) {
    return <div className="battle-room__console-empty">No visible cases are available. Use custom input for a manual run.</div>;
  }

  const row = rows[selected] || rows[0];
  const resultRow = results[selected];

  return (
    <div className="battle-room__testcase-pane">
      <div className="battle-room__case-tabs" role="tablist" aria-label="Visible test cases">
        {rows.map((item, index) => {
          const itemResult = results[index];
          const status = itemResult?.status ?? (item.passed === true ? "Accepted" : item.passed === false ? "Wrong Answer" : undefined);
          return (
            <button
              key={`${item.name || "case"}-${index}`}
              type="button"
              className={`battle-room__case-tab ${selected === index ? "battle-room__case-tab--active" : ""}`}
              onClick={() => onSelect(index)}
            >
              <span className="battle-room__case-tab-label">{item.name || `Case ${index + 1}`}</span>
              {status && <StatusPill status={status} />}
            </button>
          );
        })}
      </div>
      <div className="battle-room__case-detail-grid">
        <label>
          <span>Input</span>
          <pre>{toDisplay(row.input)}</pre>
        </label>
        <label>
          <span>Expected</span>
          <pre>{toDisplay(row.expected)}</pre>
        </label>
        <label>
          <span>Obtained</span>
          <pre>{toDisplay(resultRow?.actual ?? resultRow?.output, resultRow?.error ?? "Not run")}</pre>
        </label>
        <div style={{ gridColumn: "1 / -1" }}>
          <strong style={{ color: resultRow?.passed ? "var(--success)" : resultRow ? "var(--danger)" : "var(--text-muted)" }}>
            {resultRow ? (resultRow.passed ? "Passed" : "Failed") : "Not executed"}
          </strong>
        </div>
      </div>
    </div>
  );
}

function ConsolePane({ active, onActive, runResult, submitResult, running, customInput, onCustomInput, onClear, cases, selectedCase, onSelectCase }) {
  const tabs = ["Testcases", "Console", "Custom Input", "Submissions"];
  const currentResult = active === "Submissions" ? submitResult : runResult;

  return (
    <div className="battle-room__console">
      <div className="battle-room__console-tabs" role="tablist" aria-label="Execution console">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            className={`battle-room__console-tab ${active === tab ? "battle-room__console-tab--active" : ""}`}
            onClick={() => onActive(tab)}
            role="tab"
            aria-selected={active === tab}
          >
            {tab}
          </button>
        ))}
        <button type="button" className="battle-room__console-clear" onClick={onClear}>Clear</button>
      </div>

      <div className="battle-room__console-body" aria-live="polite">
        {running && <div className="battle-room__running-strip">Running code...</div>}

        {active === "Testcases" && <TestcaseTabs cases={cases} result={runResult} selected={selectedCase} onSelect={onSelectCase} />}

        {active === "Custom Input" && (
          <textarea
            className="battle-room__custom-input"
            value={customInput}
            onChange={(event) => onCustomInput(event.target.value)}
            placeholder="stdin for input()-based solutions"
            aria-label="Custom stdin input"
          />
        )}

        {active === "Console" && (
          currentResult
            ? <ExecutionResult result={currentResult} />
            : <div className="battle-room__console-empty">Run Code to see stdout, errors, status, and runtime.</div>
        )}

        {active === "Submissions" && (
          submitResult
            ? <ExecutionResult result={submitResult} />
            : <div className="battle-room__console-empty">Submit to run hidden judge validation.</div>
        )}
      </div>
    </div>
  );
}

function ExecutionResult({ result }) {
  const status = result?.status || result?.message || (result?.passed ? "Accepted" : "Wrong Answer");
  const rows = result?.results || result?.test_results || [];

  return (
    <div className="battle-room__execution-result">
      <div className="battle-room__execution-head">
        <div>
          <StatusPill status={status} />
          <p>{result?.passed_count ?? result?.passed ?? 0} / {result?.total_count ?? result?.total ?? rows.length ?? 0} cases passed</p>
        </div>
        <div className="battle-room__perf-row">
          <span>{result?.runtime_ms ?? 0} ms</span>
          <span>{result?.memory_kb ? `${result.memory_kb} KB` : "Memory N/A"}</span>
          {result?.score !== undefined && <strong>{result.score} pts</strong>}
        </div>
      </div>

      {(result?.stdout || result?.stderr || result?.error) && (
        <div className="battle-room__stdout-grid">
          {result.stdout && <label><span>stdout</span><pre>{result.stdout}</pre></label>}
          {(result.stderr || result.error) && <label><span>errors</span><pre>{result.stderr || result.error}</pre></label>}
        </div>
      )}

      {!!rows.length && (
        <div className="battle-room__case-list">
          {rows.map((item, index) => (
            <div key={`${item.name || "result"}-${index}`} className="battle-room__case-card">
              <div className="battle-room__case-card-head">
                <span>{item.name || `Case ${index + 1}`}</span>
                <StatusPill status={item.status || (item.passed ? "Accepted" : "Wrong Answer")} />
              </div>
              {!item.passed && (
                <div className="battle-room__case-diff">
                  <label><span>Expected</span><pre>{toDisplay(item.expected)}</pre></label>
                  <label><span>Actual</span><pre>{toDisplay(item.actual, item.error || "N/A")}</pre></label>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Leaderboard({ players, currentUsername, host }) {
  const ranked = [...(players || [])].sort((a, b) => (b.score || 0) - (a.score || 0) || (b.progress || 0) - (a.progress || 0));
  return (
    <div className="battle-room__leaderboard">
      {ranked.map((player, index) => (
        <div
          key={player.username}
          className={`battle-room__leader-row ${player.username === currentUsername ? "battle-room__leader-row--me" : ""}`}
        >
          <span className="battle-room__rank">#{index + 1}</span>
          <div className="battle-room__player-avatar">{player.username.slice(0, 2).toUpperCase()}</div>
          <div className="battle-room__leader-main">
            <p>
              <strong>{player.username}</strong>
              {player.username === host && <span className="battle-room__player-tag">Host</span>}
              {player.username === currentUsername && <span className="battle-room__player-you">you</span>}
            </p>
            <small>
              <span className={player.online ? "battle-room__online" : "battle-room__offline"} />
              {player.typing ? "typing..." : player.last_action || player.status}
            </small>
          </div>
          <div className="battle-room__leader-score">
            <strong>{player.score || 0}</strong>
            <span>{player.passed || 0}/{player.total || 0}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function EventFeed({ events }) {
  return (
    <div className="battle-room__event-feed">
      {(events || []).slice().reverse().slice(0, 12).map((event) => (
        <div key={event.id} className="battle-room__event">
          <span>{event.kind}</span>
          <p>{event.message}</p>
        </div>
      ))}
      {!(events || []).length && <div className="room-empty">Battle events will appear here.</div>}
    </div>
  );
}

function SubmissionHistory({ submissions }) {
  return (
    <div className="battle-room__submission-history">
      {(submissions || []).length ? submissions.map((submission) => (
        <div key={submission.id || submission.submitted_at} className="battle-room__submission-row">
          <div>
            <StatusPill status={submission.status} />
            <p>{submission.language} · {new Date(submission.submitted_at).toLocaleTimeString()}</p>
          </div>
          <div>
            <strong>{submission.score || 0} pts</strong>
            <span>{submission.passed || 0}/{submission.total || 0} · {submission.runtime_ms || 0} ms</span>
          </div>
        </div>
      )) : <div className="room-empty">No submissions yet.</div>}
    </div>
  );
}

function ChatPanel({ messages, currentUsername, draft, onDraft, onSend }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  return (
    <div className="battle-room__chat">
      <div className="battle-room__chat-messages" aria-live="polite">
        {(messages || []).length ? messages.map((item) => {
          const mine = item.username === currentUsername;
          return (
            <div
              key={item.id || `${item.username}-${item.created_at}`}
              className={`battle-room__chat-message ${mine ? "battle-room__chat-message--me" : ""}`}
            >
              <div className="battle-room__chat-meta">
                <strong>{mine ? "You" : item.username}</strong>
                <span>{item.created_at ? new Date(item.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}</span>
              </div>
              <p>{item.message}</p>
            </div>
          );
        }) : <div className="room-empty">No messages yet.</div>}
        <div ref={bottomRef} />
      </div>

      <form className="battle-room__chat-form" onSubmit={onSend}>
        <textarea
          value={draft}
          onChange={(event) => onDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              onSend(event);
            }
          }}
          maxLength={500}
          placeholder="Message competitors..."
          aria-label="Chat message"
        />
        <Button type="submit" size="sm" disabled={!draft.trim()}>Send</Button>
      </form>
    </div>
  );
}

function BattleRoom() {
  const { roomCode } = useParams();
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [starting, setStarting] = useState(false);
  const [readying, setReadying] = useState(false); // ✅ FIX: added ready loading state
  const [language, setLanguage] = useState("python");
  const [code, setCode] = useState("");
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [runResult, setRunResult] = useState(null);
  const [submitResult, setSubmitResult] = useState(null);
  const [customInput, setCustomInput] = useState("");
  const [problemTab, setProblemTab] = useState("Description");
  const [consoleTab, setConsoleTab] = useState("Testcases");
  const [selectedCase, setSelectedCase] = useState(0);
  const [mobileTab, setMobileTab] = useState("Code");
  const [focusMode, setFocusMode] = useState({ problem: false, sidebar: false, console: false });
  const [showLeaderboard, setShowLeaderboard] = useState(true);
  const [columns, setColumns] = useState({ left: 34, right: 19 });
  const [chatDraft, setChatDraft] = useState("");
  const [unreadMessages, setUnreadMessages] = useState(0);

  const previousQuestionId = useRef(null);
  const workerRef = useRef(null);
  const wsRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const toastTimeoutRef = useRef(null); // ✅ FIX: track toast timeout for cleanup
  const mobileTabRef = useRef("Code");
  const currentUsernameRef = useRef(user?.username || "");
  const chatSnapshotRef = useRef([]);
  const isHostRef = useRef(false); // ✅ FIX: ref to avoid stale closure in WS handler
  const hasJoinedRef = useRef(false); // ✅ FIX: prevent re-joining on every WS reconnect
  const autoStartingRef = useRef(false); // ✅ FIX: prevent duplicate auto-start calls

  const myPlayer = useMemo(() => room?.players?.find((player) => player.username === user?.username), [room, user?.username]);
  const isHost = room?.host === user?.username;
  const visibleCases = useMemo(() => normalizeCases(room?.question), [room?.question]);

  // ✅ FIX: use isLocked consistently everywhere (was mixing locked + isLocked)
  const locked = room?.status === "finished" || myPlayer?.status === "submitted" || myPlayer?.status === "time_up";
  const roundLocked = room?.status === "round_finished";
  const isLocked = locked || roundLocked;

  const submissions = myPlayer?.submissions || [];
  const amReady = myPlayer?.status === "ready"; // ✅ FIX: track own ready state

  // ✅ FIX: keep isHostRef in sync so WS handler always has fresh value
  useEffect(() => {
    isHostRef.current = isHost;
  }, [isHost]);

  // ✅ FIX: keep currentUsernameRef in sync
  useEffect(() => {
    currentUsernameRef.current = user?.username || "";
  }, [user?.username]);

  const sendSocket = useCallback((payload) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
    }
  }, []);

  // ✅ FIX: host also gets a Ready button; HTTP is always called for reliability
  const handleReadyClick = async () => {
    if (readying || amReady) return;
    setReadying(true);
    setError("");
    try {
      await api.post(`/rooms/${roomCode}/ready`);
      const updated = await api.get(`/rooms/${roomCode}`);
      setRoom(updated.data);
      // also broadcast via WS so others see the update instantly
      sendSocket({ event: "player_ready" });
    } catch (err) {
      setError(extractError(err, "Unable to mark ready."));
    } finally {
      setReadying(false);
    }
  };

  useEffect(() => {
    workerRef.current = new Worker(new URL("../utils/pyodideWorker.js", import.meta.url), { type: "classic" });
    return () => workerRef.current?.terminate();
  }, []);

  // Load room on mount
  useEffect(() => {
    let cancelled = false;
    api.get(`/rooms/${roomCode}`)
      .then((response) => { if (!cancelled) setRoom(response.data); })
      .catch((err) => { if (!cancelled) setError(extractError(err, "Unable to load room. Please check the room code.")); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [roomCode]);

  // ✅ FIX: load draft only when question is available; also reset selectedCase
  useEffect(() => {
    const questionId = room?.question?.id;
    if (!questionId || previousQuestionId.current === `${questionId}:${language}`) return;
    const stored = localStorage.getItem(getDraftKey(roomCode, language));
    setCode(stored ?? room.question.starter_code ?? "");
    setSelectedCase(0); // ✅ reset case index when question changes
    previousQuestionId.current = `${questionId}:${language}`;
  }, [language, room?.question, roomCode]);

  // Autosave draft — only when question is loaded and code is non-empty
  useEffect(() => {
    if (!room?.question?.id || !code) return undefined; // ✅ guard added
    const id = window.setTimeout(() => {
      localStorage.setItem(getDraftKey(roomCode, language), code);
    }, 700);
    return () => window.clearTimeout(id);
  }, [code, language, room?.question?.id, roomCode]);

  useEffect(() => {
    if (room?.status === "finished") setShowLeaderboard(true);
  }, [room?.status]);

  useEffect(() => {
    mobileTabRef.current = mobileTab;
    if (mobileTab === "Chat") setUnreadMessages(0);
  }, [mobileTab]);

  // ✅ FIX: cleanup toast timeout on unmount
  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) window.clearTimeout(toastTimeoutRef.current);
      if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  const showToast = (message) => {
    setToast(message);
    if (toastTimeoutRef.current) window.clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = window.setTimeout(() => setToast(""), 1800);
  };

  // WebSocket connection
  useEffect(() => {
    if (!token || !roomCode) return undefined;

    let reconnectTimer = null;
    let pingTimer = null;
    let attempts = 0;
    let closedByCleanup = false;
    const MAX_RECONNECTS = 6;

    const clearPing = () => {
      if (pingTimer) { window.clearInterval(pingTimer); pingTimer = null; }
    };

    const buildWsUrl = () => {
      // Always connect to the Railway backend, never to the Vite dev server.
      // On localhost, window.location.origin is the Vite port (5173) which does
      // NOT proxy WebSockets — this was causing WS to silently fail and the UI
      // to only update on manual refresh.
      const backendBase = api.defaults.baseURL || "https://clashofcode-production.up.railway.app";
      const normalizedBase = backendBase.replace(/\/$/, "").replace(/^http/i, "ws");
      return `${normalizedBase}/rooms/${encodeURIComponent(roomCode)}/ws?token=${encodeURIComponent(token)}`;
    };

    const connect = async () => {
      if (closedByCleanup) return;
      if (wsRef.current && [WebSocket.CONNECTING, WebSocket.OPEN].includes(wsRef.current.readyState)) {
        console.log("WS SKIP duplicate socket", wsRef.current.readyState);
        return;
      }

      // ✅ FIX: only join once, not on every reconnect
      if (!hasJoinedRef.current) {
        try {
          // Explicitly pass the current auth token to ensure the backend
          // authenticates the join request even if localStorage/interceptors
          // aren't populated yet (hot-reload / dev UX).
          await api.post("/rooms/join", { roomCode }, { headers: { Authorization: token ? `Bearer ${token}` : undefined } });
          hasJoinedRef.current = true;
        } catch (err) {
          setError(extractError(err, "Unable to join room before websocket connect."));
          console.log("WS JOIN FAILED", err);
          return;
        }
      }

      const wsUrl = buildWsUrl();
      console.log("WS CONNECT", wsUrl.replace(token, "[token]"));
      const socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onopen = () => {
        console.log("WS OPEN");
        attempts = 0;
        setError("");
        clearPing();
        pingTimer = window.setInterval(() => sendSocket({ event: "ping" }), 15000);

        // Fetch current room state immediately on connect.
        // The server broadcasts room_updated when a WS connects, but there is a
        // timing race where the second player connects after the battle has already
        // started and the broadcast was already sent to connected sockets only.
        // An HTTP fetch here guarantees the second player always gets the latest
        // room state (active, question, etc.) regardless of WS broadcast timing.
        api.get(`/rooms/${roomCode}`)
          .then((res) => { if (!closedByCleanup) setRoom(res.data); })
          .catch(() => {}); // WS will keep retrying; silently ignore HTTP fetch errors
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.event === "room_updated") {
            const previousMessages = chatSnapshotRef.current || [];
            const nextMessages = data.room?.chat_messages || [];

            if (mobileTabRef.current !== "Chat") {
              const previousKeys = new Set(previousMessages.map((item, index) => messageKey(item, index)));
              const newFromOthers = nextMessages.filter((item, index) => (
                !previousKeys.has(messageKey(item, index)) && item?.username !== currentUsernameRef.current
              ));
              if (newFromOthers.length) setUnreadMessages((prev) => prev + newFromOthers.length);
            }

            chatSnapshotRef.current = nextMessages;
            setRoom(data.room);

            // ✅ FIX: auto-start when all players are ready (host only, no duplicate calls)
            if (
              data.room?.status === "waiting" &&
              isHostRef.current &&
              !autoStartingRef.current
            ) {
              const players = data.room?.players || [];
              const allReady = players.length >= 2 && players.every((p) => p.status === "ready");
              if (allReady) {
                autoStartingRef.current = true;
                api.post(`/rooms/${roomCode}/start`)
                  .then((res) => setRoom(res.data))
                  .catch((err) => {
                    console.warn("Auto-start failed", err);
                    autoStartingRef.current = false; // allow retry on next update
                  });
              }
            }
          }
          if (data.event === "chat_error") setError(data.message || "Unable to send chat message.");
        } catch {
          // Ignore malformed socket packets.
        }
      };

      socket.onclose = (event) => {
        console.log("WS CLOSED", event.code, event.reason);
        clearPing();
        if (wsRef.current === socket) wsRef.current = null;
        if (closedByCleanup) return;
        if (attempts >= MAX_RECONNECTS) {
          setError("Realtime connection lost. Refresh the page to reconnect.");
          return;
        }
        const delay = Math.min(1000 * 2 ** attempts, 10000);
        attempts += 1;
        reconnectTimer = window.setTimeout(connect, delay);
      };

      socket.onerror = (event) => { console.log("WS ERROR", event); };
    };

    connect();
    return () => {
      closedByCleanup = true;
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      clearPing();
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [roomCode, sendSocket, token]);

  // Polling fallback: re-fetch room state every 3s when in waiting/active status.
  // This ensures the UI stays live even if the WebSocket broadcast is missed
  // (e.g. the host doesn't see Player 2 join until they manually refresh).
  // The poll is cheap and stops once the room is finished/expired.
  useEffect(() => {
    if (!roomCode) return undefined;
    const POLL_MS = 1500;
    let timer = null;

    const poll = () => {
      api.get(`/rooms/${roomCode}`)
        .then((res) => {
          const status = res.data?.status;
          // Replace room state with server truth, stripping any optimistic messages
          // that the server has now confirmed (server messages have real IDs).
          setRoom(res.data);
          if (status && !["finished", "expired"].includes(status)) {
            timer = window.setTimeout(poll, POLL_MS);
          }
        })
        .catch(() => {
          timer = window.setTimeout(poll, POLL_MS);
        });
    };

    timer = window.setTimeout(poll, POLL_MS);
    return () => { if (timer) window.clearTimeout(timer); };
  }, [roomCode]);

  // ✅ FIX: reset autoStartingRef when room status changes away from waiting
  useEffect(() => {
    if (room?.status !== "waiting") autoStartingRef.current = false;
  }, [room?.status]);

  const handleCodeChange = useCallback((value) => {
    setCode(value);
    sendSocket({ event: "typing", typing: true });
    if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = window.setTimeout(() => sendSocket({ event: "typing", typing: false }), 1200);
  }, [sendSocket]);

  const handleStart = async () => {
    setStarting(true);
    setError("");
    try {
      const response = await api.post(`/rooms/${roomCode}/start`);
      setRoom(response.data);
    } catch (err) {
      setError(extractError(err, "Unable to start battle."));
    } finally {
      setStarting(false);
    }
  };

  const handleFinish = async () => {
    setError("");
    try {
      const response = await api.post(`/rooms/${roomCode}/finish`);
      setRoom(response.data);
    } catch (err) {
      setError(extractError(err, "Unable to finish room."));
    }
  };

  const handleNext = async () => {
    setError("");
    try {
      const response = await api.post(`/rooms/${roomCode}/next`);
      setRoom(response.data);
    } catch (err) {
      setError(extractError(err, "Unable to advance to next question."));
    }
  };

  const runWithPyodide = (payload) => new Promise((resolve) => {
    workerRef.current.onmessage = (event) => resolve(event.data.result);
    workerRef.current.postMessage(payload);
  });

  // ✅ FIX: consistently use isLocked (was using `locked` in body but `isLocked` in deps)
  const handleRun = useCallback(async () => {
    if (isLocked) return;
    if (!code.trim()) { setError("Write some code before running."); return; }
    setRunning(true);
    setError("");
    sendSocket({ event: "run_code" });
    try {
      let result;
      if (language === "python" && workerRef.current) {
        result = await runWithPyodide({
          code,
          mode: customInput.trim() ? "stdin" : "cases",
          stdin: customInput,
          testCases: visibleCases,
        });
      } else {
        const response = await api.post("/execution/run", {
          code,
          language,
          stdin: customInput,
          test_cases: customInput.trim() ? [] : visibleCases,
        });
        result = response.data;
      }
      setRunResult(result);
      setConsoleTab(customInput.trim() ? "Console" : "Testcases");
    } catch (err) {
      setRunResult({ status: "Runtime Error", error: extractError(err, "Failed to run code."), stdout: "", stderr: "", passed: 0, total: 0, results: [] });
      setConsoleTab("Console");
    } finally {
      setRunning(false);
    }
  }, [code, customInput, language, isLocked, sendSocket, visibleCases]);

  // ✅ FIX: consistently use isLocked
  const handleSubmit = useCallback(async () => {
    if (isLocked) return;
    if (!code.trim()) { setError("Write some code before submitting."); return; }
    setSubmitting(true);
    setError("");
    try {
      const response = await api.post(`/rooms/${roomCode}/submit`, { code, language });
      setSubmitResult(response.data);
      setConsoleTab("Submissions");
      const updated = await api.get(`/rooms/${roomCode}`);
      setRoom(updated.data);
    } catch (err) {
      const message = extractError(err, "Submission failed.");
      setSubmitResult({ status: "Runtime Error", error: message, stdout: "", stderr: message, passed: 0, total: 0, results: [] });
      setConsoleTab("Submissions");
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }, [code, language, isLocked, roomCode]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      if (event.key === "Enter" && event.shiftKey) {
        event.preventDefault();
        handleSubmit();
      } else if (event.key === "Enter") {
        event.preventDefault();
        handleRun();
      } else if (event.key.toLowerCase() === "s") {
        event.preventDefault();
        localStorage.setItem(getDraftKey(roomCode, language), code);
        showToast("Draft saved");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [code, handleRun, handleSubmit, language, roomCode]);

  const handleEditorMount = useCallback((editor) => { editor.focus(); }, []);

  const resetCode = () => {
    setCode(room?.question?.starter_code || "");
    setRunResult(null);
    setSubmitResult(null);
  };

  const copyInvite = async () => {
    const url = `${window.location.origin}/battle-room/${roomCode}`;
    await navigator.clipboard.writeText(url);
    showToast("Invite link copied");
  };

  const handleSendChat = async (event) => {
    event.preventDefault();
    const message = chatDraft.trim();
    if (!message) return;
    setChatDraft("");

    // Optimistic UI: show message instantly for the sender
    const optimisticMsg = {
      id: `optimistic-${Date.now()}`,
      username: user?.username,
      message,
      created_at: new Date().toISOString(),
    };
    setRoom((prev) => prev ? {
      ...prev,
      chat_messages: [...(prev.chat_messages || []), optimisticMsg],
    } : prev);

    // Try WebSocket first (instant delivery to others if WS is connected)
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      sendSocket({ event: "chat_message", message });
    }

    // Always also POST via HTTP — this is the reliable path that persists the
    // message server-side and triggers a broadcast to all WS clients.
    // If WS is broken, HTTP is the only way the message reaches others.
    try {
      await api.post(`/rooms/${roomCode}/chat`, { message });
    } catch (err) {
      // If HTTP also fails, show an error but keep the optimistic message visible
      setError(extractError(err, "Failed to send message."));
    }
  };

  const startResize = (side, event) => {
    event.preventDefault();
    const startX = event.clientX;
    const initial = { ...columns };
    const onMove = (moveEvent) => {
      const delta = ((moveEvent.clientX - startX) / window.innerWidth) * 100;
      setColumns((current) => ({
        left: side === "left" ? Math.min(48, Math.max(22, initial.left + delta)) : current.left,
        right: side === "right" ? Math.min(30, Math.max(14, initial.right - delta)) : current.right,
      }));
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  if (loading) {
    return (
      <section className="page-shell">
        <div className="page-container battle-room">
          <div className="skeleton loading-slab loading-slab--banner" />
          <div className="battle-room__workspace">
            <div className="skeleton loading-slab loading-slab--panel" />
            <div className="skeleton loading-slab loading-slab--panel" />
          </div>
        </div>
      </section>
    );
  }

  const roomStatus = room?.status || "waiting";
  const difficultyLabel = DIFF_LABELS[room?.difficulty] || room?.difficulty || "Open";
  const showProblem = !focusMode.problem;
  const showSidebar = !focusMode.sidebar;
  const showConsole = !focusMode.console;
  const gridStyle = {
    "--battle-left": showProblem ? `${columns.left}%` : "0px",
    "--battle-right": showSidebar ? `${columns.right}%` : "0px",
  };

  return (
    <section className="page-shell page-enter">
      <div className="page-container battle-room battle-room--pro">
        <Card className="battle-room__topbar">
          <div className="battle-room__topbar-row">
            <div className="battle-room__headline">
              <div>
                <p className="label-text">Battle Room</p>
                <h1 className="battle-room__title">{room?.question?.title || "Battle Workspace"}</h1>
              </div>
              <button type="button" className="battle-room__room-code" onClick={copyInvite}>
                #{roomCode} · Copy invite
              </button>
            </div>

            <div className="battle-room__status-strip">
              <div className="battle-room__status-card battle-room__status-card--timer">
                <span className="battle-room__status-label">{roomStatus === "finished" ? "Battle" : "Time Left"}</span>
                {roomStatus === "active"
                  ? <CountdownTimer room={room} />
                  : <strong>{roomStatus === "finished" ? "Time Up" : "--:--"}</strong>}
              </div>
              <div className="battle-room__status-card"><span className="battle-room__status-label">Status</span><strong>{roomStatus}</strong></div>
              <div className="battle-room__status-card"><span className="battle-room__status-label">Difficulty</span><strong>{difficultyLabel}</strong></div>
              <div className="battle-room__status-card"><span className="battle-room__status-label">Host</span><strong>{room?.host}</strong></div>
            </div>
          </div>
        </Card>

        {toast && <div className="battle-room__toast">{toast}</div>}
        {error && <div className="room-error" role="alert">{error}</div>}

        {room?.status === "waiting" ? (
          <Card className="battle-room__waiting-panel">
            <div className="battle-room__waiting-copy">
              <p className="label-text">Lobby</p>
              <h2>{isHost ? "Start when everyone is ready" : "Waiting for host"}</h2>
              <p className="section-subtitle">The competitive coding workspace opens once the battle starts.</p>
              <div className="battle-room__chip-row">
                <span className="battle-room__chip battle-room__chip--ghost">
                  Room access: {room?.matchmaking === "open" ? "Global Matchmaking" : "Invite Only"}
                </span>
              </div>
            </div>

            <div className="battle-room__waiting-actions">
              <span className="battle-room__chip battle-room__chip--ghost">{room?.players?.length ?? 0} players</span>

              {/* ✅ FIX: BOTH host and non-host get a Ready button */}
              <Button
                onClick={handleReadyClick}
                disabled={readying || amReady}
                size="lg"
                variant={amReady ? "secondary" : "primary"}
              >
                {readying ? "Marking ready..." : amReady ? "✓ Ready" : "Ready"}
              </Button>

              {/* ✅ Host can also manually start at any time */}
              {isHost && (
                <Button onClick={handleStart} disabled={starting} size="lg" variant="secondary">
                  {starting ? "Starting..." : "Start Now"}
                </Button>
              )}
            </div>

            <Leaderboard players={room?.players} currentUsername={user?.username} host={room?.host} />
          </Card>
        ) : (
          <>
            {room?.status === "finished" && showLeaderboard && (
              <div className="battle-room__finished-overlay">
                <Card className="battle-room__finished-panel">
                  <div className="battle-room__finished-header">
                    <div><p className="label-text">Final leaderboard</p><h2>Results</h2></div>
                  </div>
                  <Leaderboard players={room?.players} currentUsername={user?.username} host={room?.host} />
                  <div className="battle-room__finished-actions">
                    <Button onClick={() => setShowLeaderboard(false)} size="sm" variant="secondary">Close</Button>
                    <Button onClick={() => navigate("/dashboard")} size="sm">Return to Dashboard</Button>
                  </div>
                </Card>
              </div>
            )}

            {room?.status === "round_finished" && (
              <div className="battle-room__finished-overlay">
                <Card className="battle-room__finished-panel">
                  <div className="battle-room__finished-header">
                    <div><p className="label-text">Round results</p><h2>Round complete</h2></div>
                  </div>
                  <Leaderboard players={room?.players} currentUsername={user?.username} host={room?.host} />
                  <div className="battle-room__finished-actions">
                    {isHost ? (
                      <>
                        <Button onClick={handleNext} size="sm" variant="secondary">Next Question</Button>
                        <Button onClick={handleFinish} size="sm">Finish</Button>
                      </>
                    ) : (
                      <Button size="sm" variant="secondary" disabled>Waiting for host</Button>
                    )}
                  </div>
                </Card>
              </div>
            )}

            {room?.all_questions_finished && (
              <div className="battle-room__all-done-overlay">
                <Card className="battle-room__all-done-panel">
                  <div className="battle-room__finished-header">
                    <div><p className="label-text">All Questions Finished</p><h2>No more questions</h2></div>
                  </div>
                  <p className="muted-text">All questions for this difficulty have been used. Click Finish to finalize.</p>
                  <div className="battle-room__finished-actions">
                    {isHost
                      ? <Button onClick={handleFinish} size="sm">Finish</Button>
                      : <Button size="sm" variant="secondary" disabled>Waiting for host</Button>}
                    <Button onClick={() => navigate("/dashboard")} size="sm" variant="secondary">Leave</Button>
                  </div>
                </Card>
              </div>
            )}

            <div className="battle-room__mobile-tabs" role="tablist" aria-label="Battle workspace">
              {MOBILE_TABS.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  className={mobileTab === tab ? "is-active" : ""}
                  onClick={() => setMobileTab(tab)}
                >
                  {tab}
                  {tab === "Chat" && unreadMessages > 0 && (
                    <span className="battle-room__tab-badge">{unreadMessages}</span>
                  )}
                </button>
              ))}
            </div>

            <div className="battle-room__workspace battle-room__workspace--pro" style={gridStyle}>
              {showProblem && (
                <Card className={`battle-room__problem-panel battle-room__leetcode-card battle-room__mobile-pane ${mobileTab === "Problem" ? "is-active" : ""}`}>
                  <ProblemPane question={room?.question} difficulty={room?.difficulty} active={problemTab} onTab={setProblemTab} />
                </Card>
              )}
              {showProblem && (
                <button
                  type="button"
                  className="battle-room__resize-handle battle-room__resize-handle--left"
                  onPointerDown={(event) => startResize("left", event)}
                  aria-label="Resize problem panel"
                />
              )}

              <Card className={`battle-room__editor-panel battle-room__leetcode-card battle-room__mobile-pane ${mobileTab === "Code" || mobileTab === "Console" ? "is-active" : ""}`}>
                <div className="battle-room__editor-top battle-room__editor-top--leetcode">
                  <div className="battle-room__editor-heading">
                    <span className="battle-room__panel-tab battle-room__panel-tab--active">Code</span>
                    <StatusPill status={isLocked ? (myPlayer?.status === "time_up" ? "Time Up" : "Locked") : "Editing"} />
                  </div>
                  <div className="battle-room__editor-controls">
                    <select value={language} onChange={(event) => setLanguage(event.target.value)} className="battle-room__language-select" aria-label="Language">
                      {Object.entries(LANGUAGE_META).map(([value, meta]) => <option key={value} value={value}>{meta.label}</option>)}
                    </select>
                    <Button onClick={resetCode} disabled={isLocked} size="sm" variant="secondary">Reset</Button>
                    <Button onClick={() => setFocusMode((current) => ({ ...current, problem: !current.problem }))} size="sm" variant="secondary">
                      {focusMode.problem ? "Show Problem" : "Focus"}
                    </Button>
                    <Button onClick={handleRun} disabled={running || isLocked} size="sm" variant="secondary">
                      {running ? "Running..." : "Run Code"}
                    </Button>
                    <Button onClick={handleSubmit} disabled={submitting || isLocked} size="sm">
                      {submitting ? "Submitting..." : "Submit"}
                    </Button>
                  </div>
                </div>

                <div className={`battle-room__editor-console-grid ${showConsole ? "" : "battle-room__editor-console-grid--no-console"}`}>
                  <div className={`battle-room__code-pane battle-room__mobile-pane ${mobileTab === "Code" ? "is-active" : ""}`}>
                    <MonacoCodeEditor code={code} language={language} locked={isLocked} onChange={handleCodeChange} onMount={handleEditorMount} />
                  </div>
                  {showConsole && (
                    <div className={`battle-room__mobile-pane ${mobileTab === "Console" ? "is-active" : ""}`}>
                      <ConsolePane
                        active={consoleTab}
                        onActive={setConsoleTab}
                        runResult={runResult}
                        submitResult={submitResult}
                        running={running}
                        customInput={customInput}
                        onCustomInput={setCustomInput}
                        onClear={() => { setRunResult(null); setSubmitResult(null); }}
                        cases={visibleCases}
                        selectedCase={selectedCase}
                        onSelectCase={setSelectedCase}
                      />
                    </div>
                  )}
                </div>
              </Card>

              {showSidebar && (
                <button
                  type="button"
                  className="battle-room__resize-handle battle-room__resize-handle--right"
                  onPointerDown={(event) => startResize("right", event)}
                  aria-label="Resize sidebar"
                />
              )}
              {showSidebar && (
                <aside className={`battle-room__right-column battle-room__mobile-pane ${mobileTab === "Players" || mobileTab === "Chat" ? "is-active" : ""}`}>
                  <Card className="battle-room__dock-card battle-room__leetcode-card">
                    <div className="battle-room__dock-header">
                      <div><p className="label-text">Leaderboard</p><h3>Live battle</h3></div>
                    </div>
                    <Leaderboard players={room?.players} currentUsername={user?.username} host={room?.host} />
                  </Card>

                  <Card className="battle-room__dock-card battle-room__leetcode-card">
                    <div className="battle-room__dock-header"><div><p className="label-text">Submissions</p><h3>History</h3></div></div>
                    <SubmissionHistory submissions={submissions} />
                  </Card>

                  <Card className="battle-room__dock-card battle-room__leetcode-card">
                    <div className="battle-room__dock-header"><div><p className="label-text">Chat</p><h3>Room messages</h3></div></div>
                    <ChatPanel
                      messages={room?.chat_messages}
                      currentUsername={user?.username}
                      draft={chatDraft}
                      onDraft={setChatDraft}
                      onSend={handleSendChat}
                    />
                  </Card>

                  <Card className="battle-room__dock-card battle-room__leetcode-card">
                    <div className="battle-room__dock-header"><div><p className="label-text">Events</p><h3>Battle feed</h3></div></div>
                    <EventFeed events={room?.events} />
                  </Card>
                </aside>
              )}
            </div>

            {(!showSidebar || !showConsole || !showProblem) && (
              <div className="battle-room__focus-restore">
                {!showProblem && <button type="button" onClick={() => setFocusMode((current) => ({ ...current, problem: false }))}>Show Problem</button>}
                {!showConsole && <button type="button" onClick={() => setFocusMode((current) => ({ ...current, console: false }))}>Show Console</button>}
                {!showSidebar && <button type="button" onClick={() => setFocusMode((current) => ({ ...current, sidebar: false }))}>Show Players</button>}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

export default BattleRoom;