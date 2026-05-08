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

const PROBLEM_TABS = ["Description", "Examples", "Constraints"];

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
  const [activeTab, setActiveTab] = useState("Description");

  if (!question) return null;

  const hasExamples = question.examples?.length > 0;
  const tabContent = {
    Description: (
      <ProblemSection title="Description">
        <div className="battle-room__copy">
          {question.description}
        </div>
      </ProblemSection>
    ),
    Examples: hasExamples ? (
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
    ) : (
      <div className="room-empty">No examples were provided for this challenge.</div>
    ),
    Constraints: question.constraints ? (
      <ProblemSection title="Constraints">
        <div className="battle-room__constraint-box">
          {question.constraints}
        </div>
      </ProblemSection>
    ) : (
      <div className="room-empty">No explicit constraints were provided.</div>
    ),
  };

  return (
    <div className="battle-room__problem-shell">
      <div className="battle-room__panel-tabs" role="tablist" aria-label="Problem details">
        {PROBLEM_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            className={`battle-room__panel-tab ${activeTab === tab ? "battle-room__panel-tab--active" : ""}`}
            onClick={() => setActiveTab(tab)}
            role="tab"
            aria-selected={activeTab === tab}
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
            <span className="battle-room__chip battle-room__chip--difficulty">
              {DIFF_LABELS[difficulty] || difficulty}
            </span>
            <span className="battle-room__chip battle-room__chip--points">
              {question.points} pts
            </span>
          </div>
        </div>

        {tabContent[activeTab]}
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

function ConsoleTabs({ runOutput, testResults, submissionResult, question }) {
  const [activeTab, setActiveTab] = useState("Testcase");
  const tabs = ["Testcase", "Run", "Test Result", "Submission"];
  const latestResults = testResults?.results || submissionResult?.test_results || [];
  const sampleCases = question?.examples || [];
  const runRows = runOutput?.output ? [{ passed: true, actual: runOutput.output }] : [];

  const panel = {
    Testcase: latestResults.length ? (
      <ResultCard
        type="test"
        title="Latest cases"
        success={latestResults.every((result) => result.passed || result.status === "passed")}
        results={latestResults}
      />
    ) : sampleCases.length ? (
      <div className="battle-room__sample-list">
        {sampleCases.map((example, index) => (
          <div key={`${question?.id || "sample"}-${index}`} className="battle-room__sample-card">
            <div className="battle-room__case-card-head">
              <span>Case {index + 1}</span>
              <span className="battle-room__case-badge">Sample</span>
            </div>
            <div className="battle-room__case-diff">
              <div>
                <span>Input</span>
                <pre>{example.input || "N/A"}</pre>
              </div>
              <div>
                <span>Expected</span>
                <pre>{example.output || "N/A"}</pre>
              </div>
            </div>
          </div>
        ))}
      </div>
    ) : (
      <div className="battle-room__console-empty">
        Run tests to see case-by-case input, expected output, and actual output here.
      </div>
    ),
    Run: runOutput ? (
      <ResultCard
        type="test"
        title="Code Execution"
        success={!runOutput.error}
        error={runOutput.error}
        results={runRows}
      />
    ) : (
      <div className="battle-room__console-empty">
        Use Run for a quick Python execution check.
      </div>
    ),
    "Test Result": testResults ? (
      <ResultCard
        type="test"
        title="Test Results"
        success={testResults?.success}
        results={testResults?.results}
        error={testResults?.error}
      />
    ) : (
      <div className="battle-room__console-empty">
        Use Test to judge your code against the challenge test cases.
      </div>
    ),
    Submission: submissionResult ? (
      <ResultCard
        type="submit"
        title="Submission Accepted"
        success={submissionResult?.passed}
        results={submissionResult?.test_results}
        score={submissionResult?.score}
        error={submissionResult?.error}
      />
    ) : (
      <div className="battle-room__console-empty">
        Submit when you are ready to lock your battle score.
      </div>
    ),
  };

  return (
    <div className="battle-room__console">
      <div className="battle-room__console-tabs" role="tablist" aria-label="Code console">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            className={`battle-room__console-tab ${activeTab === tab ? "battle-room__console-tab--active" : ""}`}
            onClick={() => setActiveTab(tab)}
            role="tab"
            aria-selected={activeTab === tab}
          >
            {tab}
          </button>
        ))}
      </div>
      <div className="battle-room__console-body">
        {panel[activeTab]}
      </div>
    </div>
  );
}

function ResultCard({ title, success, results, score, error, type = "test" }) {
  if (!results && !error && !title) return null;

  const isAccepted = success || (results && results.every(r => r.passed) && results.length > 0);
  const statusLabel = error ? "Runtime Error" : isAccepted ? "Accepted" : "Wrong Answer";
  const statusTone = error ? "danger" : isAccepted ? "success" : "warning";

  return (
    <div className={`battle-room__result-container battle-room__result-container--${statusTone} animate-in`}>
      <div className="battle-room__result-head">
        <div>
          <span className="battle-room__result-kicker">
            {type === "submit" ? "Submission Result" : "Test Result"}
          </span>
          <h2 className={`battle-room__result-title battle-room__result-title--${statusTone}`}>{statusLabel}</h2>
        </div>
        {score !== undefined && (
          <div className="battle-room__score-block">
            <span>Score Earned</span>
            <strong>{score} pts</strong>
          </div>
        )}
      </div>

      {error && (
        <div className="battle-room__error-log">
          <p>Error Message:</p>
          <pre>{error}</pre>
        </div>
      )}

      {results && results.length > 0 && (
        <div className="battle-room__case-results">
          <div className="battle-room__case-progress">
            <div className="battle-room__case-track">
              {results.map((r, i) => (
                <div 
                  key={i} 
                  className={`battle-room__case-segment ${r.passed || r.status === "passed" ? "battle-room__case-segment--pass" : "battle-room__case-segment--fail"}`}
                  style={{ width: `${100 / results.length}%` }}
                />
              ))}
            </div>
            <span>
              {results.filter(r => r.passed || r.status === "passed").length} / {results.length} Passed
            </span>
          </div>

          <div className="battle-room__case-list">
            {results.map((res, idx) => {
              const isPassed = res.passed === true || res.status === "passed";
              return (
                <div key={idx} className="battle-room__case-card">
                  <div className="battle-room__case-card-head">
                    <span>Test Case {idx + 1}</span>
                    <span className={`battle-room__case-badge ${isPassed ? "battle-room__case-badge--pass" : "battle-room__case-badge--fail"}`}>
                      {isPassed ? "Passed" : "Failed"}
                    </span>
                  </div>
                  {!isPassed && (
                    <div className="battle-room__case-diff">
                      <div>
                        <span>Expected</span>
                        <pre>{res.expected || "N/A"}</pre>
                      </div>
                      <div>
                        <span>Actual</span>
                        <pre>{res.actual || res.error || "N/A"}</pre>
                      </div>
                    </div>
                  )}
                  {isPassed && res.actual && (
                    <pre className="battle-room__case-output">{res.actual}</pre>
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
    let workerFailureTimer = null;

    try {
      // Use standard Worker instantiation for better compatibility with Vite in production
      workerRef.current = new Worker(
        new URL("../utils/pyodideWorker.js", import.meta.url),
        { type: "classic" }
      );
    } catch (err) {
      console.error("Worker initialization failed", err);
      workerFailureTimer = window.setTimeout(() => {
        setError("Failed to initialize Python environment. Please refresh.");
      }, 0);
    }

    return () => {
      if (workerFailureTimer) {
        window.clearTimeout(workerFailureTimer);
      }
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

  const handleResetCode = () => {
    setCode(room?.question?.starter_code || "");
    setRunOutput(null);
    setTestResults(null);
    setSubmissionResult(null);
    setError("");
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
          <div className="battle-room__workspace battle-room__workspace--leetcode">
            <div className="battle-room__left-column">
              <Card className="battle-room__problem-panel battle-room__leetcode-card">
                <QuestionPanel question={room?.question} difficulty={room?.difficulty} />
              </Card>
            </div>

            <div className="battle-room__middle-column">
              <Card className="battle-room__editor-panel battle-room__leetcode-card">
                <div className="battle-room__editor-top battle-room__editor-top--leetcode">
                  <div className="battle-room__editor-heading">
                    <span className="battle-room__panel-tab battle-room__panel-tab--active">Code</span>
                    <span className="battle-room__chip battle-room__chip--ghost">
                      {myPlayer?.status === "submitted" ? "Submitted" : "In progress"}
                    </span>
                  </div>

                  <div className="battle-room__editor-controls">
                    <select
                      value={language}
                      onChange={(event) => setLanguage(event.target.value)}
                      className="battle-room__language-select"
                      aria-label="Language"
                    >
                      <option value="python">Python</option>
                      <option value="javascript">JavaScript</option>
                      <option value="java">Java</option>
                      <option value="cpp">C++</option>
                    </select>
                    <Button
                      onClick={handleResetCode}
                      disabled={!room?.question}
                      size="sm"
                      variant="secondary"
                    >
                      Reset
                    </Button>
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

                <ConsoleTabs
                  runOutput={runOutput}
                  testResults={testResults}
                  submissionResult={submissionResult}
                  question={room?.question}
                />
              </Card>
            </div>

            <div className="battle-room__right-column">
              <Card className="battle-room__dock-card battle-room__leetcode-card">
                <div className="battle-room__dock-header">
                  <div>
                    <p className="label-text">Room</p>
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

              <Card className="battle-room__dock-card battle-room__leetcode-card">
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
