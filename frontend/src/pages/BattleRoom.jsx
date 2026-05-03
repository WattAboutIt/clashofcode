import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";

import api from "../api/axios";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import { useAuth } from "../context/AuthContext";
import socket from "../utils/socket";
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

  return <span className="font-display">{remaining || "--:--"}</span>;
}

function QuestionPanel({ question, difficulty }) {
  if (!question) return null;

  return (
    <div className="room-question">
      <div className="room-question__header">
        <div>
          <p className="label-text">Problem</p>
          <h2>{question.title}</h2>
        </div>
        <div className="room-badge-row">
          <span className="room-badge room-badge--soft">{DIFF_LABELS[difficulty] || difficulty}</span>
          <span className="room-badge room-badge--accent">{question.points} pts</span>
        </div>
      </div>

      <div className="room-question__description">{question.description}</div>

      {question.examples?.length > 0 && (
        <div>
          <p className="label-text">Examples</p>
          <div className="room-example-list">
            {question.examples.map((example, index) => (
              <div key={`${question.id}-${index}`} className="room-example">
                <p><strong>Input:</strong> <span className="font-mono">{example.input}</span></p>
                <p><strong>Output:</strong> <span className="font-mono">{example.output}</span></p>
                {example.explanation && <p className="muted-text">{example.explanation}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {question.constraints && (
        <div>
          <p className="label-text">Constraints</p>
          <p className="muted-text">{question.constraints}</p>
        </div>
      )}
    </div>
  );
}

function CodeEditor({ value, onChange, language = "python" }) {
  const extension = language === "python" ? "py" : language === "javascript" ? "js" : language === "java" ? "java" : "cpp";

  return (
    <div className="room-code-shell">
      <div className="room-code-shell__bar">
        <span className="terminal-dot terminal-dot--rose" />
        <span className="terminal-dot terminal-dot--gold" />
        <span className="terminal-dot terminal-dot--green" />
        <span className="room-code-shell__name">solution.{extension}</span>
        <span className="room-code-shell__status">Editing</span>
      </div>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        spellCheck={false}
        className="room-textarea"
        placeholder={`# Write your ${language} solution here...\n`}
      />
    </div>
  );
}

function PlayerRow({ player, isMe, host }) {
  const isHost = player.username === host;

  return (
    <div className={`room-player ${isMe ? "room-player--me" : ""}`}>
      <div className="room-player__main">
        <div className="room-player__avatar">{player.username.slice(0, 2).toUpperCase()}</div>
        <div className="room-player__meta">
          <p>
            <strong>{player.username}</strong>
            {isHost && <span className="room-player__tag">Host</span>}
            {isMe && <span className="room-player__you">you</span>}
          </p>
          <p className="muted-text">{player.status}</p>
        </div>
      </div>
      <span className="room-player__score">
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
  const previousQuestionId = useRef(null);

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
    if (import.meta.env.VITE_ENABLE_SOCKET !== "true" || !token) return undefined;
    socket.auth = { token };
    socket.connect();
    socket.emit("join_room", { roomCode });
    socket.on("room_updated", (nextRoom) => setRoom(nextRoom));
    return () => {
      socket.off("room_updated");
      socket.disconnect();
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
  };

  if (loading) {
    return (
      <section className="page-shell">
        <div className="page-container room-page">
          <div className="skeleton loading-slab loading-slab--banner" />
          <div className="room-grid">
            <div className="skeleton loading-slab loading-slab--panel" />
            <div className="skeleton loading-slab loading-slab--panel" />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="page-shell page-enter">
      <div className="page-container room-page">
        <Card className="room-banner">
          <div className="room-banner__row">
            <div className="room-banner__meta">
              <div>
                <p className="label-text">Room Code</p>
                <h2 className="font-mono">{roomCode}</h2>
              </div>
              <div>
                <p className="label-text">Host</p>
                <p>{room?.host}</p>
              </div>
            </div>
            <div className="room-badge-row">
              {room?.status === "active" && room?.started_at && (
                <span className="room-badge room-badge--soft">
                  <CountdownTimer startedAt={room.started_at} limitMinutes={room.time_limit_minutes} />
                </span>
              )}
              <span className="room-badge room-badge--accent">{room?.status || "waiting"}</span>
              {room?.difficulty && (
                <span className="room-badge room-badge--soft">{DIFF_LABELS[room.difficulty] || room.difficulty}</span>
              )}
            </div>
          </div>
          {error && <div className="room-error">{error}</div>}
        </Card>

        <div className="room-grid">
          <div className="room-main">
            {room?.status === "waiting" ? (
              <Card className="room-waiting">
                <div className="room-icon-badge" aria-hidden="true">⚔️</div>
                <h2>{isHost ? "You're the host" : "Waiting for host"}</h2>
                <p className="section-subtitle">
                  {isHost
                    ? "When all players are ready, hit Start to begin the battle."
                    : "The host will start the battle soon. Get your fingers ready!"}
                </p>
                {isHost && (
                  <Button onClick={handleStart} disabled={starting} size="lg">
                    {starting ? "Starting..." : "Start Battle"}
                  </Button>
                )}
              </Card>
            ) : (
              <>
                <Card className="room-panel">
                  <QuestionPanel question={room?.question} difficulty={room?.difficulty} />
                </Card>

                <Card className="room-editor-card">
                  <div className="room-editor-card__top">
                    <div>
                      <p className="label-text">Your Solution</p>
                      <h2>Write and submit your code</h2>
                    </div>
                    <div className="room-editor-toolbar">
                      <select
                        value={language}
                        onChange={(event) => setLanguage(event.target.value)}
                        className="room-select"
                      >
                        <option value="python">Python</option>
                        <option value="javascript">JavaScript</option>
                        <option value="java">Java</option>
                        <option value="cpp">C++</option>
                      </select>
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

                  {submissionResult && (
                    <div className={`room-result ${submissionResult.passed ? "room-result--success" : "room-result--pending"}`}>
                      <div>
                        <strong>{submissionResult.passed ? "All tests passed!" : "Submission received"}</strong>
                        <p className="muted-text">
                          Score: {submissionResult.score} pts · {submissionResult.test_results?.length ?? 0} test cases
                        </p>
                      </div>
                    </div>
                  )}
                </Card>
              </>
            )}
          </div>

          <div className="room-sidebar">
            <Card className="room-sidebar-card">
              <p className="label-text">Match Info</p>
              <div className="room-sidebar-card__list">
                {[
                  { label: "Time Limit", value: `${room?.time_limit_minutes ?? 0} min` },
                  { label: "Difficulty", value: DIFF_LABELS[room?.difficulty] || room?.difficulty || "—" },
                  { label: "Points", value: room?.question?.points ?? "—" },
                  { label: "Host", value: room?.host },
                ].map((row) => (
                  <div key={row.label} className="room-info-row">
                    <span className="muted-text">{row.label}</span>
                    <strong>{row.value}</strong>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="room-sidebar-card">
              <div className="dashboard-banner__top">
                <p className="label-text">Participants</p>
                <span className="muted-text">{room?.players?.length ?? 0} coders</span>
              </div>
              <div className="room-player-list">
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
      </div>
    </section>
  );
}

export default BattleRoom;
