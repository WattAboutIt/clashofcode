import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";

import api from "../api/axios";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import { useAuth } from "../context/AuthContext";
// Removed module worker import; will instantiate classic worker manually.
import "../styles/room.css";

const DIFF_LABELS = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

function CountdownTimer({ startedAt, limitMinutes }) {
  const [remaining, setRemaining] = useState("");

  useEffect(() => {
    if (!startedAt) return undefined;
    const end = new Date(startedAt).getTime() + limitMinutes * 60 * 1000;
    const tick = () => {
      const diff = end - Date.now();
      if (diff <= 0) {
        setRemaining("00:00");
        return;
      }
      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setRemaining(`${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt, limitMinutes]);

  return <span className="battle-room__timer">{remaining || "--:--"}</span>;
}

function ProblemSection({ title, children, aside = null }) {
  return (
    <section className="battle-room__section">
      <div className="battle-room__section-header">
        <h3>{title}</h3>
        {aside}
      </div>
      <div className="battle-room__section-body">{children}</div>
    </section>
  );
}

function QuestionPanel({ question, difficulty }) {
  if (!question) return null;

  return (
    <div className="battle-room__problem-shell">
      <div className="battle-room__panel-tabs" aria-hidden="true">
        <span className="battle-room__panel-tab battle-room__panel-tab--active">Description</span>
        <span className="battle-room__panel-tab">Examples</span>
        <span className="battle-room__panel-tab">Constraints</span>
      </div>

      <div className="battle-room__problem-scroll">
        <div className="battle-room__problem-header">
          <div>
            <p className="label-text">Problem</p>
            <h2 className="battle-room__problem-title">{question.title}</h2>
          </div>
          <div className="battle-room__chip-row">
            <span className="battle-room__chip battle-room__chip--difficulty">
              {DIFF_LABELS[difficulty] || difficulty}
            </span>
            <span className="battle-room__chip battle-room__chip--points">
              {question.points} pts
            </span>
          </div>
        </div>

        <ProblemSection title="Description">
          <div className="battle-room__copy">
            {question.description}
          </div>
        </ProblemSection>

        {question.examples?.length > 0 && (
          <ProblemSection
            title="Examples"
            aside={<span className="battle-room__section-count">{question.examples.length} sample cases</span>}
          >
            <div className="battle-room__example-grid">
              {question.examples.map((example, index) => (
                <article key={`${question.id}-${index}`} className="battle-room__example-card">
                  <div className="battle-room__example-head">
                    <span className="battle-room__example-index">Example {index + 1}</span>
                  </div>
                  <p><strong>Input:</strong> <span className="font-mono">{example.input}</span></p>
                  <p><strong>Output:</strong> <span className="font-mono">{example.output}</span></p>
                  {example.explanation && <p className="muted-text">{example.explanation}</p>}
                </article>
              ))}
            </div>
          </ProblemSection>
        )}

        {question.constraints && (
          <ProblemSection title="Constraints">
            <div className="battle-room__constraint-box">
              {question.constraints}
            </div>
          </ProblemSection>
        )}
      </div>
    </div>
  );
}

function CodeEditor({ value, onChange, language = "python" }) {
  const extension = language === "python" ? "py" : language === "javascript" ? "js" : language === "java" ? "java" : "cpp";
  const gutterRef = useRef(null);
  const lineCount = Math.max(value.split("\n").length, 18);
  const lines = Array.from({ length: lineCount }, (_, index) => index + 1);

  const syncScroll = (event) => {
    if (gutterRef.current) {
      gutterRef.current.scrollTop = event.target.scrollTop;
    }
  };

  return (
    <div className="battle-room__editor-shell">
      <div className="battle-room__editor-bar">
        <div className="battle-room__editor-file">
          <span className="battle-room__editor-pill">{language}</span>
          <span className="battle-room__editor-name">solution.{extension}</span>
        </div>
        <span className="battle-room__editor-state">Editing</span>
      </div>

      <div className="battle-room__editor-body">
        <div ref={gutterRef} className="battle-room__editor-gutter" aria-hidden="true">
          {lines.map((line) => (
            <span key={line} className="battle-room__editor-line">{line}</span>
          ))}
        </div>
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onScroll={syncScroll}
          spellCheck={false}
          className="battle-room__editor-textarea"
          placeholder={`# Write your ${language} solution here...\n`}
        />
      </div>
    </div>
  );
}

function PlayerRow({ player, isMe, host }) {
  const isHost = player.username === host;

  return (
    <div className={`battle-room__player ${isMe ? "battle-room__player--me" : ""}`}>
      <div className="battle-room__player-main">
        <div className="battle-room__player-avatar">{player.username.slice(0, 2).toUpperCase()}</div>
        <div className="battle-room__player-meta">
          <p>
            <strong>{player.username}</strong>
            {isHost && <span className="battle-room__player-tag">Host</span>}
            {isMe && <span className="battle-room__player-you">you</span>}
          </p>
          <p className="muted-text">{player.status}</p>
        </div>
      </div>
      <span className="battle-room__player-score">
        {player.status === "submitted" ? `${player.score} pts` : player.status}
      </span>
    </div>
  );
}

function ResultCard({ title, success, results, score, error, type = "test" }) {
  if (!results && !error && !title) return null;

  const isAccepted = success || (results && results.every(r => r.passed) && results.length > 0);
  const statusLabel = error ? "Runtime Error" : isAccepted ? "Accepted" : "Wrong Answer";
  const statusColor = error ? "text-red-500" : isAccepted ? "text-green-500" : "text-orange-500";
  const bgColor = error ? "bg-red-50 dark:bg-red-900/10" : isAccepted ? "bg-green-50 dark:bg-green-900/10" : "bg-orange-50 dark:bg-orange-900/10";
  const borderColor = error ? "border-red-200" : isAccepted ? "border-green-200" : "border-orange-200";

  return (
    <div className={`battle-room__result-container ${bgColor} ${borderColor} border rounded-2xl p-6 mb-4 animate-in fade-in slide-in-from-bottom-4 duration-500`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground block mb-1">
            {type === "submit" ? "Submission Result" : "Test Result"}
          </span>
          <h2 className={`text-2xl font-black ${statusColor} italic uppercase`}>{statusLabel}</h2>
        </div>
        {score !== undefined && (
          <div className="text-right">
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground block mb-1">Score Earned</span>
            <span className="text-2xl font-black text-amber-500">{score} pts</span>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 p-4 bg-white/50 dark:bg-black/20 rounded-xl border border-red-100 font-mono text-sm overflow-auto max-h-40">
          <p className="text-red-600 font-bold mb-1">Error Message:</p>
          <pre className="whitespace-pre-wrap">{error}</pre>
        </div>
      )}

      {results && results.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden flex">
              {results.map((r, i) => (
                <div 
                  key={i} 
                  className={`h-full ${r.passed ? 'bg-green-500' : 'bg-red-500'} border-r border-white/20`}
                  style={{ width: `${100 / results.length}%` }}
                />
              ))}
            </div>
            <span className="text-sm font-bold whitespace-nowrap">
              {results.filter(r => r.passed).length} / {results.length} Passed
            </span>
          </div>

          <div className="grid gap-3 mt-4">
            {results.map((res, idx) => {
              const isPassed = res.passed === true || res.status === "passed";
              return (
                <div key={idx} className="bg-white/40 dark:bg-black/10 rounded-xl p-4 border border-white/20">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-sm">Test Case {idx + 1}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${isPassed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {isPassed ? "Passed" : "Failed"}
                    </span>
                  </div>
                  {!isPassed && (
                    <div className="grid grid-cols-2 gap-4 mt-3 text-[11px] font-mono">
                      <div>
                        <span className="text-muted-foreground block mb-1">Expected</span>
                        <pre className="p-2 bg-black/5 dark:bg-white/5 rounded overflow-auto">{res.expected || "N/A"}</pre>
                      </div>
                      <div>
                        <span className="text-muted-foreground block mb-1">Actual</span>
                        <pre className="p-2 bg-black/5 dark:bg-white/5 rounded overflow-auto">{res.actual || res.error || "N/A"}</pre>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function BattleRoom() {
  const { roomCode } = useParams();
  const { user, token } = useAuth();
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState(null);
  const [language, setLanguage] = useState("python");
  const [running, setRunning] = useState(false);
  const [runOutput, setRunOutput] = useState(null);
  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState(null);
  const previousQuestionId = useRef(null);
  const workerRef = useRef(null);

  useEffect(() => {
    try {
      // Use standard Worker instantiation for better compatibility with Vite in production
      workerRef.current = new Worker(
        new URL("../utils/pyodideWorker.js", import.meta.url),
        { type: "classic" }
      );
    } catch (err) {
      console.error("Worker initialization failed", err);
      setError("Failed to initialize Python environment. Please refresh.");
    }

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  useEffect(() => {
    api.get(`/rooms/${roomCode}`)
      .then((response) => setRoom(response.data))
      .catch(() => setError("Unable to load room. Please check the room code."))
      .finally(() => setLoading(false));
  }, [roomCode]);

  useEffect(() => {
    const nextId = room?.question?.id;
    if (nextId && previousQuestionId.current !== nextId) {
      setCode(room?.question?.starter_code || "");
      previousQuestionId.current = nextId;
    }
  }, [room?.question]);

  useEffect(() => {
    if (!token || !roomCode) return undefined;

    let ws = null;
    let reconnectTimeout = null;
    let attempts = 0;
    const MAX_ATTEMPTS = 5;

    const connect = () => {
      if (attempts >= MAX_ATTEMPTS) {
        setError("Connection lost. Please refresh the page to reconnect.");
        return;
      }

      const baseUrl = api.defaults.baseURL || window.location.origin;
      const wsUrl = baseUrl.replace(/^http/, "ws") + `/rooms/${roomCode}/ws?token=${token}`;

      console.log(`Connecting to WebSocket: ${wsUrl} (Attempt ${attempts + 1})`);
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log("WebSocket connected");
        attempts = 0;
        setError(""); // Clear any connection errors
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.event === "room_updated") {
            setRoom(data.room);
          }
        } catch (err) {
          console.error("WS Parse Error", err);
        }
      };

      ws.onclose = (e) => {
        console.log(`WebSocket closed (Code: ${e.code}, Reason: ${e.reason || 'None'})`);
        if (attempts < MAX_ATTEMPTS) {
          const delay = Math.min(1000 * Math.pow(2, attempts), 10000);
          reconnectTimeout = setTimeout(() => {
            attempts++;
            connect();
          }, delay);
        }
      };

      ws.onerror = (err) => {
        console.error("WebSocket error", err);
        ws.close();
      };
    };

    connect();

    // Auto-join room when socket connects (handled by backend usually, but ensuring local state)
    api.post("/rooms/join", { roomCode }).catch(err => {
      console.error("Join error", err);
      if (err.response?.status === 401) {
        setError("Unauthorized. Please login again.");
      }
    });

    return () => {
      if (ws) ws.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [roomCode, token]);

  const isHost = useMemo(() => room?.host === user?.username, [room, user]);
  const myPlayer = useMemo(() => room?.players?.find((player) => player.username === user?.username), [room, user]);

  const handleStart = async () => {
    setStarting(true);
    setError("");
    try {
      const response = await api.post(`/rooms/${roomCode}/start`);
      setRoom(response.data);
      setSubmissionResult(null);
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.message || "Unable to start the game right now.";
      setError(typeof msg === 'object' ? JSON.stringify(msg) : msg);
    } finally {
      setStarting(false);
    }
  };

  const handleSubmit = async () => {
    if (!code.trim()) {
      setError("Write some code before submitting.");
      return;
    }
    setSubmitting(true);
    setError("");
    setRunOutput(null);
    setTestResults(null);
    setSubmissionResult(null);

    if (language === "python" && workerRef.current) {
      workerRef.current.onmessage = async (e) => {
        const { type, result } = e.data;
        if (type === "DONE") {
          if (result.error) {
            setSubmissionResult({ passed: false, error: result.error, score: 0 });
            setSubmitting(false);
          } else {
            const payload = {
              code,
              language,
              score: result.passed ? room.question.points : 0
            };
            try {
              // Assume backend submit_solution is updated to accept the score
              const response = await api.post(`/rooms/${roomCode}/submit`, payload);
              const combinedResult = {
                ...response.data,
                passed: result.passed,
                test_results: result.test_results,
                score: payload.score
              };
              setSubmissionResult(combinedResult);
              const updated = await api.get(`/rooms/${roomCode}`);
              setRoom(updated.data);
            } catch (err) {
              const msg = err?.response?.data?.detail || err?.message || "Submission failed.";
              setError(typeof msg === 'object' ? JSON.stringify(msg) : msg);
            } finally {
              setSubmitting(false);
            }
          }
        }
      };

      workerRef.current.postMessage({
        code,
        testCases: room?.question?.test_cases || []
      });
    } else {
      try {
        const response = await api.post(`/rooms/${roomCode}/submit`, { code, language });
        setSubmissionResult(response.data);
        const updated = await api.get(`/rooms/${roomCode}`);
        setRoom(updated.data);
      } catch (err) {
        const msg = err?.response?.data?.detail || err?.message || "Submission failed.";
        setError(typeof msg === 'object' ? JSON.stringify(msg) : msg);
      } finally {
        setSubmitting(false);
      }
    }
  };

  const handleRun = async () => {
    if (!code.trim()) {
      setError("Write some code before running.");
      return;
    }
    setRunning(true);
    setError("");
    setRunOutput(null);
    setTestResults(null); // Clear other results
    setSubmissionResult(null);

    try {
      const response = await api.post("/execution/run", { code });
      setRunOutput(response.data);
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.message || "Failed to run code.";
      setError(typeof msg === 'object' ? JSON.stringify(msg) : msg);
    } finally {
      setRunning(false);
    }
  };

  const handleTest = async () => {
    if (!code.trim()) {
      setError("Write some code before testing.");
      return;
    }

    // Only Python can be tested with the backend judge
    if (language !== "python") {
      setError("Testing is only available for Python.");
      return;
    }

    setTesting(true);
    setError("");
    setRunOutput(null);
    setTestResults(null);
    setSubmissionResult(null);

    try {
      const testCases = (room?.question?.test_cases || []).map((tc) => ({
        input: tc.input || "",
        expected_output: tc.expected_output || tc.output || ""
      }));

      const response = await api.post("/execution/evaluate", {
        code,
        test_cases: testCases,
        problem_title: room?.question?.title || "Unknown",
        problem_description: room?.question?.description || ""
      });

      setTestResults(response.data);
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.message || "Failed to test code.";
      setError(typeof msg === 'object' ? JSON.stringify(msg) : msg);
    } finally {
      setTesting(false);
    }
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

  const questionTitle = room?.question?.title || "Battle Workspace";
  const roomStatus = room?.status || "waiting";
  const difficultyLabel = DIFF_LABELS[room?.difficulty] || room?.difficulty || "Open";

  return (
    <section className="page-shell page-enter">
      <div className="page-container battle-room">
        <Card className="battle-room__topbar">
          <div className="battle-room__topbar-row">
            <div className="battle-room__headline">
              <div>
                <p className="label-text">Battle Room</p>
                <h1 className="battle-room__title">{questionTitle}</h1>
              </div>
              <span className="battle-room__room-code">#{roomCode}</span>
            </div>

            <div className="battle-room__status-strip">
              {room?.status === "active" && room?.started_at && (
                <div className="battle-room__status-card battle-room__status-card--timer">
                  <span className="battle-room__status-label">Time Left</span>
                  <CountdownTimer startedAt={room.started_at} limitMinutes={room.time_limit_minutes} />
                </div>
              )}
              <div className="battle-room__status-card">
                <span className="battle-room__status-label">Status</span>
                <strong>{roomStatus}</strong>
              </div>
              <div className="battle-room__status-card">
                <span className="battle-room__status-label">Difficulty</span>
                <strong>{difficultyLabel}</strong>
              </div>
              <div className="battle-room__status-card">
                <span className="battle-room__status-label">Host</span>
                <strong>{room?.host}</strong>
              </div>
            </div>
          </div>
        </Card>

        {error && <div className="room-error">{error}</div>}

        {room?.status === "waiting" ? (
          <Card className="battle-room__waiting-panel">
            <div className="battle-room__waiting-copy">
              <p className="label-text">Lobby</p>
              <h2>{isHost ? "Start the battle when everyone is ready" : "Waiting for the host to start"}</h2>
              <p className="section-subtitle">
                {isHost
                  ? "This room is ready. Launch the challenge to open the coding workspace."
                  : "The LeetCode-style coding workspace will appear as soon as the host starts the match."}
              </p>
            </div>
            <div className="battle-room__waiting-actions">
              <span className="battle-room__chip battle-room__chip--ghost">
                {room?.players?.length ?? 0} players in lobby
              </span>
              {isHost && (
                <Button onClick={handleStart} disabled={starting} size="lg">
                  {starting ? "Starting..." : "Start Battle"}
                </Button>
              )}
            </div>
          </Card>
        ) : (
          <div className="battle-room__workspace">
            <div className="battle-room__left-column">
              <Card className="battle-room__problem-panel">
                <QuestionPanel question={room?.question} difficulty={room?.difficulty} />
              </Card>

              <Card className="battle-room__editor-panel">
                <div className="battle-room__editor-top">
                  <div>
                    <p className="label-text">Code</p>
                    <h2 className="battle-room__editor-title">Submit your solution</h2>
                  </div>

                  <div className="battle-room__editor-controls">
                    <span className="battle-room__chip battle-room__chip--ghost">
                      {myPlayer?.status === "submitted" ? "Submitted" : "In progress"}
                    </span>
                    <select
                      value={language}
                      onChange={(event) => setLanguage(event.target.value)}
                      className="battle-room__language-select"
                    >
                      <option value="python">Python</option>
                      <option value="javascript">JavaScript</option>
                      <option value="java">Java</option>
                      <option value="cpp">C++</option>
                    </select>
                    <Button
                      onClick={handleRun}
                      disabled={running || language !== "python"}
                      size="sm"
                      variant="secondary"
                    >
                      {running ? "Running..." : "Run"}
                    </Button>
                    <Button
                      onClick={handleTest}
                      disabled={testing || language !== "python"}
                      size="sm"
                      variant="secondary"
                    >
                      {testing ? "Testing..." : "Test"}
                    </Button>
                    <Button
                      onClick={handleSubmit}
                      disabled={submitting || myPlayer?.status === "submitted"}
                      size="sm"
                    >
                      {submitting ? "Submitting..." : myPlayer?.status === "submitted" ? "Submitted" : "Submit"}
                    </Button>
                  </div>
                </div>

                <CodeEditor value={code} onChange={setCode} language={language} />

                {runOutput && (
                  <ResultCard 
                    type="test"
                    title="Code Execution"
                    success={!runOutput.error}
                    error={runOutput.error}
                    results={runOutput.output ? [{ name: "Stdout", passed: true, actual: runOutput.output }] : []}
                  />
                )}

                <ResultCard 
                  type="test"
                  title="Test Results"
                  success={testResults?.success}
                  results={testResults?.results}
                  error={testResults?.error}
                />

                <ResultCard 
                  type="submit"
                  title="Submission Accepted"
                  success={submissionResult?.passed}
                  results={submissionResult?.test_results}
                  score={submissionResult?.score}
                  error={submissionResult?.error}
                />
              </Card>
            </div>

            <div className="battle-room__right-column">
              <Card className="battle-room__dock-card">
                <div className="battle-room__dock-header">
                  <div>
                    <p className="label-text">Match Info</p>
                    <h3>Battle details</h3>
                  </div>
                </div>
                <div className="battle-room__info-list">
                  {[
                    { label: "Room Code", value: roomCode },
                    { label: "Time Limit", value: `${room?.time_limit_minutes ?? 0} min` },
                    { label: "Difficulty", value: difficultyLabel },
                    { label: "Points", value: room?.question?.points ?? "—" },
                  ].map((row) => (
                    <div key={row.label} className="battle-room__info-row">
                      <span className="muted-text">{row.label}</span>
                      <strong>{row.value}</strong>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="battle-room__dock-card">
                <div className="battle-room__dock-header">
                  <div>
                    <p className="label-text">Participants</p>
                    <h3>{room?.players?.length ?? 0} coders</h3>
                  </div>
                </div>

                <div className="battle-room__player-list">
                  {room?.players?.length ? (
                    room.players.map((player) => (
                      <PlayerRow
                        key={player.username}
                        player={player}
                        isMe={player.username === user?.username}
                        host={room.host}
                      />
                    ))
                  ) : (
                    <div className="room-empty">
                      <p>Waiting for players to join...</p>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default BattleRoom;
