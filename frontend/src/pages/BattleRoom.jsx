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
    workerRef.current = new PyodideWorker();
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
    if (!token) return undefined;
    const baseUrl = api.defaults.baseURL || "http://localhost:8000";
    const wsUrl = baseUrl.replace(/^http/, "ws") + `/rooms/${roomCode}/ws`;

    const ws = new WebSocket(wsUrl);

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

    api.post("/rooms/join", { roomCode }).catch(console.error);

    return () => {
      ws.close();
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
      setError(err?.response?.data?.detail || "Unable to start the game right now.");
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
              setError(err?.response?.data?.detail || "Submission failed.");
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
        setError(err?.response?.data?.detail || "Submission failed.");
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

    try {
      const response = await api.post("/execution/run", { code });
      setRunOutput(response.data);
    } catch (err) {
      setError(err?.response?.data?.detail || "Failed to run code.");
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
    setTestResults(null);

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
      setError(err?.response?.data?.detail || "Failed to test code.");
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
                  <div className="battle-room__result battle-room__result--info">
                    <strong>Code Output</strong>
                    {runOutput.output && (
                      <div className="mt-2">
                        <p className="muted-text font-mono text-xs">Output:</p>
                        <pre className="font-mono text-xs mt-1 p-2 bg-[var(--surface-color)] rounded whitespace-pre-wrap">{runOutput.output}</pre>
                      </div>
                    )}
                    {runOutput.error && (
                      <div className="mt-2">
                        <p className="muted-text font-mono text-xs text-red-500">Error:</p>
                        <pre className="font-mono text-xs mt-1 p-2 bg-red-50 dark:bg-red-900/20 rounded whitespace-pre-wrap text-red-700 dark:text-red-300">{runOutput.error}</pre>
                      </div>
                    )}
                  </div>
                )}

                {testResults && (
                  <div className={`battle-room__result ${testResults.success ? "battle-room__result--success" : "battle-room__result--pending"}`}>
                    <strong>{testResults.success ? "All tests passed! ✓" : "Some tests failed"}</strong>
                    <p className="muted-text mt-2">
                      {testResults.passed}/{testResults.total} test cases passed
                    </p>
                    {testResults.results && (
                      <div className="mt-3">
                        {testResults.results.map((result) => (
                          <div
                            key={result.test_case}
                            className={`mt-2 p-2 rounded text-xs font-mono ${
                              result.status === "passed"
                                ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300"
                                : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300"
                            }`}
                          >
                            <div className="font-bold">
                              Test {result.test_case}: {result.status === "passed" ? "✓ PASSED" : "✗ FAILED"}
                            </div>
                            {result.status === "failed" && (
                              <>
                                <div className="mt-1">
                                  <strong>Expected:</strong>
                                  <pre className="whitespace-pre-wrap bg-[var(--surface-color)] p-1 mt-1 rounded">{result.expected}</pre>
                                </div>
                                <div className="mt-1">
                                  <strong>Got:</strong>
                                  <pre className="whitespace-pre-wrap bg-[var(--surface-color)] p-1 mt-1 rounded">{result.actual}</pre>
                                </div>
                                {result.error && (
                                  <div className="mt-1">
                                    <strong>Error:</strong>
                                    <pre className="whitespace-pre-wrap bg-[var(--surface-color)] p-1 mt-1 rounded">{result.error}</pre>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {submissionResult && (
                  <div className={`battle-room__result ${submissionResult.passed ? "battle-room__result--success" : "battle-room__result--pending"}`}>
                    <strong>{submissionResult.passed ? "Accepted in battle" : submissionResult.error ? "Runtime Error" : "Failed some test cases"}</strong>
                    {submissionResult.error ? (
                      <p className="muted-text font-mono text-xs mt-2 p-2 bg-[var(--surface-color)] rounded">{submissionResult.error}</p>
                    ) : (
                      <p className="muted-text">
                        Score: {submissionResult.score} pts · {submissionResult.test_results?.filter(t => t.passed)?.length ?? 0}/{submissionResult.test_results?.length ?? 0} test cases
                      </p>
                    )}
                  </div>
                )}
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
